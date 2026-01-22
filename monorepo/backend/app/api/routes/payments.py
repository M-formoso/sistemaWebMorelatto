from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from decimal import Decimal
import json

from app.db.session import get_db
from app.models.order import Order, OrderStatus, PaymentStatus
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


class StripeConfig(BaseModel):
    publishable_key: str


class CreateStripePaymentRequest(BaseModel):
    order_id: UUID
    payment_method_type: str = "card"  # card, transfer


class StripePaymentResponse(BaseModel):
    payment_intent_id: str
    client_secret: str
    amount: Decimal
    currency: str


class BankTransferRequest(BaseModel):
    order_id: UUID


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

        # No pasar back_urls personalizadas, usar las del .env
        # El order_id se recuperará del external_reference en el webhook
        preference = mp_service.create_preference(
            items=items,
            payer=payer,
            external_reference=str(order.id),
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


# ============ STRIPE ENDPOINTS ============

@router.get("/stripe/config", response_model=StripeConfig)
def get_stripe_config():
    """Obtiene la configuración pública de Stripe para el frontend"""
    if not settings.STRIPE_PUBLISHABLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Stripe no está configurado. Configura STRIPE_PUBLISHABLE_KEY en el .env"
        )
    return StripeConfig(publishable_key=settings.STRIPE_PUBLISHABLE_KEY)


