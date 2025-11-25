import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, ForeignKey, Text, Date, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base, TimestampMixin


class MovementType(str, enum.Enum):
    INCOME = "ingreso"
    EXPENSE = "egreso"


class Movement(Base, TimestampMixin):
    """Movimientos financieros (ingresos/egresos)"""
    __tablename__ = "movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    type = Column(Enum(MovementType), nullable=False)
    concept = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)

    # Relacion con venta (si el movimiento viene de una venta)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id"), nullable=True)

    # Relationships
    sale = relationship("Sale", back_populates="movement")

    def __repr__(self):
        return f"<Movement {self.type.value}: {self.amount}>"


class PaymentInstallment(Base, TimestampMixin):
    """Cuotas de pagos de talleres"""
    __tablename__ = "payment_installments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("workshop_clients.id", ondelete="CASCADE"), nullable=False)

    installment_number = Column(Integer, nullable=False)  # numero_cuota
    amount = Column(Numeric(12, 2), nullable=False)
    due_date = Column(Date, nullable=False)  # fecha_vencimiento
    payment_date = Column(Date, nullable=True)  # fecha_pago
    paid = Column(Boolean, default=False)
    payment_method = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    enrollment = relationship("WorkshopClient", back_populates="payment_installments")

    def __repr__(self):
        return f"<PaymentInstallment {self.installment_number}>"
