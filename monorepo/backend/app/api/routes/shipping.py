from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID

from app.db.session import get_db
from app.models.shipping import ShippingZone, ShippingRate, PaymentMethod, Shipment, ShippingCarrier, ShipmentStatus
from app.models.order import Order
from app.schemas.shipping import ShipmentCreate, ShipmentUpdate, ShipmentResponse
from app.core.security import get_current_admin

router = APIRouter(prefix="/shipping", tags=["shipping"])


class ShippingZoneBase(BaseModel):
    name: str
    cities: List[str] = []
    provinces: List[str] = []
    is_active: bool = True


class ShippingZoneCreate(ShippingZoneBase):
    pass


class ShippingZoneUpdate(BaseModel):
    name: Optional[str] = None
    cities: Optional[List[str]] = None
    provinces: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ShippingZoneResponse(ShippingZoneBase):
    id: str

    class Config:
        from_attributes = True


class ShippingRateBase(BaseModel):
    zone_id: str
    min_weight: float = 0
    max_weight: float = 100
    base_cost: float
    cost_per_kg: float = 0
    free_shipping_threshold: Optional[float] = None
    is_active: bool = True


class ShippingRateCreate(ShippingRateBase):
    pass


class ShippingRateUpdate(BaseModel):
    zone_id: Optional[str] = None
    min_weight: Optional[float] = None
    max_weight: Optional[float] = None
    base_cost: Optional[float] = None
    cost_per_kg: Optional[float] = None
    free_shipping_threshold: Optional[float] = None
    is_active: Optional[bool] = None


class ShippingRateResponse(ShippingRateBase):
    id: str

    class Config:
        from_attributes = True


class ShippingCalculateRequest(BaseModel):
    city: str
    province: str
    total_weight: float
    order_total: float


class ShippingCalculateResponse(BaseModel):
    cost: float
    is_free: bool
    zone_name: str
    zone_id: str


# ============ PUBLIC ENDPOINTS ============

