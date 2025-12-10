from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from uuid import UUID
from decimal import Decimal

from app.db.session import get_db
from app.models.order import Order, OrderItem, CartItem, OrderStatus, PaymentStatus
from app.models.product import Product
from app.schemas.order import OrderCreate, OrderResponse, CartItemCreate, CartItemResponse
from app.core.security import get_current_admin
from app.services.stock_service import decrease_stock

router = APIRouter()


# ============ CART ============

@router.get("/cart", response_model=List[CartItemResponse])
def get_cart(
    session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """Obtener carrito por session_id"""
    if not session_id:
        return []

    items = db.query(CartItem).filter(CartItem.session_id == session_id).all()
    return items


@router.post("/cart", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    item_data: CartItemCreate,
    session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """Agregar producto al carrito"""
    if not session_id:
        raise HTTPException(status_code=400, detail="Se requiere X-Session-ID header")

    # Verificar producto
    product = db.query(Product).filter(
        Product.id == item_data.product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Validar stock según si es variante o producto base
    if item_data.variant_id:
        # Verificar stock de la variante
        from app.models.product import ProductVariant
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == item_data.variant_id,
            ProductVariant.is_active == True
        ).first()

        if not variant:
            raise HTTPException(status_code=404, detail="Variante no encontrada")

        if variant.stock < item_data.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente. Solo quedan {variant.stock} unidades de este color")
    else:
        # Verificar stock del producto base
        if product.stock < item_data.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente. Solo quedan {product.stock} unidades")

    # Buscar item existente (mismo producto Y misma variante)
    existing = db.query(CartItem).filter(
        CartItem.product_id == item_data.product_id,
        CartItem.variant_id == item_data.variant_id,
        CartItem.session_id == session_id
    ).first()

    if existing:
        existing.quantity += item_data.quantity
        db.commit()
        db.refresh(existing)
        return existing

    # Crear nuevo item
    cart_item = CartItem(
        session_id=session_id,
        product_id=item_data.product_id,
        variant_id=item_data.variant_id,
        quantity=item_data.quantity
    )
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)

    return cart_item


@router.put("/cart/{item_id}", response_model=CartItemResponse)
def update_cart_item(
    item_id: UUID,
    quantity: int,
    db: Session = Depends(get_db)
):
    """Actualizar cantidad de item en carrito"""
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    if quantity <= 0:
        db.delete(item)
        db.commit()
        raise HTTPException(status_code=204, detail="Item eliminado")

    item.quantity = quantity
    db.commit()
    db.refresh(item)
    return item


@router.delete("/cart/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_cart(item_id: UUID, db: Session = Depends(get_db)):
    """Eliminar item del carrito"""
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if item:
        db.delete(item)
        db.commit()


@router.delete("/cart", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """Vaciar carrito"""
    if session_id:
        db.query(CartItem).filter(CartItem.session_id == session_id).delete()
        db.commit()


# ============ ORDERS ============

@router.get("", response_model=List[OrderResponse])
def get_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    order_status: Optional[OrderStatus] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar pedidos (admin)"""
    query = db.query(Order).options(joinedload(Order.items))

    if order_status:
        query = query.filter(Order.status == order_status)

    orders = query.order_by(Order.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return orders


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: UUID, db: Session = Depends(get_db)):
    """Obtener pedido por ID"""
    order = db.query(Order).options(
        joinedload(Order.items)
    ).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    return order


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db)
):
    """Crear pedido"""
    total = Decimal("0")
    order_items = []

    for item_data in order_data.items:
        product = db.query(Product).filter(
            Product.id == item_data.product_id,
            Product.is_active == True
        ).first()

        if not product:
            raise HTTPException(
                status_code=400,
                detail=f"Producto {item_data.product_id} no encontrado"
            )

        # Validar y descontar stock según si es variante o no
        stock_decreased = decrease_stock(
            db=db,
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            variant_id=item_data.variant_id
        )

        if not stock_decreased:
            variant_msg = " (variante seleccionada)" if item_data.variant_id else ""
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para {product.name}{variant_msg}"
            )

        item_total = product.price * item_data.quantity
        total += item_total

        order_items.append(OrderItem(
            product_id=item_data.product_id,
            variant_id=item_data.variant_id,
            quantity=item_data.quantity,
            unit_price=product.price,
            total_price=item_total
        ))

    # Crear pedido
    order = Order(
        session_id=session_id,
        customer_name=order_data.customer_name,
        customer_email=order_data.customer_email,
        customer_phone=order_data.customer_phone,
        shipping_address=order_data.shipping_address,
        shipping_city=order_data.shipping_city,
        shipping_postal_code=order_data.shipping_postal_code,
        payment_method=order_data.payment_method,
        notes=order_data.notes,
        shipping_cost=Decimal("0"),
        total_amount=total
    )

    order.items = order_items
    db.add(order)

    # Vaciar carrito
    if session_id:
        db.query(CartItem).filter(CartItem.session_id == session_id).delete()

    db.commit()
    db.refresh(order)

    return order


@router.patch("/{order_id}/status")
def update_order_status(
    order_id: UUID,
    new_status: OrderStatus,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar estado del pedido"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    order.status = new_status
    db.commit()

    return {"message": "Estado actualizado", "status": new_status}


@router.patch("/{order_id}/payment")
def update_payment_status(
    order_id: UUID,
    new_payment_status: PaymentStatus,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar estado de pago"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    order.payment_status = new_payment_status
    db.commit()

    return {"message": "Estado de pago actualizado", "payment_status": new_payment_status}


@router.post("/{order_id}/confirm-payment")
def confirm_order_payment(
    order_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """
    Confirmar pago de una orden manualmente.
    Esto descuenta el stock y crea el movimiento financiero.
    Usar para pagos que no son por MercadoPago (transferencia, efectivo, etc.)
    """
    from datetime import datetime
    from app.services.sync_service import SyncService

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if order.payment_status == PaymentStatus.APPROVED or order.status == OrderStatus.PAID:
        raise HTTPException(status_code=400, detail="Esta orden ya fue pagada")

    # Actualizar estado de la orden
    order.payment_status = PaymentStatus.APPROVED
    order.status = OrderStatus.PAID
    order.paid_at = datetime.utcnow()

    # Procesar sincronización (stock + movimiento financiero)
    sync_service = SyncService(db)
    sync_result = sync_service.process_order_payment(order)

    db.commit()

    return {
        "message": "Pago confirmado exitosamente",
        "order_id": str(order.id),
        "stock_updated": sync_result.get("stock_updated"),
        "movement_created": sync_result.get("movement_created"),
        "products_updated": sync_result.get("products_updated", []),
        "errors": sync_result.get("errors", [])
    }


@router.get("/{order_id}/check-stock")
def check_order_stock(
    order_id: UUID,
    db: Session = Depends(get_db)
):
    """Verificar disponibilidad de stock para una orden"""
    from app.services.sync_service import SyncService

    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    sync_service = SyncService(db)
    result = sync_service.check_stock_availability(order)

    return {
        "order_id": str(order.id),
        "all_available": result["available"],
        "items": result["items"]
    }


@router.post("/{order_id}/revert-stock")
def revert_order_stock(
    order_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """
    Revertir el stock de una orden (para cancelaciones/reembolsos).
    Solo usar si la orden ya había descontado stock.
    """
    from app.services.sync_service import SyncService

    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    sync_service = SyncService(db)
    result = sync_service.revert_order_stock(order)

    # Actualizar estado de la orden
    order.status = OrderStatus.CANCELLED

    db.commit()

    return {
        "message": "Stock revertido exitosamente",
        "order_id": str(order.id),
        "products_reverted": result.get("products_reverted", []),
        "errors": result.get("errors", [])
    }
