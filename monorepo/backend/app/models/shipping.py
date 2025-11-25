import uuid
from sqlalchemy import Column, String, Numeric, Boolean, ForeignKey, Text, Integer, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin


class ShippingZone(Base, TimestampMixin):
    """Zonas de envio para el ecommerce"""
    __tablename__ = "shipping_zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    provinces = Column(ARRAY(String), default=[])
    cities = Column(ARRAY(String), default=[])
    is_active = Column(Boolean, default=True)

    # Relationships
    rates = relationship("ShippingRate", back_populates="zone", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ShippingZone {self.name}>"


class ShippingRate(Base, TimestampMixin):
    """Tarifas de envio por zona y peso"""
    __tablename__ = "shipping_rates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("shipping_zones.id", ondelete="CASCADE"), nullable=False)

    min_weight = Column(Numeric(8, 3), default=0)  # kg
    max_weight = Column(Numeric(8, 3), default=999)  # kg
    base_cost = Column(Numeric(12, 2), default=0)
    cost_per_kg = Column(Numeric(12, 2), default=0)
    free_shipping_threshold = Column(Numeric(12, 2), nullable=True)  # envio gratis desde X
    is_active = Column(Boolean, default=True)

    # Relationships
    zone = relationship("ShippingZone", back_populates="rates")

    def __repr__(self):
        return f"<ShippingRate {self.zone_id} {self.min_weight}-{self.max_weight}kg>"


class PaymentMethod(Base, TimestampMixin):
    """Metodos de pago para el ecommerce"""
    __tablename__ = "payment_methods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # transferencia, efectivo, tarjeta, etc
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)  # instrucciones para el cliente
    account_details = Column(JSON, nullable=True)  # CBU, alias, etc
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<PaymentMethod {self.name}>"
