from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime


class SaleItemBase(BaseModel):
    product_id: UUID
    quantity: int
    unit_price: Decimal


class SaleItemCreate(SaleItemBase):
    pass


class SaleItemResponse(SaleItemBase):
    id: UUID
    subtotal: Decimal

    class Config:
        from_attributes = True


class SaleBase(BaseModel):
    client_name: str
    client_email: Optional[EmailStr] = None
    client_phone: Optional[str] = None
    client_document: Optional[str] = None
    payment_method: str = "efectivo"
    notes: Optional[str] = None


class SaleCreate(SaleBase):
    client_id: Optional[UUID] = None
    items: List[SaleItemCreate]


class SaleResponse(SaleBase):
    id: UUID
    client_id: Optional[UUID]
    date: date
    invoice_number: str
    subtotal: Decimal
    taxes: Decimal
    total: Decimal
    invoiced: bool
    items: List[SaleItemResponse]
    created_at: datetime

    class Config:
        from_attributes = True
