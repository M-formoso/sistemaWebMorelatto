from pydantic import BaseModel, EmailStr, field_serializer, field_validator, model_validator
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime
import re


def generate_slug(text: str) -> str:
    """Genera un slug a partir de un texto"""
    slug = text.lower().strip()
    slug = re.sub(r'[áàäâ]', 'a', slug)
    slug = re.sub(r'[éèëê]', 'e', slug)
    slug = re.sub(r'[íìïî]', 'i', slug)
    slug = re.sub(r'[óòöô]', 'o', slug)
    slug = re.sub(r'[úùüû]', 'u', slug)
    slug = re.sub(r'[ñ]', 'n', slug)
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


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
    # Campos del frontend
    title: Optional[str] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None

    # Fechas - el frontend envia 'date' como ISO string
    date: Optional[datetime] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_hours: Optional[int] = None

    location: Optional[str] = None
    materials_included: Optional[str] = None

    price: Decimal = 0
    installments_allowed: int = 1
    product_discount: Decimal = 0
    max_participants: Optional[int] = None
    is_active: bool = True
    is_public: bool = True
    image_url: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def normalize_fields(cls, values):
        """Normaliza campos: title -> name, auto-genera slug"""
        if isinstance(values, dict):
            # Si viene title pero no name, usar title como name
            if values.get('title') and not values.get('name'):
                values['name'] = values['title']
            # Si viene name pero no title, usar name como title
            elif values.get('name') and not values.get('title'):
                values['title'] = values['name']

            # Auto-generar slug si no viene
            if not values.get('slug'):
                title = values.get('title') or values.get('name')
                if title:
                    # Agregar timestamp para unicidad
                    base_slug = generate_slug(title)
                    values['slug'] = f"{base_slug}-{int(datetime.now().timestamp())}"

            # Si viene 'date' como string ISO, parsearlo a datetime
            if values.get('date') and isinstance(values['date'], str):
                try:
                    dt = datetime.fromisoformat(values['date'].replace('Z', '+00:00'))
                    values['date'] = dt
                except:
                    pass
        return values


class WorkshopCreate(WorkshopBase):
    pass


class WorkshopUpdate(BaseModel):
    """Schema para actualizar workshop - todos los campos opcionales"""
    title: Optional[str] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    date: Optional[datetime] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_hours: Optional[int] = None
    location: Optional[str] = None
    materials_included: Optional[str] = None
    price: Optional[Decimal] = None
    installments_allowed: Optional[int] = None
    product_discount: Optional[Decimal] = None
    max_participants: Optional[int] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    image_url: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def normalize_fields(cls, values):
        """Normaliza campos"""
        if isinstance(values, dict):
            # Si viene title, actualizar tambien name
            if values.get('title'):
                values['name'] = values['title']

            # Si viene 'date' como string ISO, parsearlo
            if values.get('date') and isinstance(values['date'], str):
                try:
                    dt = datetime.fromisoformat(values['date'].replace('Z', '+00:00'))
                    values['date'] = dt
                except:
                    pass
        return values


class WorkshopResponse(BaseModel):
    id: UUID
    title: Optional[str] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    date: Optional[datetime] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_hours: Optional[int] = None
    location: Optional[str] = None
    materials_included: Optional[str] = None
    price: Decimal = 0
    installments_allowed: int = 1
    product_discount: Decimal = 0
    max_participants: Optional[int] = None
    current_participants: int = 0
    is_active: bool = True
    is_public: bool = True
    image_url: Optional[str] = None
    created_at: datetime
    images: List[WorkshopImageResponse] = []

    # Campo computed para el frontend - enrolled_count
    @property
    def enrolled_count(self) -> int:
        return self.current_participants

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
