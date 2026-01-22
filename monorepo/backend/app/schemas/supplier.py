from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


# ============ SUPPLIER SCHEMAS ============

class SupplierBase(BaseModel):
    name: str
    business_name: Optional[str] = None
    tax_id: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_type: Optional[str] = None
    cbu: Optional[str] = None
    alias: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    business_name: Optional[str] = None
    tax_id: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_type: Optional[str] = None
    cbu: Optional[str] = None
    alias: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_debt: Optional[Decimal] = None
    total_purchases: Optional[int] = None

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


# ============ SUPPLIER PURCHASE SCHEMAS ============

class SupplierPurchaseBase(BaseModel):
    supplier_id: UUID
    invoice_number: Optional[str] = None
    purchase_date: datetime
    due_date: Optional[datetime] = None
    total_amount: Decimal
    description: Optional[str] = None
    notes: Optional[str] = None


class SupplierPurchaseCreate(SupplierPurchaseBase):
    @field_serializer('supplier_id')
    def serialize_supplier_id(self, value: UUID) -> str:
        return str(value)


class SupplierPurchaseUpdate(BaseModel):
    invoice_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    total_amount: Optional[Decimal] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class SupplierPurchaseResponse(SupplierPurchaseBase):
    id: UUID
    paid_amount: Decimal
    remaining_amount: Decimal
    status: str
    is_overdue: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    supplier_name: Optional[str] = None

    @field_serializer('id', 'supplier_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


# ============ SUPPLIER PAYMENT SCHEMAS ============

class SupplierPaymentBase(BaseModel):
    supplier_id: UUID
    purchase_id: Optional[UUID] = None
    payment_date: datetime
    amount: Decimal
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None


class SupplierPaymentCreate(SupplierPaymentBase):
    @field_serializer('supplier_id', 'purchase_id')
    def serialize_uuid(self, value: Optional[UUID]) -> Optional[str]:
        return str(value) if value else None


class SupplierPaymentUpdate(BaseModel):
    payment_date: Optional[datetime] = None
    amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None


class SupplierPaymentResponse(SupplierPaymentBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    supplier_name: Optional[str] = None
    purchase_invoice: Optional[str] = None

    @field_serializer('id', 'supplier_id', 'purchase_id')
    def serialize_uuid(self, value: Optional[UUID]) -> Optional[str]:
        return str(value) if value else None

    class Config:
        from_attributes = True


# ============ SUMMARY SCHEMAS ============

class SupplierSummary(BaseModel):
    """Resumen financiero de un proveedor"""
    supplier_id: UUID
    supplier_name: str
    total_purchases: int
    total_amount: Decimal
    total_paid: Decimal
    total_debt: Decimal
    overdue_debt: Decimal
    overdue_purchases: int

    @field_serializer('supplier_id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


class SupplierDetailedResponse(SupplierResponse):
    """Respuesta detallada con información de compras y pagos"""
    purchases: List[SupplierPurchaseResponse] = []
    payments: List[SupplierPaymentResponse] = []
    summary: Optional[SupplierSummary] = None

    class Config:
        from_attributes = True
