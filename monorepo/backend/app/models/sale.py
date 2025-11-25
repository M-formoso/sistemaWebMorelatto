import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, ForeignKey, Text, Date, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin


class Sale(Base, TimestampMixin):
    """Ventas presenciales del sistema"""
    __tablename__ = "sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Cliente (puede ser registrado o datos sueltos)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255), nullable=True)
    client_phone = Column(String(50), nullable=True)
    client_document = Column(String(50), nullable=True)

    # Datos de la venta
    date = Column(Date, default=func.current_date(), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)
    payment_method = Column(String(50), default="efectivo")

    # Montos
    subtotal = Column(Numeric(12, 2), nullable=False)
    taxes = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=True)  # Para compatibilidad con facturación

    # Estado
    invoiced = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    # Facturación AFIP
    invoice_type = Column(String(10), nullable=True)  # C, A, B
    invoice_cae = Column(String(20), nullable=True)  # CAE de AFIP
    invoice_cae_expiration = Column(DateTime, nullable=True)
    invoiced_at = Column(DateTime, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    movement = relationship("Movement", back_populates="sale", uselist=False)

    def __repr__(self):
        return f"<Sale {self.invoice_number}>"


class SaleItem(Base, TimestampMixin):
    """Items de una venta presencial"""
    __tablename__ = "sale_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)

    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    # Relationships
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

    def __repr__(self):
        return f"<SaleItem {self.product_id} x{self.quantity}>"
