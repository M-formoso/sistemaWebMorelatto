from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime


class WorkshopBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    content: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    location: Optional[str] = None
    price: Decimal = 0
    installments_allowed: int = 1
    product_discount: Decimal = 0
    max_participants: Optional[int] = None
    is_active: bool = True
    is_public: bool = True
    image_url: Optional[str] = None


class WorkshopCreate(WorkshopBase):
    pass


class WorkshopResponse(WorkshopBase):
    id: UUID
    current_participants: int
    created_at: datetime

    class Config:
        from_attributes = True


class WorkshopClientBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    document: Optional[str] = None
    enrollment_date: date
    total_amount: Decimal
    paid_amount: Decimal = 0


class WorkshopClientCreate(WorkshopClientBase):
    workshop_id: UUID
    client_id: Optional[UUID] = None


class WorkshopClientResponse(WorkshopClientBase):
    id: UUID
    workshop_id: UUID
    client_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceBase(BaseModel):
    date: date
    attended: bool = False
    notes: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    enrollment_id: UUID


class AttendanceResponse(AttendanceBase):
    id: UUID
    enrollment_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
