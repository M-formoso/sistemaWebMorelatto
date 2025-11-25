"""
Servicio de Sincronización Ecommerce <-> Sistema de Gestión
Maneja:
- Descuento de stock al confirmar pago
- Creación de movimientos financieros
- Sincronización de ventas
"""
from datetime import date, datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.product import Product, ProductVariant
from app.models.finance import Movement, MovementType
from app.models.sale import Sale, SaleItem


class SyncService:
    """Servicio para sincronizar operaciones entre ecommerce y sistema de gestión"""

    def __init__(self, db: Session):
        self.db = db

    def process_order_payment(self, order: Order) -> dict:
        """
        Procesa una orden pagada:
        1. Descuenta stock de productos
        2. Crea movimiento financiero (ingreso)
        3. Marca la orden como procesada

        Returns:
            dict con resultado de la operación
        """
        result = {
            "stock_updated": False,
            "movement_created": False,
            "products_updated": [],
            "errors": []
        }

        try:
            # 1. Descontar stock de cada item
            for item in order.items:
                try:
                    stock_result = self._update_product_stock(
                        product_id=str(item.product_id),
                        variant_id=str(item.variant_id) if item.variant_id else None,
                        quantity=item.quantity
                    )
                    result["products_updated"].append({
                        "product_id": str(item.product_id),
                        "quantity": item.quantity,
                        "new_stock": stock_result.get("new_stock")
                    })
                except Exception as e:
                    result["errors"].append(f"Error actualizando stock de {item.product_id}: {str(e)}")

            result["stock_updated"] = len(result["errors"]) == 0

            # 2. Crear movimiento financiero (ingreso por venta ecommerce)
            try:
                movement = self._create_income_movement(order)
                result["movement_created"] = True
                result["movement_id"] = str(movement.id)
            except Exception as e:
                result["errors"].append(f"Error creando movimiento: {str(e)}")

            # 3. Actualizar estado de la orden
            order.status = OrderStatus.CONFIRMED
            self.db.commit()

        except Exception as e:
            self.db.rollback()
            result["errors"].append(f"Error general: {str(e)}")

        return result

    def _update_product_stock(
        self,
        product_id: str,
        variant_id: Optional[str],
        quantity: int
    ) -> dict:
        """Descuenta stock de un producto o variante"""

        if variant_id:
            # Descontar de la variante específica
            variant = self.db.query(ProductVariant).filter(
                ProductVariant.id == variant_id
            ).first()

            if variant:
                old_stock = variant.stock
                variant.stock = max(0, variant.stock - quantity)
                self.db.flush()
                return {"new_stock": variant.stock, "old_stock": old_stock}

        # Descontar del producto principal
        product = self.db.query(Product).filter(Product.id == product_id).first()

        if product:
            old_stock = product.stock
            product.stock = max(0, product.stock - quantity)
            self.db.flush()
            return {"new_stock": product.stock, "old_stock": old_stock}

        raise ValueError(f"Producto no encontrado: {product_id}")

    def _create_income_movement(self, order: Order) -> Movement:
        """Crea un movimiento de ingreso por venta del ecommerce"""

        movement = Movement(
            type=MovementType.INCOME,
            concept=f"Venta Ecommerce - Pedido #{str(order.id)[:8]}",
            category="Venta Online",
            amount=order.total_amount,
            date=date.today(),
            notes=f"Cliente: {order.customer_name} - Email: {order.customer_email}"
        )

        self.db.add(movement)
        self.db.flush()

        return movement

    def revert_order_stock(self, order: Order) -> dict:
        """
        Revierte el stock de una orden (para cancelaciones/reembolsos)
        """
        result = {"products_reverted": [], "errors": []}

        for item in order.items:
            try:
                if item.variant_id:
                    variant = self.db.query(ProductVariant).filter(
                        ProductVariant.id == item.variant_id
                    ).first()
                    if variant:
                        variant.stock += item.quantity
                else:
                    product = self.db.query(Product).filter(
                        Product.id == item.product_id
                    ).first()
                    if product:
                        product.stock += item.quantity

                result["products_reverted"].append({
                    "product_id": str(item.product_id),
                    "quantity_reverted": item.quantity
                })
            except Exception as e:
                result["errors"].append(str(e))

        self.db.commit()
        return result

    def check_stock_availability(self, order: Order) -> dict:
        """
        Verifica si hay stock suficiente para una orden
        """
        result = {"available": True, "items": []}

        for item in order.items:
            available_stock = 0

            if item.variant_id:
                variant = self.db.query(ProductVariant).filter(
                    ProductVariant.id == item.variant_id
                ).first()
                if variant:
                    available_stock = variant.stock
            else:
                product = self.db.query(Product).filter(
                    Product.id == item.product_id
                ).first()
                if product:
                    available_stock = product.stock

            item_available = available_stock >= item.quantity

            result["items"].append({
                "product_id": str(item.product_id),
                "requested": item.quantity,
                "available": available_stock,
                "sufficient": item_available
            })

            if not item_available:
                result["available"] = False

        return result

    def get_low_stock_products(self, threshold: Optional[int] = None) -> list:
        """
        Obtiene productos con stock bajo
        """
        query = self.db.query(Product).filter(Product.is_active == True)

        if threshold:
            products = query.filter(Product.stock <= threshold).all()
        else:
            # Usar el stock_min de cada producto
            products = query.filter(Product.stock <= Product.stock_min).all()

        return [
            {
                "id": str(p.id),
                "code": p.code,
                "name": p.name,
                "stock": p.stock,
                "stock_min": p.stock_min
            }
            for p in products
        ]


def process_paid_order(db: Session, order_id: str) -> dict:
    """
    Función helper para procesar una orden pagada.
    Llamar desde el webhook de MercadoPago o manualmente.
    """
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        return {"success": False, "error": "Orden no encontrada"}

    if order.payment_status != PaymentStatus.APPROVED and order.payment_status != "approved":
        return {"success": False, "error": "La orden no está pagada"}

    sync_service = SyncService(db)
    result = sync_service.process_order_payment(order)

    return {
        "success": len(result["errors"]) == 0,
        **result
    }
