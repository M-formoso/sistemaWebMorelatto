from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from app.models.order import OrderStatus, PaymentStatus


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


class OrderResponse(OrderBase):
    id: UUID
    user_id: Optional[UUID]
    session_id: Optional[str]
    status: OrderStatus
    payment_status: PaymentStatus
    shipping_cost: Decimal
    total_amount: Decimal
    items: List[OrderItemResponse]
    created_at: datetime

    class Config:
        from_attributes = True


class CartItemBase(BaseModel):
    product_id: UUID
    variant_id: Optional[UUID] = None
    quantity: int = 1


class CartItemCreate(CartItemBase):
    pass


class CartItemResponse(CartItemBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
