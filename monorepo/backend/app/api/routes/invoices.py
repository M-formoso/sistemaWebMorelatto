from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.models.order import Order
from app.models.sale import Sale
from app.core.security import get_current_admin
from app.core.config import settings

router = APIRouter(prefix="/invoices", tags=["invoices"])


# ============ SCHEMAS ============

class CreateInvoiceRequest(BaseModel):
    """Request para crear una factura"""
    total: float
    tipo_doc: int = 99  # 99=Cons.Final, 96=DNI, 80=CUIT
    nro_doc: str = "0"
    concepto: int = 1   # 1=Productos, 2=Servicios, 3=Ambos


class InvoiceFromOrderRequest(BaseModel):
    """Request para facturar una orden del ecommerce"""
    order_id: str
    tipo_doc: int = 99
    nro_doc: str = "0"


class InvoiceFromSaleRequest(BaseModel):
    """Request para facturar una venta del sistema"""
    sale_id: str
    tipo_doc: int = 99
    nro_doc: str = "0"


class InvoiceResponse(BaseModel):
    """Response de una factura emitida"""
    success: bool
    cae: str
    cae_vencimiento: str
    numero_completo: str
    punto_venta: int
    tipo_comprobante: int
    total: float
    fecha_emision: str
    cuit_emisor: str


class AFIPStatusResponse(BaseModel):
    """Estado de los servidores de AFIP"""
    app_server: str
    db_server: str
    auth_server: str
    configured: bool


class LastInvoiceResponse(BaseModel):
    """Último número de comprobante"""
    ultimo_numero: int
    punto_venta: int
    tipo_comprobante: int


# ============ ENDPOINTS ============

@router.get("/config")
def get_afip_config():
    """Verifica si AFIP está configurado"""
    is_configured = bool(
        settings.AFIP_CUIT and
        settings.AFIP_CERT_PATH and
        settings.AFIP_KEY_PATH
    )

    return {
        "configured": is_configured,
        "cuit": settings.AFIP_CUIT[:4] + "****" + settings.AFIP_CUIT[-2:] if settings.AFIP_CUIT else None,
        "punto_venta": settings.AFIP_PUNTO_VENTA,
        "production": settings.AFIP_PRODUCTION,
        "environment": "Producción" if settings.AFIP_PRODUCTION else "Homologación (Testing)"
    }


@router.get("/status", response_model=AFIPStatusResponse)
def check_afip_status(
    _: dict = Depends(get_current_admin)
):
    """Verifica el estado de los servidores de AFIP (requiere admin)"""
    if not settings.AFIP_CUIT:
        return AFIPStatusResponse(
            app_server="N/A",
            db_server="N/A",
            auth_server="N/A",
            configured=False
        )

    try:
        from app.services.afip_service import AFIPService
        afip = AFIPService()
        status = afip.check_server_status()

        return AFIPStatusResponse(
            app_server=status.get("app_server", "N/A"),
            db_server=status.get("db_server", "N/A"),
            auth_server=status.get("auth_server", "N/A"),
            configured=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al verificar AFIP: {str(e)}")


@router.get("/last-number", response_model=LastInvoiceResponse)
def get_last_invoice_number(
    tipo_cbte: int = 11,
    _: dict = Depends(get_current_admin)
):
    """Obtiene el último número de comprobante autorizado"""
    if not settings.AFIP_CUIT:
        raise HTTPException(status_code=500, detail="AFIP no está configurado")

    try:
        from app.services.afip_service import AFIPService
        afip = AFIPService()
        ultimo = afip.get_last_invoice_number(tipo_cbte)

        return LastInvoiceResponse(
            ultimo_numero=ultimo,
            punto_venta=settings.AFIP_PUNTO_VENTA,
            tipo_comprobante=tipo_cbte
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/create", response_model=InvoiceResponse)
def create_invoice(
    request: CreateInvoiceRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crea una Factura C manualmente (requiere admin)"""
    if not settings.AFIP_CUIT:
        raise HTTPException(status_code=500, detail="AFIP no está configurado")

    try:
        from app.services.afip_service import AFIPService
        afip = AFIPService()

        result = afip.create_factura_c(
            total=request.total,
            tipo_doc=request.tipo_doc,
            nro_doc=request.nro_doc,
            concepto=request.concepto
        )

        return InvoiceResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al emitir factura: {str(e)}")


@router.post("/order/{order_id}", response_model=InvoiceResponse)
def invoice_order(
    order_id: str,
    request: Optional[InvoiceFromOrderRequest] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Emite factura para una orden del ecommerce"""
    if not settings.AFIP_CUIT:
        raise HTTPException(status_code=500, detail="AFIP no está configurado")

    # Buscar la orden
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    if order.invoice_cae:
        raise HTTPException(
            status_code=400,
            detail=f"La orden ya está facturada: {order.invoice_number}"
        )

    try:
        from app.services.afip_service import AFIPService
        afip = AFIPService()

        tipo_doc = request.tipo_doc if request else 99
        nro_doc = request.nro_doc if request else "0"

        result = afip.create_factura_c(
            total=float(order.total_amount),
            tipo_doc=tipo_doc,
            nro_doc=nro_doc,
            concepto=1  # Productos
        )

        # Actualizar orden con datos de factura
        order.invoice_type = "C"
        order.invoice_number = result["numero_completo"]
        order.invoice_cae = result["cae"]
        order.invoice_cae_expiration = datetime.strptime(
            result["cae_vencimiento"], "%Y%m%d"
        )
        order.invoiced_at = datetime.utcnow()

        db.commit()

        return InvoiceResponse(**result)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al emitir factura: {str(e)}")


@router.post("/sale/{sale_id}", response_model=InvoiceResponse)
def invoice_sale(
    sale_id: str,
    request: Optional[InvoiceFromSaleRequest] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Emite factura para una venta presencial del sistema"""
    if not settings.AFIP_CUIT:
        raise HTTPException(status_code=500, detail="AFIP no está configurado")

    # Buscar la venta
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if sale.invoice_cae:
        raise HTTPException(
            status_code=400,
            detail=f"La venta ya está facturada: {sale.invoice_number}"
        )

    try:
        from app.services.afip_service import AFIPService
        afip = AFIPService()

        tipo_doc = request.tipo_doc if request else 99
        nro_doc = request.nro_doc if request else "0"

        result = afip.create_factura_c(
            total=float(sale.total),
            tipo_doc=tipo_doc,
            nro_doc=nro_doc,
            concepto=1  # Productos
        )

        # Actualizar venta con datos de factura
        sale.invoice_type = "C"
        sale.invoice_number = result["numero_completo"]
        sale.invoice_cae = result["cae"]
        sale.invoice_cae_expiration = datetime.strptime(
            result["cae_vencimiento"], "%Y%m%d"
        )
        sale.invoiced_at = datetime.utcnow()

        db.commit()

        return InvoiceResponse(**result)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al emitir factura: {str(e)}")


@router.get("/order/{order_id}/info")
def get_order_invoice_info(
    order_id: str,
    db: Session = Depends(get_db)
):
    """Obtiene información de factura de una orden"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    return {
        "order_id": str(order.id),
        "invoiced": bool(order.invoice_cae),
        "invoice_type": order.invoice_type,
        "invoice_number": order.invoice_number,
        "invoice_cae": order.invoice_cae,
        "invoice_cae_expiration": order.invoice_cae_expiration,
        "invoiced_at": order.invoiced_at,
        "total_amount": float(order.total_amount) if order.total_amount else 0
    }
