from pydantic import BaseModel, Field, field_serializer, computed_field
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_category_id: Optional[UUID] = None
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ProductVariantBase(BaseModel):
    color_name: str
    color_code: str
    image_url: Optional[str] = None
    stock: int = 0
    is_active: bool = True


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantResponse(ProductVariantBase):
    id: UUID
    product_id: UUID
    stock: int = 0

    # Computed field para agregar stock_quantity en la respuesta JSON
    @computed_field
    @property
    def stock_quantity(self) -> int:
        return self.stock

    class Config:
        from_attributes = True
        populate_by_name = True


class ProductImageBase(BaseModel):
    image_url: str
    is_primary: bool = False
    display_order: int = 0
    alt_text: Optional[str] = None


class ProductImageCreate(ProductImageBase):
    pass


class ProductImageUpdate(BaseModel):
    image_url: Optional[str] = None
    is_primary: Optional[bool] = None
    display_order: Optional[int] = None
    alt_text: Optional[str] = None


class ProductImageResponse(ProductImageBase):
    id: UUID
    product_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    stock: int = 0
    code: str
    cost: Optional[Decimal] = None
    stock_min: int = 5
    color: Optional[str] = None
    category_id: Optional[UUID] = None
    slug: Optional[str] = None
    image_url: Optional[str] = None
    weight: Optional[Decimal] = None
    is_active: bool = True
    is_featured: bool = False


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    stock: Optional[int] = None
    code: Optional[str] = None
    cost: Optional[Decimal] = None
    stock_min: Optional[int] = None
    color: Optional[str] = None
    category_id: Optional[UUID] = None
    slug: Optional[str] = None
    image_url: Optional[str] = None
    weight: Optional[Decimal] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class ProductResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    price: Decimal
    stock: int = 0
    code: str
    cost: Optional[Decimal] = None
    stock_min: int = 5
    physical_code_assigned: bool = False
    color: Optional[str] = None
    category_id: Optional[UUID] = None
    slug: Optional[str] = None
    image_url: Optional[str] = None
    weight: Optional[Decimal] = None
    is_active: bool = True
    is_featured: bool = False
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None
    product_variants: List[ProductVariantResponse] = Field(default=[], alias="variants")
    images: List[ProductImageResponse] = []

    # Computed field para agregar stock_quantity en la respuesta JSON
    @computed_field
    @property
    def stock_quantity(self) -> int:
        return self.stock

    class Config:
        from_attributes = True
        populate_by_name = True


class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int


class PublishProductRequest(BaseModel):
    category_id: UUID
    weight: Optional[float] = None
    parent_product_id: Optional[UUID] = None  # Si es una variante de otro producto
