from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import json

from app.db.session import get_db
from app.models.order import Order, OrderStatus
from app.core.config import settings

router = APIRouter(prefix="/payments", tags=["payments"])


# ============ SCHEMAS ============

class PaymentItem(BaseModel):
    title: str
    quantity: int
    unit_price: float
    currency_id: str = "ARS"


class PayerInfo(BaseModel):
    name: str
    surname: str = ""
    email: str
    phone_area_code: str = ""
    phone_number: str = ""
    street_name: str = ""
    street_number: str = ""
    zip_code: str = ""


class CreatePreferenceRequest(BaseModel):
    order_id: str
    items: List[PaymentItem]
    payer: Optional[PayerInfo] = None


class CreatePreferenceResponse(BaseModel):
    preference_id: str
    init_point: str  # URL para checkout
    sandbox_init_point: str  # URL para sandbox


class PaymentStatusResponse(BaseModel):
    payment_id: str
    status: str
    status_detail: str
    external_reference: Optional[str]
    total_amount: float
    date_approved: Optional[datetime]


class MercadoPagoConfig(BaseModel):
    public_key: str


# ============ ENDPOINTS ============

@router.get("/config", response_model=MercadoPagoConfig)
def get_mercadopago_config():
    """Obtiene la configuración pública de MercadoPago para el frontend"""
    if not settings.MERCADOPAGO_PUBLIC_KEY:
        raise HTTPException(
            status_code=500,
            detail="MercadoPago no está configurado. Configura MERCADOPAGO_PUBLIC_KEY en el .env"
        )
    return MercadoPagoConfig(public_key=settings.MERCADOPAGO_PUBLIC_KEY)


@router.post("/preference", response_model=CreatePreferenceResponse)
def create_payment_preference(
    request: CreatePreferenceRequest,
    db: Session = Depends(get_db)
):
    """
    Crea una preferencia de pago en MercadoPago.
    Usar el init_point retornado para redirigir al usuario al checkout.
    """
    if not settings.MERCADOPAGO_ACCESS_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="MercadoPago no está configurado. Configura MERCADOPAGO_ACCESS_TOKEN en el .env"
        )

    # Verificar que la orden existe
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    # Importar aquí para evitar error si no está configurado
    from app.services.mercadopago_service import MercadoPagoService

    mp_service = MercadoPagoService()

    try:
        items = [item.model_dump() for item in request.items]
        payer = request.payer.model_dump() if request.payer else None

        preference = mp_service.create_preference(
            items=items,
            payer=payer,
            external_reference=str(order.id),
            back_urls={
                "success": f"{settings.MERCADOPAGO_SUCCESS_URL}?order_id={order.id}",
                "failure": f"{settings.MERCADOPAGO_FAILURE_URL}?order_id={order.id}",
                "pending": f"{settings.MERCADOPAGO_PENDING_URL}?order_id={order.id}",
            }
        )

        # Guardar preference_id en la orden
        order.payment_preference_id = preference["id"]
        db.commit()

        return CreatePreferenceResponse(
            preference_id=preference["id"],
            init_point=preference["init_point"],
            sandbox_init_point=preference.get("sandbox_init_point", preference["init_point"])
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear preferencia: {str(e)}")


@router.post("/webhook")
async def mercadopago_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Webhook para recibir notificaciones de MercadoPago.
    Configurar esta URL en el panel de MercadoPago.
    """
    try:
        # Obtener datos del webhook
        body = await request.json()

        # Log del webhook recibido
        print(f"[MercadoPago Webhook] Recibido: {json.dumps(body, indent=2)}")

        topic = body.get("type") or body.get("topic")
        data = body.get("data", {})

        if topic == "payment":
            payment_id = data.get("id")
            if payment_id:
                background_tasks.add_task(
                    process_payment_notification,
                    payment_id=str(payment_id),
                    db=db
                )

        return {"status": "ok"}

    except Exception as e:
        print(f"[MercadoPago Webhook] Error: {str(e)}")
        # Siempre retornar 200 para que MP no reintente
        return {"status": "error", "message": str(e)}


@router.get("/status/{payment_id}", response_model=PaymentStatusResponse)
def get_payment_status(
    payment_id: str,
    db: Session = Depends(get_db)
):
    """Obtiene el estado de un pago por su ID de MercadoPago"""
    if not settings.MERCADOPAGO_ACCESS_TOKEN:
        raise HTTPException(status_code=500, detail="MercadoPago no está configurado")

    from app.services.mercadopago_service import MercadoPagoService

    mp_service = MercadoPagoService()

    try:
        payment = mp_service.get_payment(payment_id)

        return PaymentStatusResponse(
            payment_id=str(payment["id"]),
            status=payment["status"],
            status_detail=payment.get("status_detail", ""),
            external_reference=payment.get("external_reference"),
            total_amount=payment.get("transaction_amount", 0),
            date_approved=payment.get("date_approved")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener pago: {str(e)}")


@router.get("/order/{order_id}/payment-status")
def get_order_payment_status(
    order_id: str,
    db: Session = Depends(get_db)
):
    """Obtiene el estado de pago de una orden"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    return {
        "order_id": str(order.id),
        "payment_status": order.payment_status,
        "payment_id": order.payment_id,
        "payment_preference_id": order.payment_preference_id,
        "paid_at": order.paid_at,
    }


# ============ BACKGROUND TASKS ============

def process_payment_notification(payment_id: str, db: Session):
    """Procesa una notificación de pago en background"""
    try:
        from app.services.mercadopago_service import MercadoPagoService
        from app.services.sync_service import SyncService

        mp_service = MercadoPagoService()
        payment = mp_service.get_payment(payment_id)

        external_reference = payment.get("external_reference")
        if not external_reference:
            print(f"[Payment] Sin external_reference para payment {payment_id}")
            return

        # Buscar la orden
        order = db.query(Order).filter(Order.id == external_reference).first()
        if not order:
            print(f"[Payment] Orden no encontrada: {external_reference}")
            return

        # Actualizar estado según el pago
        payment_status = payment.get("status")
        order.payment_id = str(payment["id"])
        order.payment_status = payment_status

        if payment_status == "approved":
            order.status = OrderStatus.PAID
            order.paid_at = datetime.utcnow()
            print(f"[Payment] Orden {order.id} marcada como PAGADA")

            # ===== SINCRONIZACIÓN CON SISTEMA DE GESTIÓN =====
            # Descontar stock y crear movimiento financiero
            sync_service = SyncService(db)
            sync_result = sync_service.process_order_payment(order)

            if sync_result.get("stock_updated"):
                print(f"[Sync] Stock actualizado para orden {order.id}")
                for p in sync_result.get("products_updated", []):
                    print(f"  - Producto {p['product_id']}: -{p['quantity']} unidades")

            if sync_result.get("movement_created"):
                print(f"[Sync] Movimiento financiero creado: {sync_result.get('movement_id')}")

            if sync_result.get("errors"):
                for error in sync_result["errors"]:
                    print(f"[Sync] Error: {error}")

        elif payment_status == "rejected":
            order.status = OrderStatus.PAYMENT_FAILED
            print(f"[Payment] Orden {order.id} - Pago rechazado")

        elif payment_status == "pending":
            order.status = OrderStatus.PENDING_PAYMENT
            print(f"[Payment] Orden {order.id} - Pago pendiente")

        db.commit()

    except Exception as e:
        print(f"[Payment] Error procesando notificación: {str(e)}")
        db.rollback()
