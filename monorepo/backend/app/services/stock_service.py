"""
Servicio para gestión y sincronización de stock
"""
from sqlalchemy.orm import Session
from uuid import UUID
from app.models.product import Product, ProductVariant


def sync_product_stock_from_variants(db: Session, product_id: UUID) -> int:
    """
    Sincroniza el stock total del producto basándose en la suma de stocks de sus variantes.

    Args:
        db: Sesión de base de datos
        product_id: ID del producto

    Returns:
        El nuevo stock total del producto
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise ValueError(f"Producto {product_id} no encontrado")

    # Si el producto no tiene variantes, no hacemos nada
    if not product.variants or len(product.variants) == 0:
        return product.stock

    # Calcular stock total como la suma de stocks de variantes activas
    total_stock = sum(
        variant.stock
        for variant in product.variants
        if variant.is_active
    )

    # Actualizar el stock del producto
    product.stock = total_stock
    db.commit()
    db.refresh(product)

    return total_stock


def update_variant_stock(db: Session, variant_id: UUID, new_stock: int) -> ProductVariant:
    """
    Actualiza el stock de una variante y sincroniza el stock total del producto.

    Args:
        db: Sesión de base de datos
        variant_id: ID de la variante
        new_stock: Nuevo stock de la variante

    Returns:
        La variante actualizada
    """
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise ValueError(f"Variante {variant_id} no encontrada")

    # Actualizar stock de la variante
    variant.stock = new_stock
    db.commit()
    db.refresh(variant)

    # Sincronizar stock total del producto
    sync_product_stock_from_variants(db, variant.product_id)

    return variant


def decrease_stock(db: Session, product_id: UUID, quantity: int, variant_id: UUID = None) -> bool:
    """
    Disminuye el stock de un producto o variante.

    Args:
        db: Sesión de base de datos
        product_id: ID del producto
        quantity: Cantidad a disminuir
        variant_id: ID de la variante (opcional)

    Returns:
        True si se pudo disminuir el stock, False si no hay suficiente
    """
    if variant_id:
        # Disminuir stock de la variante
        variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
        if not variant:
            raise ValueError(f"Variante {variant_id} no encontrada")

        if variant.stock < quantity:
            return False

        variant.stock -= quantity
        db.commit()

        # Sincronizar stock total del producto
        sync_product_stock_from_variants(db, product_id)
    else:
        # Disminuir stock del producto directamente
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Producto {product_id} no encontrado")

        if product.stock < quantity:
            return False

        product.stock -= quantity
        db.commit()

    return True


def increase_stock(db: Session, product_id: UUID, quantity: int, variant_id: UUID = None) -> bool:
    """
    Aumenta el stock de un producto o variante.

    Args:
        db: Sesión de base de datos
        product_id: ID del producto
        quantity: Cantidad a aumentar
        variant_id: ID de la variante (opcional)

    Returns:
        True si se pudo aumentar el stock
    """
    if variant_id:
        # Aumentar stock de la variante
        variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
        if not variant:
            raise ValueError(f"Variante {variant_id} no encontrada")

        variant.stock += quantity
        db.commit()

        # Sincronizar stock total del producto
        sync_product_stock_from_variants(db, product_id)
    else:
        # Aumentar stock del producto directamente
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Producto {product_id} no encontrado")

        product.stock += quantity
        db.commit()

    return True