@router.post("/stripe/create-payment-intent", response_model=StripePaymentResponse)
def create_stripe_payment_intent(
    request: CreateStripePaymentRequest,
    db: Session = Depends(get_db)
):
    """
    Crea un PaymentIntent en Stripe para una orden.
    Retorna el client_secret para completar el pago en el frontend.
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="Stripe no está configurado. Configura STRIPE_SECRET_KEY en el .env"
        )

    # Verificar que la orden existe
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    from app.services.stripe_service import stripe_service

    try:
        payment_intent = stripe_service.create_payment_intent(
            amount=order.total_amount,
            currency="ars",
            customer_email=order.customer_email,
            customer_name=order.customer_name,
            metadata={
                "order_id": str(order.id),
                "customer_email": order.customer_email,
            },
            payment_method_types=["card"] if request.payment_method_type == "card" else None
        )

        # Guardar payment_intent_id en la orden
        order.stripe_payment_intent_id = payment_intent["id"]
        order.stripe_customer_id = payment_intent.get("customer_id")
        order.payment_gateway = "stripe"
        order.payment_method = request.payment_method_type
        db.commit()

        return StripePaymentResponse(
            payment_intent_id=payment_intent["id"],
            client_secret=payment_intent["client_secret"],
            amount=payment_intent["amount"],
            currency=payment_intent["currency"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear PaymentIntent: {str(e)}")


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Webhook para recibir notificaciones de Stripe.
    Configurar esta URL en el panel de Stripe.
    """
    try:
        payload = await request.body()
        signature = request.headers.get("stripe-signature")

        if not signature:
            raise HTTPException(status_code=400, detail="Missing stripe-signature header")

        from app.services.stripe_service import stripe_service

        event = stripe_service.process_webhook(payload, signature)

        print(f"[Stripe Webhook] Recibido: {event['type']}")

        # Procesar según el tipo de evento
        if event["type"] == "payment_intent.succeeded":
            payment_intent = event["data"]
            background_tasks.add_task(
                process_stripe_payment_success,
                payment_intent_id=payment_intent["id"],
                db=db
            )
        elif event["type"] == "payment_intent.payment_failed":
            payment_intent = event["data"]
            background_tasks.add_task(
                process_stripe_payment_failed,
                payment_intent_id=payment_intent["id"],
                db=db
            )

        return {"status": "ok"}

    except Exception as e:
        print(f"[Stripe Webhook] Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


def process_stripe_payment_success(payment_intent_id: str, db: Session):
    """Procesa un pago exitoso de Stripe"""
    try:
        from app.services.sync_service import SyncService

        # Buscar la orden por payment_intent_id
        order = db.query(Order).filter(
            Order.stripe_payment_intent_id == payment_intent_id
        ).first()

        if not order:
            print(f"[Stripe] Orden no encontrada para PaymentIntent {payment_intent_id}")
            return

        # Actualizar estado de la orden
        order.payment_status = PaymentStatus.APPROVED
        order.status = OrderStatus.PAID
        order.paid_at = datetime.utcnow()
        print(f"[Stripe] Orden {order.id} marcada como PAGADA")

        # Sincronizar con sistema de gestión
        sync_service = SyncService(db)
        sync_result = sync_service.process_order_payment(order)

        if sync_result.get("stock_updated"):
            print(f"[Sync] Stock actualizado para orden {order.id}")

        if sync_result.get("movement_created"):
            print(f"[Sync] Movimiento financiero creado")

        db.commit()

    except Exception as e:
        print(f"[Stripe] Error procesando pago exitoso: {str(e)}")
        db.rollback()


def process_stripe_payment_failed(payment_intent_id: str, db: Session):
    """Procesa un pago fallido de Stripe"""
    try:
        order = db.query(Order).filter(
            Order.stripe_payment_intent_id == payment_intent_id
        ).first()

        if not order:
            return

        order.payment_status = PaymentStatus.FAILED
        order.status = OrderStatus.PAYMENT_FAILED
        db.commit()

        print(f"[Stripe] Orden {order.id} - Pago fallido")

    except Exception as e:
        print(f"[Stripe] Error procesando pago fallido: {str(e)}")
        db.rollback()


# ============ TRANSFERENCIA BANCARIA ============

@router.post("/bank-transfer/initiate")
def initiate_bank_transfer(
    request: BankTransferRequest,
    db: Session = Depends(get_db)
):
    """
    Inicia un proceso de pago por transferencia bancaria.
    Retorna los datos bancarios para que el cliente realice la transferencia.
    """
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    # Actualizar método de pago
    order.payment_method = "bank_transfer"
    order.payment_status = PaymentStatus.PENDING
    order.status = OrderStatus.PENDING_PAYMENT
    db.commit()

    # Retornar datos bancarios (configurar en settings)
    return {
        "order_id": str(order.id),
        "amount": float(order.total_amount),
        "bank_details": {
            "bank_name": "Banco Ejemplo",
            "account_holder": "Morelatto Lanas",
            "cbu": "0000003100010000000001",
            "alias": "MORELATTO.LANAS",
            "account_number": "1000-0000-01",
            "reference": f"Pedido {str(order.id)[:8]}"
        },
        "instructions": "Realiza la transferencia con el monto exacto y envía el comprobante usando el endpoint /payments/bank-transfer/upload-proof"
    }


@router.post("/bank-transfer/upload-proof")
async def upload_transfer_proof(
    order_id: UUID,
    proof_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Permite al cliente subir el comprobante de transferencia.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    if order.payment_method != "bank_transfer":
        raise HTTPException(
            status_code=400,
            detail="Esta orden no usa transferencia bancaria"
        )

    # Guardar el archivo
    from pathlib import Path
    upload_dir = Path("uploads") / "transfer_proofs"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / f"{order.id}_{proof_file.filename}"

    with open(file_path, "wb") as f:
        content = await proof_file.read()
        f.write(content)

    # Actualizar orden con URL del comprobante
    order.transfer_proof_url = f"/uploads/transfer_proofs/{order.id}_{proof_file.filename}"
    order.payment_status = PaymentStatus.PENDING  # Esperando verificación manual
    db.commit()

    return {
        "message": "Comprobante subido exitosamente. Tu pago será verificado pronto.",
        "order_id": str(order.id),
        "proof_url": order.transfer_proof_url
    }


@router.post("/bank-transfer/verify/{order_id}")
def verify_bank_transfer(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Endpoint de administrador para verificar una transferencia bancaria.
    """
    from app.core.security import get_current_admin
    # TODO: Agregar dependencia de admin: _: dict = Depends(get_current_admin)

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    if order.payment_method != "bank_transfer":
        raise HTTPException(
            status_code=400,
            detail="Esta orden no usa transferencia bancaria"
        )

    # Marcar como verificada y pagada
    from app.services.sync_service import SyncService

    order.payment_status = PaymentStatus.APPROVED
    order.status = OrderStatus.PAID
    order.paid_at = datetime.utcnow()
    order.transfer_verified_at = datetime.utcnow()

    # Sincronizar con sistema de gestión
    sync_service = SyncService(db)
    sync_result = sync_service.process_order_payment(order)

    db.commit()

    return {
        "message": "Transferencia verificada y pago confirmado",
        "order_id": str(order.id),
        "sync_result": sync_result
    }
