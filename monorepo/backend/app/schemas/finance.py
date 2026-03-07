from pydantic import BaseModel, field_serializer, field_validator
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal
from enum import Enum


class MovementType(str, Enum):
    INCOME = "ingreso"
    EXPENSE = "egreso"


# Categorías predefinidas para egresos
class ExpenseCategory(str, Enum):
    SERVICIOS = "servicios"  # Luz, agua, gas, internet
    ALQUILER = "alquiler"
    SUELDOS = "sueldos"
    IMPUESTOS = "impuestos"
    PROVEEDORES = "proveedores"
    INSUMOS = "insumos"
    MANTENIMIENTO = "mantenimiento"
    MARKETING = "marketing"
    BANCARIOS = "bancarios"  # Comisiones bancarias
    OTROS = "otros"


# Categorías predefinidas para ingresos
class IncomeCategory(str, Enum):
    VENTA = "venta"
    COBRO = "cobro"  # Cobro de factura pendiente
    ANTICIPO = "anticipo"
    TALLER = "taller"
    ECOMMERCE = "ecommerce"
    OTROS = "otros"


# ============ MOVEMENT SCHEMAS ============

class MovementBase(BaseModel):
    type: MovementType
    concept: str
    category: Optional[str] = None
    amount: Decimal
    date: date
    notes: Optional[str] = None


class MovementCreate(MovementBase):
    sale_id: Optional[UUID] = None
    order_id: Optional[UUID] = None
    supplier_payment_id: Optional[UUID] = None

    @field_validator('concept', mode='before')
    @classmethod
    def concept_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('El concepto es requerido')
        return v.strip()

    @field_validator('amount', mode='before')
    @classmethod
    def amount_positive(cls, v):
        if v is not None and float(v) <= 0:
            raise ValueError('El monto debe ser mayor a 0')
        return v


class MovementUpdate(BaseModel):
    concept: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator('concept', mode='before')
    @classmethod
    def concept_not_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('El concepto no puede estar vacío')
        return v.strip() if v else v

    @field_validator('amount', mode='before')
    @classmethod
    def amount_positive(cls, v):
        if v is not None and float(v) <= 0:
            raise ValueError('El monto debe ser mayor a 0')
        return v


class MovementResponse(MovementBase):
    id: UUID
    sale_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Info relacionada
    sale_invoice: Optional[str] = None

    @field_serializer('id', 'sale_id')
    def serialize_uuid(self, value: Optional[UUID]) -> Optional[str]:
        return str(value) if value else None

    class Config:
        from_attributes = True


# ============ SUMMARY SCHEMAS ============

class FinanceSummary(BaseModel):
    """Resumen financiero general"""
    total_income: Decimal
    total_expenses: Decimal
    balance: Decimal
    income_count: int
    expense_count: int


class FinancePeriodSummary(BaseModel):
    """Resumen financiero por período"""
    period: str  # "today", "week", "month", "year"
    start_date: date
    end_date: date
    income: Decimal
    expenses: Decimal
    balance: Decimal


class CategorySummary(BaseModel):
    """Resumen por categoría"""
    category: str
    total: Decimal
    count: int
    percentage: float


class FinanceReport(BaseModel):
    """Reporte financiero completo"""
    period_start: date
    period_end: date

    # Totales
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal

    # Por categoría
    income_by_category: List[CategorySummary]
    expenses_by_category: List[CategorySummary]

    # Comparación con período anterior
    income_change_percent: Optional[float] = None
    expenses_change_percent: Optional[float] = None


class CashFlowItem(BaseModel):
    """Item de flujo de caja"""
    date: date
    income: Decimal
    expenses: Decimal
    balance: Decimal
    cumulative_balance: Decimal


class CashFlowReport(BaseModel):
    """Reporte de flujo de caja"""
    period_start: date
    period_end: date
    opening_balance: Decimal
    closing_balance: Decimal
    total_income: Decimal
    total_expenses: Decimal
    daily_flow: List[CashFlowItem]
