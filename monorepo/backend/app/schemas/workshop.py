from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime


class WorkshopImageResponse(BaseModel):
    id: UUID
    image_url: str
    is_primary: bool
    display_order: int
    alt_text: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


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
    images: List[WorkshopImageResponse] = []

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

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


class WorkshopProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "en_progreso"  # en_progreso, completado, pausado
    start_date: date
    end_date: Optional[date] = None


class WorkshopProjectCreate(WorkshopProjectBase):
    enrollment_id: UUID


class WorkshopProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    end_date: Optional[date] = None


class WorkshopProjectResponse(WorkshopProjectBase):
    id: UUID
    enrollment_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectPurchaseBase(BaseModel):
    quantity: int
    original_price: Decimal
    discount_percentage: Decimal = 0
    final_price: Decimal
    date: date


class ProjectPurchaseCreate(ProjectPurchaseBase):
    project_id: UUID
    product_id: UUID


class ProjectPurchaseResponse(ProjectPurchaseBase):
    id: UUID
    project_id: UUID
    product_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentInstallmentBase(BaseModel):
    installment_number: int
    amount: Decimal
    due_date: date
    paid: bool = False
    payment_date: Optional[date] = None
    notes: Optional[str] = None


class PaymentInstallmentCreate(PaymentInstallmentBase):
    enrollment_id: UUID


class PaymentInstallmentUpdate(BaseModel):
    paid: Optional[bool] = None
    payment_date: Optional[date] = None
    notes: Optional[str] = None


class PaymentInstallmentResponse(PaymentInstallmentBase):
    id: UUID
    enrollment_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
