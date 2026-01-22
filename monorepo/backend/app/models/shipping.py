import uuid
import enum
from sqlalchemy import Column, String, Numeric, Boolean, ForeignKey, Text, Integer, ARRAY, Enum, DateTime
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


class ShippingCarrier(str, enum.Enum):
    """Carriers de envío soportados"""
    ANDREANI = "andreani"
    OCA = "oca"
    CORREO_ARGENTINO = "correo_argentino"
    MANUAL = "manual"  # Envío manual sin integración


class ShipmentStatus(str, enum.Enum):
    """Estados del envío"""
    PENDING = "pending"  # Pendiente de despacho
    LABEL_CREATED = "label_created"  # Etiqueta creada
    IN_TRANSIT = "in_transit"  # En tránsito
    OUT_FOR_DELIVERY = "out_for_delivery"  # En reparto
    DELIVERED = "delivered"  # Entregado
    FAILED = "failed"  # Fallo en la entrega
    RETURNED = "returned"  # Devuelto al remitente


class Shipment(Base, TimestampMixin):
    """Envíos asociados a pedidos"""
    __tablename__ = "shipments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Información del carrier
    carrier = Column(Enum(ShippingCarrier), nullable=False)
    tracking_number = Column(String(100), nullable=True, index=True)
    label_url = Column(String(500), nullable=True)  # URL de la etiqueta de envío

    # Estado
    status = Column(Enum(ShipmentStatus), default=ShipmentStatus.PENDING)
    estimated_delivery_date = Column(DateTime, nullable=True)
    actual_delivery_date = Column(DateTime, nullable=True)

    # Costos
    shipping_cost = Column(Numeric(12, 2), default=0)
    insurance_cost = Column(Numeric(12, 2), default=0)

    # Dimensiones del paquete
    weight = Column(Numeric(8, 3), nullable=True)  # kg
    length = Column(Numeric(8, 2), nullable=True)  # cm
    width = Column(Numeric(8, 2), nullable=True)  # cm
    height = Column(Numeric(8, 2), nullable=True)  # cm

    # Datos adicionales del carrier
    carrier_data = Column(JSON, nullable=True)  # Info específica del carrier
    tracking_events = Column(JSON, nullable=True)  # Historial de tracking

    notes = Column(Text, nullable=True)

    # Relationships
    order = relationship("Order", backref="shipment")

    def __repr__(self):
        return f"<Shipment {self.tracking_number} - {self.carrier}>"
