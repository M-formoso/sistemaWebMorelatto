from sqlalchemy import Column, String, Text, Boolean, Numeric, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.db.base import Base


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    business_name = Column(String, nullable=True)  # Razón social
    tax_id = Column(String, nullable=True, unique=True, index=True)  # CUIT/CUIL
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    province = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)

    # Información bancaria
    bank_name = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    account_type = Column(String, nullable=True)  # cuenta corriente, caja de ahorro
    cbu = Column(String, nullable=True)
    alias = Column(String, nullable=True)

    # Notas
    notes = Column(Text, nullable=True)

    # Estado
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    purchases = relationship("SupplierPurchase", back_populates="supplier", cascade="all, delete-orphan")
    payments = relationship("SupplierPayment", back_populates="supplier", cascade="all, delete-orphan")


class SupplierPurchase(Base):
    """Compras realizadas a proveedores"""
    __tablename__ = "supplier_purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)

    # Información de la compra
    invoice_number = Column(String, nullable=True, index=True)
    purchase_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)

    # Montos
    total_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), default=0, nullable=False)

    # Estado
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)

    # Detalles
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    supplier = relationship("Supplier", back_populates="purchases")
    payments = relationship("SupplierPayment", back_populates="purchase", cascade="all, delete-orphan")

    @property
    def remaining_amount(self):
        """Monto restante por pagar"""
        return float(self.total_amount) - float(self.paid_amount)

    @property
    def is_overdue(self):
        """Verifica si la compra está vencida"""
        if self.due_date and self.status != PaymentStatus.PAID:
            return datetime.utcnow() > self.due_date
        return False


class SupplierPayment(Base):
    """Pagos realizados a proveedores"""
    __tablename__ = "supplier_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    purchase_id = Column(UUID(as_uuid=True), ForeignKey("supplier_purchases.id", ondelete="CASCADE"), nullable=True)

    # Información del pago
    payment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String, nullable=True)  # efectivo, transferencia, cheque, etc.

    # Detalles
    reference = Column(String, nullable=True)  # número de cheque, transferencia, etc.
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    supplier = relationship("Supplier", back_populates="payments")
    purchase = relationship("SupplierPurchase", back_populates="payments")
