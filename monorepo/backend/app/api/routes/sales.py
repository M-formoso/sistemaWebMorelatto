from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from uuid import UUID
from datetime import date
from decimal import Decimal

from app.db.session import get_db
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.finance import Movement, MovementType
from app.schemas.sale import SaleCreate, SaleResponse
from app.core.security import get_current_admin

router = APIRouter()


def generate_invoice_number(db: Session) -> str:
    """Generar numero de factura unico"""
    today = date.today()
    prefix = f"V{today.strftime('%Y%m%d')}"

    # Buscar ultima factura del dia
    last_sale = db.query(Sale).filter(
        Sale.invoice_number.like(f"{prefix}%")
    ).order_by(Sale.invoice_number.desc()).first()

    if last_sale:
        last_num = int(last_sale.invoice_number[-4:])
        new_num = last_num + 1
    else:
        new_num = 1

    return f"{prefix}{new_num:04d}"


@router.get("", response_model=List[SaleResponse])
def get_sales(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar ventas con filtros"""
    query = db.query(Sale).options(joinedload(Sale.items))

    if date_from:
        query = query.filter(Sale.date >= date_from)
    if date_to:
        query = query.filter(Sale.date <= date_to)

    sales = query.order_by(Sale.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return sales


@router.get("/summary")
def get_sales_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener resumen de ventas"""
    query = db.query(
        func.count(Sale.id).label("total_sales"),
        func.sum(Sale.total).label("total_amount"),
        func.avg(Sale.total).label("average_sale")
    )

    if date_from:
        query = query.filter(Sale.date >= date_from)
    if date_to:
        query = query.filter(Sale.date <= date_to)

    result = query.first()

    return {
        "total_sales": result.total_sales or 0,
        "total_amount": float(result.total_amount or 0),
        "average_sale": float(result.average_sale or 0)
    }


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener venta por ID"""
    sale = db.query(Sale).options(
        joinedload(Sale.items)
    ).filter(Sale.id == sale_id).first()

    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    return sale


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    sale_data: SaleCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crear nueva venta"""
    # Calcular totales y verificar stock
    subtotal = Decimal("0")
    sale_items = []

    for item_data in sale_data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=400,
                detail=f"Producto {item_data.product_id} no encontrado"
            )

        if product.stock < item_data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para {product.name}"
            )

        item_subtotal = item_data.unit_price * item_data.quantity
        subtotal += item_subtotal

        sale_items.append(SaleItem(
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            subtotal=item_subtotal
        ))

        # Descontar stock
        product.stock -= item_data.quantity

    # Crear venta
    sale = Sale(
        client_id=sale_data.client_id,
        client_name=sale_data.client_name,
        client_email=sale_data.client_email,
        client_phone=sale_data.client_phone,
        client_document=sale_data.client_document,
        payment_method=sale_data.payment_method,
        notes=sale_data.notes,
        invoice_number=generate_invoice_number(db),
        subtotal=subtotal,
        taxes=Decimal("0"),
        total=subtotal
    )

    sale.items = sale_items
    db.add(sale)

    # Crear movimiento de ingreso
    movement = Movement(
        type=MovementType.INCOME,
        concept=f"Venta {sale.invoice_number}",
        category="Venta",
        amount=sale.total,
        date=sale.date,
        sale_id=sale.id
    )
    db.add(movement)

    db.commit()
    db.refresh(sale)

    return sale
