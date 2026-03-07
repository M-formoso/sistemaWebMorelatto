from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from typing import Optional, List
from datetime import date, timedelta
from decimal import Decimal

from app.db.session import get_db
from app.models.finance import Movement, MovementType
from app.models.sale import Sale
from app.models.order import Order
from app.models.supplier import SupplierPayment
from app.schemas.finance import (
    MovementCreate, MovementUpdate, MovementResponse,
    FinanceSummary, FinancePeriodSummary, CategorySummary,
    FinanceReport, CashFlowItem, CashFlowReport
)
from app.core.security import get_current_admin

router = APIRouter(prefix="/finance", tags=["Finanzas"])


# ============ MOVIMIENTOS CRUD ============

@router.get("/movements", response_model=List[MovementResponse])
def get_movements(
    type: Optional[str] = None,  # "ingreso" o "egreso"
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar movimientos financieros con filtros"""
    query = db.query(Movement)

    if type:
        if type == "ingreso":
            query = query.filter(Movement.type == MovementType.INCOME)
        elif type == "egreso":
            query = query.filter(Movement.type == MovementType.EXPENSE)

    if category:
        query = query.filter(Movement.category == category)

    if date_from:
        query = query.filter(Movement.date >= date_from)

    if date_to:
        query = query.filter(Movement.date <= date_to)

    movements = query.order_by(Movement.date.desc(), Movement.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for m in movements:
        data = {
            "id": m.id,
            "type": m.type.value,
            "concept": m.concept,
            "category": m.category,
            "amount": m.amount,
            "date": m.date,
            "notes": m.notes,
            "sale_id": m.sale_id,
            "created_at": m.created_at,
            "updated_at": m.updated_at,
            "sale_invoice": None
        }
        if m.sale:
            data["sale_invoice"] = m.sale.invoice_number
        result.append(data)

    return result


@router.get("/movements/{movement_id}")
def get_movement(
    movement_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener un movimiento por ID"""
    movement = db.query(Movement).filter(Movement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    return {
        "id": str(movement.id),
        "type": movement.type.value,
        "concept": movement.concept,
        "category": movement.category,
        "amount": float(movement.amount),
        "date": movement.date.isoformat(),
        "notes": movement.notes,
        "sale_id": str(movement.sale_id) if movement.sale_id else None,
        "order_id": str(movement.order_id) if movement.order_id else None,
        "supplier_payment_id": str(movement.supplier_payment_id) if movement.supplier_payment_id else None,
        "created_at": movement.created_at.isoformat(),
        "updated_at": movement.updated_at.isoformat() if movement.updated_at else None
    }


@router.post("/movements")
def create_movement(
    data: MovementCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crear un nuevo movimiento financiero"""
    movement = Movement(
        type=MovementType.INCOME if data.type == "ingreso" else MovementType.EXPENSE,
        concept=data.concept,
        category=data.category,
        amount=data.amount,
        date=data.date,
        notes=data.notes,
        sale_id=data.sale_id,
        order_id=data.order_id,
        supplier_payment_id=data.supplier_payment_id
    )

    db.add(movement)
    db.commit()
    db.refresh(movement)

    return {
        "id": str(movement.id),
        "type": movement.type.value,
        "concept": movement.concept,
        "category": movement.category,
        "amount": float(movement.amount),
        "date": movement.date.isoformat(),
        "notes": movement.notes,
        "created_at": movement.created_at.isoformat()
    }


@router.put("/movements/{movement_id}")
def update_movement(
    movement_id: str,
    data: MovementUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar un movimiento"""
    movement = db.query(Movement).filter(Movement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    # No permitir editar movimientos automáticos (de ventas u órdenes)
    if movement.sale_id or movement.order_id:
        raise HTTPException(
            status_code=400,
            detail="No se puede editar un movimiento generado automáticamente"
        )

    if data.concept is not None:
        movement.concept = data.concept
    if data.category is not None:
        movement.category = data.category
    if data.amount is not None:
        movement.amount = data.amount
    if data.date is not None:
        movement.date = data.date
    if data.notes is not None:
        movement.notes = data.notes

    db.commit()
    db.refresh(movement)

    return {
        "id": str(movement.id),
        "type": movement.type.value,
        "concept": movement.concept,
        "category": movement.category,
        "amount": float(movement.amount),
        "date": movement.date.isoformat(),
        "notes": movement.notes,
        "updated_at": movement.updated_at.isoformat() if movement.updated_at else None
    }


@router.delete("/movements/{movement_id}")
def delete_movement(
    movement_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar un movimiento"""
    movement = db.query(Movement).filter(Movement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    # No permitir eliminar movimientos automáticos
    if movement.sale_id or movement.order_id:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar un movimiento generado automáticamente"
        )

    db.delete(movement)
    db.commit()

    return {"message": "Movimiento eliminado"}


# ============ RESÚMENES Y REPORTES ============

@router.get("/summary")
def get_finance_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Resumen financiero general"""
    query = db.query(Movement)

    if date_from:
        query = query.filter(Movement.date >= date_from)
    if date_to:
        query = query.filter(Movement.date <= date_to)

    # Ingresos
    income = query.filter(Movement.type == MovementType.INCOME)
    total_income = income.with_entities(func.sum(Movement.amount)).scalar() or Decimal(0)
    income_count = income.count()

    # Egresos
    expenses = db.query(Movement)
    if date_from:
        expenses = expenses.filter(Movement.date >= date_from)
    if date_to:
        expenses = expenses.filter(Movement.date <= date_to)
    expenses = expenses.filter(Movement.type == MovementType.EXPENSE)
    total_expenses = expenses.with_entities(func.sum(Movement.amount)).scalar() or Decimal(0)
    expense_count = expenses.count()

    return {
        "total_income": float(total_income),
        "total_expenses": float(total_expenses),
        "balance": float(total_income - total_expenses),
        "income_count": income_count,
        "expense_count": expense_count
    }


@router.get("/summary/periods")
def get_period_summaries(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Resumen por períodos (hoy, semana, mes, año)"""
    today = date.today()

    periods = []

    # Hoy
    income_today = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.INCOME, Movement.date == today)
    ).scalar() or 0
    expenses_today = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.EXPENSE, Movement.date == today)
    ).scalar() or 0
    periods.append({
        "period": "today",
        "label": "Hoy",
        "start_date": today.isoformat(),
        "end_date": today.isoformat(),
        "income": float(income_today),
        "expenses": float(expenses_today),
        "balance": float(income_today - expenses_today)
    })

    # Esta semana
    week_start = today - timedelta(days=today.weekday())
    income_week = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.INCOME, Movement.date >= week_start)
    ).scalar() or 0
    expenses_week = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.EXPENSE, Movement.date >= week_start)
    ).scalar() or 0
    periods.append({
        "period": "week",
        "label": "Esta semana",
        "start_date": week_start.isoformat(),
        "end_date": today.isoformat(),
        "income": float(income_week),
        "expenses": float(expenses_week),
        "balance": float(income_week - expenses_week)
    })

    # Este mes
    month_start = today.replace(day=1)
    income_month = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.INCOME, Movement.date >= month_start)
    ).scalar() or 0
    expenses_month = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.EXPENSE, Movement.date >= month_start)
    ).scalar() or 0
    periods.append({
        "period": "month",
        "label": "Este mes",
        "start_date": month_start.isoformat(),
        "end_date": today.isoformat(),
        "income": float(income_month),
        "expenses": float(expenses_month),
        "balance": float(income_month - expenses_month)
    })

    # Este año
    year_start = today.replace(month=1, day=1)
    income_year = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.INCOME, Movement.date >= year_start)
    ).scalar() or 0
    expenses_year = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.EXPENSE, Movement.date >= year_start)
    ).scalar() or 0
    periods.append({
        "period": "year",
        "label": "Este año",
        "start_date": year_start.isoformat(),
        "end_date": today.isoformat(),
        "income": float(income_year),
        "expenses": float(expenses_year),
        "balance": float(income_year - expenses_year)
    })

    return periods


@router.get("/summary/by-category")
def get_summary_by_category(
    type: str = Query(..., description="ingreso o egreso"),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Resumen por categoría"""
    movement_type = MovementType.INCOME if type == "ingreso" else MovementType.EXPENSE

    query = db.query(
        Movement.category,
        func.sum(Movement.amount).label("total"),
        func.count(Movement.id).label("count")
    ).filter(Movement.type == movement_type)

    if date_from:
        query = query.filter(Movement.date >= date_from)
    if date_to:
        query = query.filter(Movement.date <= date_to)

    results = query.group_by(Movement.category).order_by(func.sum(Movement.amount).desc()).all()

    # Calcular total para porcentajes
    total = sum(r.total or 0 for r in results)

    return [
        {
            "category": r.category or "Sin categoría",
            "total": float(r.total or 0),
            "count": r.count,
            "percentage": round((float(r.total or 0) / float(total)) * 100, 2) if total > 0 else 0
        }
        for r in results
    ]


@router.get("/cash-flow")
def get_cash_flow(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Flujo de caja diario"""
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    # Obtener balance inicial (todo lo anterior a start_date)
    opening_income = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.INCOME, Movement.date < start_date)
    ).scalar() or 0
    opening_expenses = db.query(func.sum(Movement.amount)).filter(
        and_(Movement.type == MovementType.EXPENSE, Movement.date < start_date)
    ).scalar() or 0
    opening_balance = float(opening_income - opening_expenses)

    # Obtener movimientos por día
    daily_data = db.query(
        Movement.date,
        func.sum(case((Movement.type == MovementType.INCOME, Movement.amount), else_=0)).label("income"),
        func.sum(case((Movement.type == MovementType.EXPENSE, Movement.amount), else_=0)).label("expenses")
    ).filter(
        and_(Movement.date >= start_date, Movement.date <= end_date)
    ).group_by(Movement.date).order_by(Movement.date).all()

    # Crear diccionario de datos por fecha
    data_by_date = {d.date: {"income": float(d.income), "expenses": float(d.expenses)} for d in daily_data}

    # Generar flujo diario completo
    daily_flow = []
    cumulative = opening_balance
    current = start_date

    total_income = Decimal(0)
    total_expenses = Decimal(0)

    while current <= end_date:
        day_data = data_by_date.get(current, {"income": 0, "expenses": 0})
        income = day_data["income"]
        expenses = day_data["expenses"]
        balance = income - expenses
        cumulative += balance

        total_income += Decimal(str(income))
        total_expenses += Decimal(str(expenses))

        daily_flow.append({
            "date": current.isoformat(),
            "income": income,
            "expenses": expenses,
            "balance": balance,
            "cumulative_balance": round(cumulative, 2)
        })

        current += timedelta(days=1)

    return {
        "period_start": start_date.isoformat(),
        "period_end": end_date.isoformat(),
        "opening_balance": opening_balance,
        "closing_balance": round(cumulative, 2),
        "total_income": float(total_income),
        "total_expenses": float(total_expenses),
        "net_change": float(total_income - total_expenses),
        "daily_flow": daily_flow
    }


# ============ CATEGORÍAS ============

@router.get("/categories/income")
def get_income_categories():
    """Obtener categorías de ingresos"""
    return [
        {"value": "venta", "label": "Venta"},
        {"value": "cobro", "label": "Cobro de factura"},
        {"value": "anticipo", "label": "Anticipo"},
        {"value": "taller", "label": "Taller"},
        {"value": "ecommerce", "label": "Pedido web"},
        {"value": "otros", "label": "Otros"}
    ]


@router.get("/categories/expense")
def get_expense_categories():
    """Obtener categorías de egresos"""
    return [
        {"value": "servicios", "label": "Servicios (luz, gas, internet)"},
        {"value": "alquiler", "label": "Alquiler"},
        {"value": "sueldos", "label": "Sueldos"},
        {"value": "impuestos", "label": "Impuestos"},
        {"value": "proveedores", "label": "Proveedores"},
        {"value": "insumos", "label": "Insumos"},
        {"value": "mantenimiento", "label": "Mantenimiento"},
        {"value": "marketing", "label": "Marketing / Publicidad"},
        {"value": "bancarios", "label": "Gastos bancarios"},
        {"value": "otros", "label": "Otros"}
    ]
