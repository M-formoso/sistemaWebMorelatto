from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional
from datetime import date, timedelta

from app.db.session import get_db
from app.models.sale import Sale
from app.models.order import Order, OrderStatus, PaymentStatus
from app.models.product import Product
from app.models.finance import Movement, MovementType
from app.core.security import get_current_admin

router = APIRouter()


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Resumen general del dashboard"""
    today = date.today()
    month_start = today.replace(day=1)

    # Ventas del mes
    monthly_sales = db.query(func.sum(Sale.total)).filter(
        Sale.date >= month_start
    ).scalar() or 0

    # Pedidos pendientes (ecommerce)
    pending_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.PENDING, OrderStatus.CONFIRMED])
    ).scalar() or 0

    # Productos con stock bajo
    low_stock = db.query(func.count(Product.id)).filter(
        Product.stock <= Product.stock_min
    ).scalar() or 0

    # Total productos
    total_products = db.query(func.count(Product.id)).scalar() or 0

    # Ingresos vs egresos del mes
    income = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.INCOME, Movement.date >= month_start)
    ).scalar() or 0

    expenses = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.EXPENSE, Movement.date >= month_start)
    ).scalar() or 0

    return {
        "monthly_sales": float(monthly_sales),
        "pending_orders": pending_orders,
        "low_stock_products": low_stock,
        "total_products": total_products,
        "monthly_income": float(income),
        "monthly_expenses": float(expenses),
        "monthly_profit": float(income - expenses)
    }


@router.get("/sales-by-period")
def get_sales_by_period(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Ventas por periodo"""
    start_date = date.today() - timedelta(days=days)

    sales = db.query(
        Sale.date,
        func.sum(Sale.total).label("total"),
        func.count(Sale.id).label("count")
    ).filter(
        Sale.date >= start_date
    ).group_by(Sale.date).order_by(Sale.date).all()

    return [
        {"date": s.date.isoformat(), "total": float(s.total), "count": s.count}
        for s in sales
    ]


@router.get("/top-products")
def get_top_products(
    limit: int = Query(10, ge=1, le=50),
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Productos mas vendidos"""
    from app.models.sale import SaleItem

    start_date = date.today() - timedelta(days=days)

    top = db.query(
        Product.id,
        Product.name,
        Product.code,
        func.sum(SaleItem.quantity).label("total_sold"),
        func.sum(SaleItem.subtotal).label("total_revenue")
    ).join(SaleItem).join(Sale).filter(
        Sale.date >= start_date
    ).group_by(Product.id).order_by(
        func.sum(SaleItem.quantity).desc()
    ).limit(limit).all()

    return [
        {
            "id": str(p.id),
            "name": p.name,
            "code": p.code,
            "total_sold": p.total_sold,
            "total_revenue": float(p.total_revenue)
        }
        for p in top
    ]


@router.get("/low-stock")
def get_low_stock_products(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Productos con stock bajo"""
    products = db.query(Product).filter(
        Product.stock <= Product.stock_min
    ).order_by(Product.stock).all()

    return [
        {
            "id": str(p.id),
            "name": p.name,
            "code": p.code,
            "stock": p.stock,
            "stock_min": p.stock_min
        }
        for p in products
    ]


@router.get("/recent-orders")
def get_recent_orders(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Pedidos recientes del ecommerce"""
    orders = db.query(Order).order_by(
        Order.created_at.desc()
    ).limit(limit).all()

    return [
        {
            "id": str(o.id),
            "customer_name": o.customer_name,
            "total_amount": float(o.total_amount),
            "status": o.status.value,
            "payment_status": o.payment_status.value,
            "created_at": o.created_at.isoformat()
        }
        for o in orders
    ]