@router.get("/zones")
def get_shipping_zones(
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """Get all shipping zones (public)"""
    query = db.query(ShippingZone)
    if is_active:
        query = query.filter(ShippingZone.is_active == True)
    zones = query.all()

    # Convertir manualmente a dict para evitar problemas de serialización
    return [
        {
            "id": str(zone.id),
            "name": zone.name,
            "description": zone.description,
            "provinces": zone.provinces,
            "cities": zone.cities,
            "is_active": zone.is_active,
            "created_at": zone.created_at.isoformat() if zone.created_at else None,
            "updated_at": zone.updated_at.isoformat() if zone.updated_at else None,
        }
        for zone in zones
    ]


@router.get("/rates", response_model=List[ShippingRateResponse])
def get_shipping_rates(
    zone_id: Optional[str] = None,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """Get all shipping rates (public)"""
    query = db.query(ShippingRate)
    if zone_id:
        query = query.filter(ShippingRate.zone_id == zone_id)
    if is_active:
        query = query.filter(ShippingRate.is_active == True)
    return query.all()


@router.post("/calculate", response_model=Optional[ShippingCalculateResponse])
def calculate_shipping(
    data: ShippingCalculateRequest,
    db: Session = Depends(get_db)
):
    """Calculate shipping cost for a given location and weight"""
    # Find matching zone
    zones = db.query(ShippingZone).filter(ShippingZone.is_active == True).all()

    matched_zone = None
    city_lower = data.city.lower().strip()
    province_lower = data.province.lower().strip()

    for zone in zones:
        cities_lower = [c.lower() for c in (zone.cities or [])]
        provinces_lower = [p.lower() for p in (zone.provinces or [])]

        city_match = any(city_lower in c or c in city_lower for c in cities_lower)
        province_match = any(province_lower in p or p in province_lower for p in provinces_lower)

        if city_match and province_match:
            matched_zone = zone
            break

    if not matched_zone:
        return None

    # Find applicable rate
    rate = db.query(ShippingRate).filter(
        ShippingRate.zone_id == matched_zone.id,
        ShippingRate.is_active == True,
        ShippingRate.min_weight <= data.total_weight,
        ShippingRate.max_weight >= data.total_weight
    ).first()

    if not rate:
        return None

    # Check for free shipping
    if rate.free_shipping_threshold and data.order_total >= rate.free_shipping_threshold:
        return ShippingCalculateResponse(
            cost=0,
            is_free=True,
            zone_name=matched_zone.name,
            zone_id=matched_zone.id
        )

    # Calculate cost
    cost = rate.base_cost + (data.total_weight * rate.cost_per_kg)

    return ShippingCalculateResponse(
        cost=round(cost, 2),
        is_free=False,
        zone_name=matched_zone.name,
        zone_id=matched_zone.id
    )


# ============ ADMIN ENDPOINTS ============

@router.post("/zones", response_model=ShippingZoneResponse)
def create_shipping_zone(
    zone: ShippingZoneCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Create a new shipping zone (admin only)"""
    db_zone = ShippingZone(**zone.model_dump())
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone


@router.put("/zones/{zone_id}", response_model=ShippingZoneResponse)
def update_shipping_zone(
    zone_id: str,
    zone: ShippingZoneUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Update a shipping zone (admin only)"""
    db_zone = db.query(ShippingZone).filter(ShippingZone.id == zone_id).first()
    if not db_zone:
        raise HTTPException(status_code=404, detail="Zona no encontrada")

    update_data = zone.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_zone, key, value)

    db.commit()
    db.refresh(db_zone)
    return db_zone


@router.delete("/zones/{zone_id}")
def delete_shipping_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Delete a shipping zone (admin only)"""
    db_zone = db.query(ShippingZone).filter(ShippingZone.id == zone_id).first()
    if not db_zone:
        raise HTTPException(status_code=404, detail="Zona no encontrada")

    db.delete(db_zone)
    db.commit()
    return {"message": "Zona eliminada"}


@router.post("/rates", response_model=ShippingRateResponse)
def create_shipping_rate(
    rate: ShippingRateCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Create a new shipping rate (admin only)"""
    db_rate = ShippingRate(**rate.model_dump())
    db.add(db_rate)
    db.commit()
    db.refresh(db_rate)
    return db_rate


@router.put("/rates/{rate_id}", response_model=ShippingRateResponse)
def update_shipping_rate(
    rate_id: str,
    rate: ShippingRateUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Update a shipping rate (admin only)"""
    db_rate = db.query(ShippingRate).filter(ShippingRate.id == rate_id).first()
    if not db_rate:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")

    update_data = rate.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_rate, key, value)

    db.commit()
    db.refresh(db_rate)
    return db_rate


@router.delete("/rates/{rate_id}")
def delete_shipping_rate(
    rate_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Delete a shipping rate (admin only)"""
    db_rate = db.query(ShippingRate).filter(ShippingRate.id == rate_id).first()
    if not db_rate:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")

    db.delete(db_rate)
    db.commit()
    return {"message": "Tarifa eliminada"}


# ============ PAYMENT METHODS SCHEMAS ============

class PaymentMethodBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    account_details: Optional[dict] = None
    display_order: int = 0
    is_active: bool = True


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    account_details: Optional[dict] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class PaymentMethodResponse(PaymentMethodBase):
    id: UUID

    class Config:
        from_attributes = True


# ============ PAYMENT METHODS ENDPOINTS ============

@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
def get_payment_methods(
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """Get all payment methods (public)"""
    query = db.query(PaymentMethod)
    if is_active:
        query = query.filter(PaymentMethod.is_active == True)
    return query.order_by(PaymentMethod.display_order).all()


@router.get("/payment-methods/{method_id}", response_model=PaymentMethodResponse)
def get_payment_method(method_id: str, db: Session = Depends(get_db)):
    """Get a specific payment method"""
    method = db.query(PaymentMethod).filter(PaymentMethod.id == method_id).first()
    if not method:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")
    return method


@router.post("/payment-methods", response_model=PaymentMethodResponse)
def create_payment_method(
    method: PaymentMethodCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Create a new payment method (admin only)"""
    db_method = PaymentMethod(**method.model_dump())
    db.add(db_method)
    db.commit()
    db.refresh(db_method)
    return db_method


@router.put("/payment-methods/{method_id}", response_model=PaymentMethodResponse)
def update_payment_method(
    method_id: str,
    method: PaymentMethodUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Update a payment method (admin only)"""
    db_method = db.query(PaymentMethod).filter(PaymentMethod.id == method_id).first()
    if not db_method:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")

    update_data = method.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_method, key, value)

    db.commit()
    db.refresh(db_method)
    return db_method


@router.delete("/payment-methods/{method_id}")
def delete_payment_method(
    method_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Delete a payment method (admin only)"""
    db_method = db.query(PaymentMethod).filter(PaymentMethod.id == method_id).first()
    if not db_method:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")

    db.delete(db_method)
    db.commit()
    return {"message": "Método de pago eliminado"}


# ============ SHIPMENT TRACKING ENDPOINTS ============

@router.post("/shipments", response_model=ShipmentResponse)
async def create_shipment(
    shipment_data: ShipmentCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """
    Crea un envío para una orden.
    Puede opcionalmente integrarse con el carrier automáticamente.
    """
    # Verificar que la orden existe
    order = db.query(Order).filter(Order.id == shipment_data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    # Verificar que no haya un envío existente
    existing = db.query(Shipment).filter(Shipment.order_id == order.id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Esta orden ya tiene un envío asociado"
        )

    # Crear el shipment
    shipment = Shipment(
        order_id=order.id,
        carrier=shipment_data.carrier,
        weight=shipment_data.weight,
        length=shipment_data.length,
        width=shipment_data.width,
        height=shipment_data.height,
        notes=shipment_data.notes,
        status=ShipmentStatus.PENDING,
    )

    # Si no es manual, intentar crear en el carrier
    if shipment_data.carrier != ShippingCarrier.MANUAL:
        try:
            from app.services.shipping_service import shipping_service

            order_data = {
                "shipping_postal_code": order.shipping_postal_code,
                "shipping_address": order.shipping_address,
                "shipping_city": order.shipping_city,
                "customer_name": order.customer_name,
                "customer_email": order.customer_email,
                "customer_phone": order.customer_phone,
                "total_amount": order.total_amount,
                "weight": float(shipment_data.weight) if shipment_data.weight else 1,
                "length": float(shipment_data.length) if shipment_data.length else 30,
                "width": float(shipment_data.width) if shipment_data.width else 20,
                "height": float(shipment_data.height) if shipment_data.height else 10,
            }

            result = await shipping_service.create_shipment(
                carrier=shipment_data.carrier.value,
                order_data=order_data
            )

            if result.get("success"):
                shipment.tracking_number = result.get("tracking_number")
                shipment.label_url = result.get("label_url")
                shipment.shipping_cost = result.get("cost", 0)
                shipment.status = ShipmentStatus.LABEL_CREATED
                shipment.carrier_data = result
        except Exception as e:
            print(f"Error creando envío automático: {str(e)}")
            # Continuar con envío manual

    db.add(shipment)
    db.commit()
    db.refresh(shipment)

    return shipment


@router.get("/shipments", response_model=List[ShipmentResponse])
def get_shipments(
    status: Optional[ShipmentStatus] = None,
    carrier: Optional[ShippingCarrier] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar envíos (admin)"""
    query = db.query(Shipment)

    if status:
        query = query.filter(Shipment.status == status)

    if carrier:
        query = query.filter(Shipment.carrier == carrier)

    return query.order_by(Shipment.created_at.desc()).all()


@router.get("/shipments/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(
    shipment_id: UUID,
    db: Session = Depends(get_db)
):
    """Obtener información de un envío (público con order_id)"""
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Envío no encontrado")

    return shipment


@router.get("/shipments/order/{order_id}", response_model=ShipmentResponse)
def get_shipment_by_order(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """Obtener envío por order_id (público)"""
    shipment = db.query(Shipment).filter(Shipment.order_id == order_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Envío no encontrado para esta orden")

    return shipment


@router.put("/shipments/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(
    shipment_id: UUID,
    shipment_update: ShipmentUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar información de un envío"""
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Envío no encontrado")

    update_data = shipment_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(shipment, key, value)

    db.commit()
    db.refresh(shipment)

    return shipment


@router.post("/shipments/{shipment_id}/refresh-tracking")
async def refresh_tracking(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar el tracking de un envío desde el carrier"""
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Envío no encontrado")

    if not shipment.tracking_number:
        raise HTTPException(
            status_code=400,
            detail="Este envío no tiene número de tracking"
        )

    if shipment.carrier == ShippingCarrier.MANUAL:
        raise HTTPException(
            status_code=400,
            detail="Los envíos manuales no tienen tracking automático"
        )

    try:
        from app.services.shipping_service import shipping_service

        result = await shipping_service.get_tracking(
            carrier=shipment.carrier.value,
            tracking_number=shipment.tracking_number
        )

        if result.get("success"):
            shipment.tracking_events = result.get("events", [])

            # Actualizar estado basado en el último evento
            current_status = result.get("current_status")
            if current_status:
                # Mapear estados del carrier a nuestros estados
                # Esta lógica depende del carrier
                shipment.carrier_data = result

            db.commit()
            db.refresh(shipment)

            return {
                "success": True,
                "shipment": shipment,
                "tracking": result
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error obteniendo tracking: {result.get('error')}"
            )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error actualizando tracking: {str(e)}"
        )


@router.get("/tracking/{tracking_number}")
async def public_tracking(tracking_number: str, db: Session = Depends(get_db)):
    """
    Endpoint público para tracking por número.
    El cliente puede buscar su envío con el número de tracking.
    """
    shipment = db.query(Shipment).filter(
        Shipment.tracking_number == tracking_number
    ).first()

    if not shipment:
        raise HTTPException(
            status_code=404,
            detail="Número de tracking no encontrado"
        )

    # Intentar actualizar el tracking
    if shipment.carrier != ShippingCarrier.MANUAL:
        try:
            from app.services.shipping_service import shipping_service

            result = await shipping_service.get_tracking(
                carrier=shipment.carrier.value,
                tracking_number=tracking_number
            )

            if result.get("success"):
                shipment.tracking_events = result.get("events", [])
                db.commit()
        except Exception as e:
            print(f"Error obteniendo tracking: {str(e)}")

    # Obtener información de la orden
    order = db.query(Order).filter(Order.id == shipment.order_id).first()

    return {
        "tracking_number": shipment.tracking_number,
        "carrier": shipment.carrier,
        "status": shipment.status,
        "estimated_delivery": shipment.estimated_delivery_date,
        "events": shipment.tracking_events or [],
        "order": {
            "id": str(order.id),
            "status": order.status,
            "customer_name": order.customer_name,
        } if order else None,
    }


# ============ PAQ.AR SPECIFIC ENDPOINTS ============

class PaqArAgenciesRequest(BaseModel):
    postal_code: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None


@router.get("/paqar/agencies")
async def get_paqar_agencies(
    postal_code: Optional[str] = None,
    province: Optional[str] = None,
    city: Optional[str] = None
):
    """
    Obtiene lista de sucursales de Correo Argentino (PAQ.AR)
    Endpoint público para que los clientes puedan buscar sucursales cercanas
    """
    try:
        from app.services.paqar_service import paqar_service

        result = await paqar_service.get_agencies(
            postal_code=postal_code,
            province=province,
            city=city
        )

        if result.get("success"):
            return {
                "success": True,
                "agencies": result["agencies"],
                "total": result["total"]
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error obteniendo agencias: {result.get('error')}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )


@router.post("/paqar/shipments/{shipment_id}/label")
async def get_paqar_label(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """
    Obtiene la etiqueta de envío de PAQ.AR en formato PDF (base64)
    Solo disponible para envíos de Correo Argentino
    """
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Envío no encontrado")

    if shipment.carrier != ShippingCarrier.CORREO_ARGENTINO:
        raise HTTPException(
            status_code=400,
            detail="Este endpoint solo funciona con envíos de Correo Argentino"
        )

    if not shipment.tracking_number:
        raise HTTPException(
            status_code=400,
            detail="Este envío no tiene número de tracking"
        )

    try:
        from app.services.paqar_service import paqar_service

        result = await paqar_service.get_label([shipment.tracking_number])

        if result.get("success"):
            return {
                "success": True,
                "pdf_base64": result["pdf_base64"],
                "tracking_number": shipment.tracking_number
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error obteniendo etiqueta: {result.get('error')}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )


@router.post("/paqar/shipments/{shipment_id}/cancel")
async def cancel_paqar_shipment(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """
    Cancela un envío de PAQ.AR (Correo Argentino)
    """
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Envío no encontrado")

    if shipment.carrier != ShippingCarrier.CORREO_ARGENTINO:
        raise HTTPException(
            status_code=400,
            detail="Este endpoint solo funciona con envíos de Correo Argentino"
        )

    if not shipment.tracking_number:
        raise HTTPException(
            status_code=400,
            detail="Este envío no tiene número de tracking"
        )

    try:
        from app.services.paqar_service import paqar_service

        result = await paqar_service.cancel_order(shipment.tracking_number)

        if result.get("success"):
            # Actualizar estado del shipment
            shipment.status = ShipmentStatus.RETURNED
            shipment.notes = (shipment.notes or "") + "\nCancelado por PAQ.AR"
            db.commit()

            return {
                "success": True,
                "message": "Envío cancelado exitosamente",
                "tracking_number": shipment.tracking_number
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error cancelando envío: {result.get('error')}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )
