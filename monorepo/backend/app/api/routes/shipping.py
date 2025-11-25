from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.models.shipping import ShippingZone, ShippingRate
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

@router.get("/zones", response_model=List[ShippingZoneResponse])
def get_shipping_zones(
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """Get all shipping zones (public)"""
    query = db.query(ShippingZone)
    if is_active:
        query = query.filter(ShippingZone.is_active == True)
    return query.all()


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
