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
    show_in_decoration: Optional[bool] = None,
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

    if show_in_decoration is not None:
        query = query.filter(Product.show_in_decoration == show_in_decoration)

    total = query.count()
    products = query.offset((page - 1) * page_size).limit(page_size).all()

    return ProductListResponse(
        items=products,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/public")
def get_public_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = None,
    category_slug: Optional[str] = None,
    search: Optional[str] = None,
    featured: bool = False,
    show_in_decoration: Optional[bool] = None,
    section: Optional[str] = Query(None, description="Filtrar por sección de categoría: 'productos' o 'decoracion'"),
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

    # Filtrar por sección de categoría
    if section:
        query = query.join(Category).filter(Category.section == section)

    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    if featured:
        query = query.filter(Product.is_featured == True)

    if show_in_decoration is not None:
        query = query.filter(Product.show_in_decoration == show_in_decoration)

    total = query.count()
    products = query.offset((page - 1) * page_size).limit(page_size).all()

    # Convertir manualmente a dict para evitar problemas de serialización UUID
    return {
        "items": [
            {
                "id": str(p.id),
                "name": p.name,
                "code": p.code,
                "description": p.description,
                "price": float(p.price) if p.price else 0,
                "cost": float(p.cost) if p.cost else 0,
                "stock_quantity": p.stock,
                "weight": float(p.weight) if p.weight else 0,
                "image_url": p.image_url,
                "color": p.color,  # Campo de variante/color del producto
                "is_active": p.is_active,
                "is_featured": p.is_featured,
                "show_in_decoration": p.show_in_decoration,
                "category_id": str(p.category_id) if p.category_id else None,
                "category": {"id": str(p.category.id), "name": p.category.name, "slug": p.category.slug, "section": p.category.section} if p.category else None,
                "variants": [
                    {
                        "id": str(v.id),
                        "color_name": v.color_name,
                        "color_code": v.color_code,
                        "image_url": v.image_url,
                        "stock_quantity": v.stock_quantity
                    }
                    for v in (p.variants or [])
                ],
                "images": [
                    {
                        "id": str(img.id),
                        "image_url": img.image_url,
                        "is_primary": img.is_primary,
                        "display_order": img.display_order,
                        "alt_text": img.alt_text
                    }
                    for img in (p.images or [])
                ],
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            for p in products
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/public/{product_id}")
def get_public_product(product_id: UUID, db: Session = Depends(get_db)):
    """Obtener producto público por ID para el ecommerce"""
    product = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.variants),
        joinedload(Product.images)
    ).filter(Product.id == product_id, Product.is_active == True).first()

    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Convertir manualmente a dict para evitar problemas de serialización UUID
    return {
        "id": str(product.id),
        "name": product.name,
        "code": product.code,
        "description": product.description,
        "price": float(product.price) if product.price else 0,
        "cost": float(product.cost) if product.cost else 0,
        "stock_quantity": product.stock,
        "weight": float(product.weight) if product.weight else 0,
        "image_url": product.image_url,
        "color": product.color,  # Campo de variante/color del producto
        "is_active": product.is_active,
        "is_featured": product.is_featured,
        "show_in_decoration": product.show_in_decoration,
        "category_id": str(product.category_id) if product.category_id else None,
        "category": {
            "id": str(product.category.id),
            "name": product.category.name,
            "slug": product.category.slug,
            "section": product.category.section
        } if product.category else None,
        "product_variants": [
            {
                "id": str(v.id),
                "color_name": v.color_name,
                "color_code": v.color_code,
                "image_url": v.image_url,
                "stock_quantity": v.stock_quantity
            }
            for v in (product.variants or [])
        ],
        "images": [
            {
                "id": str(img.id),
                "image_url": img.image_url,
                "is_primary": img.is_primary,
                "display_order": img.display_order,
                "alt_text": img.alt_text
            }
            for img in (product.images or [])
        ],
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "updated_at": product.updated_at.isoformat() if product.updated_at else None,
    }


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

    # Verificar si el producto tiene órdenes asociadas
    from app.models.order import OrderItem
    has_orders = db.query(OrderItem).filter(OrderItem.product_id == product_id).first()
    if has_orders:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el producto porque tiene pedidos asociados. Puedes desactivarlo en su lugar."
        )

    # Verificar si tiene ventas asociadas
    from app.models.sale import SaleItem
    has_sales = db.query(SaleItem).filter(SaleItem.product_id == product_id).first()
    if has_sales:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el producto porque tiene ventas asociadas. Puedes desactivarlo en su lugar."
        )

    try:
        db.delete(product)
        db.commit()
    except Exception as e:
        db.rollback()
        # Check if it's a foreign key constraint error
        if "foreign key constraint" in str(e).lower() or "violates foreign key" in str(e).lower() or "not-null constraint" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar el producto porque tiene registros asociados. Puedes desactivarlo en su lugar."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar producto: {str(e)}"
        )


@router.get("/variants", response_model=list[ProductVariantResponse])
def get_all_variants(
    product_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """Obtener todas las variantes, opcionalmente filtradas por producto"""
    query = db.query(ProductVariant).order_by(ProductVariant.color_name)

    if product_id:
        query = query.filter(ProductVariant.product_id == product_id)

    return query.all()


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


@router.put("/variants/{variant_id}", response_model=ProductVariantResponse)
def update_variant(
    variant_id: UUID,
    variant_data: ProductVariantCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar variante"""
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variante no encontrada")

    for field, value in variant_data.model_dump().items():
        setattr(variant, field, value)

    db.commit()
    db.refresh(variant)

    # Sincronizar stock total del producto desde variantes
    sync_product_stock_from_variants(db, variant.product_id)

    return variant


@router.delete("/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    variant_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar variante"""
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variante no encontrada")

    product_id = variant.product_id
    db.delete(variant)
    db.commit()

    # Sincronizar stock total del producto desde variantes
    sync_product_stock_from_variants(db, product_id)

    return None


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


@router.post("/{product_id}/unpublish", response_model=ProductResponse)
def unpublish_product_from_web(
    product_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """
    Despublicar un producto del ecommerce (ocultar de la web).
    El producto sigue existiendo en el sistema pero no se muestra en la tienda.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    product.is_active = False
    db.commit()
    db.refresh(product)

    return product


@router.patch("/{product_id}/toggle-active", response_model=ProductResponse)
def toggle_product_active(
    product_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """
    Alternar el estado de publicación de un producto (activo/inactivo).
    Útil para un botón de toggle en el admin.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    product.is_active = not product.is_active
    db.commit()
    db.refresh(product)

    return product
