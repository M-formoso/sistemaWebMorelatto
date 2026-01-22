from pydantic import BaseModel, field_serializer, model_validator, ConfigDict
from typing import Optional, List, Dict, Any, Union
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from app.models.shipping import ShippingCarrier, ShipmentStatus


# ============ SHIPPING ZONES ============

class ShippingZoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    provinces: List[str] = []
    cities: List[str] = []
    is_active: bool = True


class ShippingZoneCreate(ShippingZoneBase):
    pass


class ShippingZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    provinces: Optional[List[str]] = None
    cities: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ShippingZoneResponse(ShippingZoneBase):
    id: Union[str, UUID]
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id')
    def serialize_id(self, value: Union[str, UUID], _info) -> str:
        return str(value) if isinstance(value, UUID) else value


# ============ SHIPPING RATES ============

class ShippingRateBase(BaseModel):
    zone_id: UUID
    min_weight: Decimal = Decimal("0")
    max_weight: Decimal = Decimal("999")
    base_cost: Decimal = Decimal("0")
    cost_per_kg: Decimal = Decimal("0")
    free_shipping_threshold: Optional[Decimal] = None
    is_active: bool = True


class ShippingRateCreate(ShippingRateBase):
    pass


class ShippingRateUpdate(BaseModel):
    zone_id: Optional[UUID] = None
    min_weight: Optional[Decimal] = None
    max_weight: Optional[Decimal] = None
    base_cost: Optional[Decimal] = None
    cost_per_kg: Optional[Decimal] = None
    free_shipping_threshold: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ShippingRateResponse(ShippingRateBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer('id', 'zone_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


# ============ PAYMENT METHODS ============

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
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


# ============ SHIPMENTS ============

class ShipmentBase(BaseModel):
    carrier: ShippingCarrier
    weight: Optional[Decimal] = None
    length: Optional[Decimal] = None
    width: Optional[Decimal] = None
    height: Optional[Decimal] = None
    notes: Optional[str] = None


class ShipmentCreate(ShipmentBase):
    order_id: UUID


class ShipmentUpdate(BaseModel):
    tracking_number: Optional[str] = None
    status: Optional[ShipmentStatus] = None
    estimated_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    label_url: Optional[str] = None
    notes: Optional[str] = None


class ShipmentResponse(ShipmentBase):
    id: UUID
    order_id: UUID
    tracking_number: Optional[str] = None
    label_url: Optional[str] = None
    status: ShipmentStatus
    estimated_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    shipping_cost: Decimal
    insurance_cost: Decimal
    carrier_data: Optional[Dict[str, Any]] = None
    tracking_events: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer('id', 'order_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True
