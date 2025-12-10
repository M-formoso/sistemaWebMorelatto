from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.models.product import Product, Category, ProductVariant
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse,
    ProductVariantCreate, ProductVariantResponse, PublishProductRequest
)
from app.core.security import get_current_admin
from app.services.stock_service import sync_product_stock_from_variants

router = APIRouter()


@router.get("", response_model=ProductListResponse)
def get_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    low_stock: bool = False,
    db: Session = Depends(get_db)
):
    """Listar productos con filtros y paginacion"""
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    )

    if category_id:
        query = query.filter(Product.category_id == category_id)

    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.code.ilike(f"%{search}%"))
        )

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)

    if low_stock:
        query = query.filter(Product.stock <= Product.stock_min)

    total = query.count()
    products = query.offset((page - 1) * page_size).limit(page_size).all()

    return ProductListResponse(
        items=products,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/public", response_model=ProductListResponse)
def get_public_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = None,
    category_slug: Optional[str] = None,
    search: Optional[str] = None,
    featured: bool = False,
    db: Session = Depends(get_db)
):
    """Listar productos publicos para el ecommerce"""
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    ).filter(Product.is_active == True)

    if category_id:
        query = query.filter(Product.category_id == category_id)
    elif category_slug:
        query = query.join(Category).filter(Category.slug == category_slug)

    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    if featured:
        query = query.filter(Product.is_featured == True)

    total = query.count()
    products = query.offset((page - 1) * page_size).limit(page_size).all()

    return ProductListResponse(
        items=products,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/public/{product_id}", response_model=ProductResponse)
def get_public_product(product_id: UUID, db: Session = Depends(get_db)):
    """Obtener producto público por ID para el ecommerce"""
    product = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    ).filter(Product.id == product_id, Product.is_active == True).first()

    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return product


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: UUID, db: Session = Depends(get_db)):
    """Obtener producto por ID"""
    product = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    ).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return product


@router.get("/code/{code}", response_model=ProductResponse)
def get_product_by_code(code: str, db: Session = Depends(get_db)):
    """Obtener producto por codigo"""
    product = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    ).filter(Product.code == code).first()

    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return product


@router.get("/slug/{slug}", response_model=ProductResponse)
def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    """Obtener producto por slug (para ecommerce)"""
    product = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    ).filter(Product.slug == slug, Product.is_active == True).first()

    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    return product


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crear producto (requiere admin)"""
    # Verificar codigo unico
    existing = db.query(Product).filter(Product.code == product_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="El codigo ya existe")

    product = Product(**product_data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)

    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar producto (requiere admin)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar producto (requiere admin)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    try:
        db.delete(product)
        db.commit()
    except Exception as e:
        db.rollback()
        # Check if it's a foreign key constraint error
        if "foreign key constraint" in str(e).lower() or "violates foreign key" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar el producto porque tiene pedidos o ventas asociados"
            )
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar producto: {str(e)}"
        )


@router.post("/{product_id}/variants", response_model=ProductVariantResponse)
def add_variant(
    product_id: UUID,
    variant_data: ProductVariantCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Agregar variante a producto"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    variant = ProductVariant(product_id=product_id, **variant_data.model_dump())
    db.add(variant)
    db.commit()
    db.refresh(variant)

    # Sincronizar stock total del producto desde variantes
    sync_product_stock_from_variants(db, product_id)

    return variant


@router.patch("/{product_id}/stock")
def update_stock(
    product_id: UUID,
    quantity: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar stock de producto"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    product.stock = quantity
    db.commit()

    return {"message": "Stock actualizado", "stock": product.stock}


@router.post("/{product_id}/publish", response_model=ProductResponse)
def publish_product_to_web(
    product_id: UUID,
    publish_data: PublishProductRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """
    Publicar un producto del sistema en el ecommerce.
    Solo requiere asignar categoría, el resto viene del sistema.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Verificar que la categoría exista
    category = db.query(Category).filter(Category.id == publish_data.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    # Generar slug si no existe
    if not product.slug:
        import re
        # Crear slug simple: minúsculas, reemplazar espacios y caracteres especiales
        base_slug = re.sub(r'[^\w\s-]', '', product.name.lower())
        base_slug = re.sub(r'[-\s]+', '-', base_slug).strip('-')
        slug = base_slug
        counter = 1
        while db.query(Product).filter(Product.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        product.slug = slug

    # Configurar para ecommerce
    product.category_id = publish_data.category_id
    product.is_active = True
    if publish_data.weight:
        product.weight = publish_data.weight

    db.commit()
    db.refresh(product)

    return product
