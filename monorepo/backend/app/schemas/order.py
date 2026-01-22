from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from app.models.order import OrderStatus, PaymentStatus
from app.models.shipping import ShipmentStatus, ShippingCarrier


class OrderItemBase(BaseModel):
    product_id: UUID
    variant_id: Optional[UUID] = None
    quantity: int = 1


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemResponse(OrderItemBase):
    id: UUID
    unit_price: Decimal
    total_price: Decimal

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    shipping_address: str
    shipping_city: str
    shipping_postal_code: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class OrderCreate(OrderBase):
    items: List[OrderItemCreate]


class ShipmentInfo(BaseModel):
    """Información de envío asociada a la orden"""
    tracking_number: Optional[str] = None
    carrier: Optional[ShippingCarrier] = None
    status: Optional[ShipmentStatus] = None
    estimated_delivery_date: Optional[datetime] = None
    label_url: Optional[str] = None

    class Config:
        from_attributes = True


class PaymentInfo(BaseModel):
    """Información de pago de la orden"""
    payment_method: Optional[str] = None
    payment_gateway: Optional[str] = None
    mp_preference_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    transfer_proof_url: Optional[str] = None
    paid_at: Optional[datetime] = None


class OrderResponse(OrderBase):
    id: UUID
    user_id: Optional[UUID]
    session_id: Optional[str]
    status: OrderStatus
    payment_status: PaymentStatus
    payment_gateway: Optional[str] = None
    shipping_cost: Decimal
    total_amount: Decimal
    items: List[OrderItemResponse]
    created_at: datetime
    payment_info: Optional[PaymentInfo] = None
    shipment_info: Optional[ShipmentInfo] = None

    @field_serializer('id', 'user_id')
    def serialize_uuid(self, value: Optional[UUID]) -> Optional[str]:
        return str(value) if value else None

    class Config:
        from_attributes = True


class CartItemBase(BaseModel):
    product_id: UUID
    variant_id: Optional[UUID] = None
    quantity: int = 1


class CartItemCreate(CartItemBase):
    pass


class CartProductInfo(BaseModel):
    """Información simplificada del producto para el carrito"""
    id: UUID
    name: str
    price: Decimal
    image_url: Optional[str] = None
    stock: int
    weight: Optional[Decimal] = None
    color: Optional[str] = None  # Campo de variante/color del producto

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


class CartVariantInfo(BaseModel):
    """Información de la variante para el carrito"""
    id: UUID
    color_name: str
    color_code: str
    image_url: Optional[str] = None
    stock: int

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


class CartItemResponse(CartItemBase):
    id: UUID
    created_at: datetime
    product: CartProductInfo
    variant: Optional[CartVariantInfo] = None

    @field_serializer('id', 'product_id', 'variant_id')
    def serialize_uuid(self, value: Optional[UUID]) -> Optional[str]:
        return str(value) if value else None

    class Config:
        from_attributes = True
