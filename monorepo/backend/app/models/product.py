import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin


class Category(Base, TimestampMixin):
    """Categorias de productos - usadas principalmente en ecommerce"""
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    parent_category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    products = relationship("Product", back_populates="category")
    subcategories = relationship("Category", backref="parent", remote_side=[id])

    def __repr__(self):
        return f"<Category {self.name}>"


class Product(Base, TimestampMixin):
    """
    Producto unificado para sistema e-commerce.
    - El sistema usa: codigo, costo, stock, stock_minimo, codigo_fisico_asignado
    - El ecommerce usa: category_id, image_url, is_active, weight, slug
    """
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Campos comunes
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(12, 2), nullable=False)
    stock = Column(Integer, default=0)

    # Campos del sistema de inventario
    code = Column(String(50), unique=True, nullable=False, index=True)  # codigo
    cost = Column(Numeric(12, 2), nullable=True)  # costo
    stock_min = Column(Integer, default=5)  # stock_minimo
    physical_code_assigned = Column(Boolean, default=False)  # codigo_fisico_asignado
    color = Column(String(50), nullable=True)

    # Campos del ecommerce
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    slug = Column(String(255), unique=True, nullable=True, index=True)
    image_url = Column(String(500), nullable=True)
    weight = Column(Numeric(8, 3), nullable=True)  # peso en kg para calcular envio
    is_active = Column(Boolean, default=True)  # visible en ecommerce
    is_featured = Column(Boolean, default=False)  # destacado en home

    # Relationships
    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    sale_items = relationship("SaleItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")

    def __repr__(self):
        return f"<Product {self.code}: {self.name}>"


class ProductVariant(Base, TimestampMixin):
    """Variantes de color para el ecommerce"""
    __tablename__ = "product_variants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    color_name = Column(String(50), nullable=False)
    color_code = Column(String(10), nullable=False)  # Hex color
    image_url = Column(String(500), nullable=True)
    stock = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    # Relationships
    product = relationship("Product", back_populates="variants")

    def __repr__(self):
        return f"<ProductVariant {self.color_name}>"
