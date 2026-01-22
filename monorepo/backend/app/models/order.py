import uuid
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, Text, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base, TimestampMixin


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    PAYMENT_FAILED = "payment_failed"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    FAILED = "failed"
    REJECTED = "rejected"
    REFUNDED = "refunded"


class Order(Base, TimestampMixin):
    """Pedidos del ecommerce"""
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Usuario registrado (opcional) o session
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    session_id = Column(String(100), nullable=True, index=True)

    # Datos del cliente
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=True)

    # Direccion de envio
    shipping_address = Column(String(500), nullable=False)
    shipping_city = Column(String(100), nullable=False)
    shipping_postal_code = Column(String(20), nullable=True)
    shipping_cost = Column(Numeric(12, 2), default=0)

    # Estado y pago
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String(50), nullable=True)  # "card", "bank_transfer"
    payment_gateway = Column(String(50), nullable=True)  # "mercadopago", "stripe"

    # MercadoPago
    mp_payment_id = Column(String(100), nullable=True)  # ID del pago en MP
    mp_preference_id = Column(String(100), nullable=True)  # ID de la preferencia

    # Stripe
    stripe_payment_intent_id = Column(String(100), nullable=True)  # PaymentIntent ID
    stripe_customer_id = Column(String(100), nullable=True)  # Customer ID

    # Transferencia bancaria
    transfer_proof_url = Column(String(500), nullable=True)  # URL del comprobante
    transfer_verified_at = Column(DateTime, nullable=True)  # Fecha de verificación

    paid_at = Column(DateTime, nullable=True)

    # Facturación AFIP
    invoice_type = Column(String(10), nullable=True)  # C, A, B
    invoice_number = Column(String(50), nullable=True)  # Numero completo
    invoice_cae = Column(String(20), nullable=True)  # CAE de AFIP
    invoice_cae_expiration = Column(DateTime, nullable=True)
    invoiced_at = Column(DateTime, nullable=True)

    # Montos
    total_amount = Column(Numeric(12, 2), nullable=False)

    notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", backref="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order {self.id}>"


class OrderItem(Base, TimestampMixin):
    """Items de un pedido del ecommerce"""
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.id"), nullable=True)

    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)
    total_price = Column(Numeric(12, 2), nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
    variant = relationship("ProductVariant")

    def __repr__(self):
        return f"<OrderItem {self.product_id} x{self.quantity}>"


class CartItem(Base, TimestampMixin):
    """Carrito de compras del ecommerce"""
    __tablename__ = "cart_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    session_id = Column(String(100), nullable=True, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.id"), nullable=True)
    quantity = Column(Integer, default=1)

    # Relationships
    user = relationship("User", backref="cart_items")
    product = relationship("Product")
    variant = relationship("ProductVariant")

    def __repr__(self):
        return f"<CartItem {self.product_id}>"
