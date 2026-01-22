from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.db.session import get_db
from app.models.supplier import Supplier, SupplierPurchase, SupplierPayment, PaymentStatus
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierDetailedResponse,
    SupplierPurchaseCreate, SupplierPurchaseUpdate, SupplierPurchaseResponse,
    SupplierPaymentCreate, SupplierPaymentUpdate, SupplierPaymentResponse,
    SupplierSummary
)
from app.core.security import get_current_admin

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


# ============ SUPPLIER ENDPOINTS ============

@router.get("", response_model=List[SupplierResponse])
def get_suppliers(
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener todos los proveedores (admin only)"""
    query = db.query(Supplier)

    if is_active is not None:
        query = query.filter(Supplier.is_active == is_active)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Supplier.name.ilike(search_term)) |
            (Supplier.business_name.ilike(search_term)) |
            (Supplier.tax_id.ilike(search_term)) |
            (Supplier.email.ilike(search_term))
        )

    suppliers = query.order_by(Supplier.name).offset(skip).limit(limit).all()

    # Calcular deuda total para cada proveedor
    result = []
    for supplier in suppliers:
        supplier_dict = {
            "id": supplier.id,
            "name": supplier.name,
            "business_name": supplier.business_name,
            "tax_id": supplier.tax_id,
            "email": supplier.email,
            "phone": supplier.phone,
            "address": supplier.address,
            "city": supplier.city,
            "province": supplier.province,
            "postal_code": supplier.postal_code,
            "bank_name": supplier.bank_name,
            "account_number": supplier.account_number,
            "account_type": supplier.account_type,
            "cbu": supplier.cbu,
            "alias": supplier.alias,
            "notes": supplier.notes,
            "is_active": supplier.is_active,
            "created_at": supplier.created_at,
            "updated_at": supplier.updated_at,
        }

        # Calcular deuda total
        purchases = db.query(SupplierPurchase).filter(
            SupplierPurchase.supplier_id == supplier.id,
            SupplierPurchase.status != PaymentStatus.PAID
        ).all()

        total_debt = sum(p.remaining_amount for p in purchases)
        supplier_dict["total_debt"] = Decimal(str(total_debt))
        supplier_dict["total_purchases"] = len(supplier.purchases)

        result.append(SupplierResponse(**supplier_dict))

    return result


@router.get("/{supplier_id}", response_model=SupplierDetailedResponse)
def get_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener un proveedor específico con detalles (admin only)"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # Obtener compras con información calculada
    purchases = db.query(SupplierPurchase).filter(
        SupplierPurchase.supplier_id == supplier_id
    ).order_by(SupplierPurchase.purchase_date.desc()).all()

    purchases_response = []
    for purchase in purchases:
        purchase_dict = {
            "id": purchase.id,
            "supplier_id": purchase.supplier_id,
            "invoice_number": purchase.invoice_number,
            "purchase_date": purchase.purchase_date,
            "due_date": purchase.due_date,
            "total_amount": purchase.total_amount,
            "paid_amount": purchase.paid_amount,
            "remaining_amount": Decimal(str(purchase.remaining_amount)),
            "status": purchase.status.value,
            "is_overdue": purchase.is_overdue,
            "description": purchase.description,
            "notes": purchase.notes,
            "created_at": purchase.created_at,
            "updated_at": purchase.updated_at,
            "supplier_name": supplier.name
        }
        purchases_response.append(SupplierPurchaseResponse(**purchase_dict))

    # Obtener pagos
    payments = db.query(SupplierPayment).filter(
        SupplierPayment.supplier_id == supplier_id
    ).order_by(SupplierPayment.payment_date.desc()).all()

    payments_response = []
    for payment in payments:
        purchase = None
        if payment.purchase_id:
            purchase = db.query(SupplierPurchase).filter(
                SupplierPurchase.id == payment.purchase_id
            ).first()

        payment_dict = {
            "id": payment.id,
            "supplier_id": payment.supplier_id,
            "purchase_id": payment.purchase_id,
            "payment_date": payment.payment_date,
            "amount": payment.amount,
            "payment_method": payment.payment_method,
            "reference": payment.reference,
            "notes": payment.notes,
            "created_at": payment.created_at,
            "updated_at": payment.updated_at,
            "supplier_name": supplier.name,
            "purchase_invoice": purchase.invoice_number if purchase else None
        }
        payments_response.append(SupplierPaymentResponse(**payment_dict))

    # Calcular resumen
    total_purchases_count = len(purchases)
    total_amount = sum(p.total_amount for p in purchases)
    total_paid = sum(p.paid_amount for p in purchases)
    total_debt = sum(p.remaining_amount for p in purchases if p.status != PaymentStatus.PAID)
    overdue_purchases = [p for p in purchases if p.is_overdue]
    overdue_debt = sum(p.remaining_amount for p in overdue_purchases)

    summary = SupplierSummary(
        supplier_id=supplier.id,
        supplier_name=supplier.name,
        total_purchases=total_purchases_count,
        total_amount=Decimal(str(total_amount)),
        total_paid=Decimal(str(total_paid)),
        total_debt=Decimal(str(total_debt)),
        overdue_debt=Decimal(str(overdue_debt)),
        overdue_purchases=len(overdue_purchases)
    )

    supplier_dict = {
        "id": supplier.id,
        "name": supplier.name,
        "business_name": supplier.business_name,
        "tax_id": supplier.tax_id,
        "email": supplier.email,
        "phone": supplier.phone,
        "address": supplier.address,
        "city": supplier.city,
        "province": supplier.province,
        "postal_code": supplier.postal_code,
        "bank_name": supplier.bank_name,
        "account_number": supplier.account_number,
        "account_type": supplier.account_type,
        "cbu": supplier.cbu,
        "alias": supplier.alias,
        "notes": supplier.notes,
        "is_active": supplier.is_active,
        "created_at": supplier.created_at,
        "updated_at": supplier.updated_at,
        "total_debt": Decimal(str(total_debt)),
        "total_purchases": total_purchases_count,
        "purchases": purchases_response,
        "payments": payments_response,
        "summary": summary
    }

    return SupplierDetailedResponse(**supplier_dict)


@router.post("", response_model=SupplierResponse)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crear un nuevo proveedor (admin only)"""
    # Verificar si ya existe un proveedor con el mismo CUIT
    if supplier.tax_id:
        existing = db.query(Supplier).filter(Supplier.tax_id == supplier.tax_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un proveedor con ese CUIT")

    db_supplier = Supplier(**supplier.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)

    return SupplierResponse(**{
        **db_supplier.__dict__,
        "total_debt": Decimal("0"),
        "total_purchases": 0
    })


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: str,
    supplier: SupplierUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar un proveedor (admin only)"""
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # Verificar CUIT único si se está actualizando
    if supplier.tax_id and supplier.tax_id != db_supplier.tax_id:
        existing = db.query(Supplier).filter(Supplier.tax_id == supplier.tax_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un proveedor con ese CUIT")

    update_data = supplier.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_supplier, key, value)

    db.commit()
    db.refresh(db_supplier)

    # Calcular deuda total
    purchases = db.query(SupplierPurchase).filter(
        SupplierPurchase.supplier_id == supplier_id,
        SupplierPurchase.status != PaymentStatus.PAID
    ).all()
    total_debt = sum(p.remaining_amount for p in purchases)

    return SupplierResponse(**{
        **db_supplier.__dict__,
        "total_debt": Decimal(str(total_debt)),
        "total_purchases": len(db_supplier.purchases)
    })


@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar un proveedor (admin only)"""
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # Verificar si tiene compras pendientes
    pending_purchases = db.query(SupplierPurchase).filter(
        SupplierPurchase.supplier_id == supplier_id,
        SupplierPurchase.status != PaymentStatus.PAID
    ).count()

    if pending_purchases > 0:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar un proveedor con compras pendientes de pago"
        )

    db.delete(db_supplier)
    db.commit()
    return {"message": "Proveedor eliminado"}


# ============ PURCHASE ENDPOINTS ============

@router.get("/purchases/all", response_model=List[SupplierPurchaseResponse])
def get_all_purchases(
    supplier_id: Optional[str] = None,
    status: Optional[PaymentStatus] = None,
    overdue_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener todas las compras (admin only)"""
    query = db.query(SupplierPurchase).join(Supplier)

    if supplier_id:
        query = query.filter(SupplierPurchase.supplier_id == supplier_id)

    if status:
        query = query.filter(SupplierPurchase.status == status)

    if overdue_only:
        query = query.filter(
            SupplierPurchase.due_date < datetime.utcnow(),
            SupplierPurchase.status != PaymentStatus.PAID
        )

    purchases = query.order_by(SupplierPurchase.purchase_date.desc()).offset(skip).limit(limit).all()

    result = []
    for purchase in purchases:
        supplier = db.query(Supplier).filter(Supplier.id == purchase.supplier_id).first()
        purchase_dict = {
            "id": purchase.id,
            "supplier_id": purchase.supplier_id,
            "invoice_number": purchase.invoice_number,
            "purchase_date": purchase.purchase_date,
            "due_date": purchase.due_date,
            "total_amount": purchase.total_amount,
            "paid_amount": purchase.paid_amount,
            "remaining_amount": Decimal(str(purchase.remaining_amount)),
            "status": purchase.status.value,
            "is_overdue": purchase.is_overdue,
            "description": purchase.description,
            "notes": purchase.notes,
            "created_at": purchase.created_at,
            "updated_at": purchase.updated_at,
            "supplier_name": supplier.name if supplier else None
        }
        result.append(SupplierPurchaseResponse(**purchase_dict))

    return result


@router.post("/purchases", response_model=SupplierPurchaseResponse)
def create_purchase(
    purchase: SupplierPurchaseCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Registrar una nueva compra a proveedor (admin only)"""
    # Verificar que el proveedor existe
    supplier = db.query(Supplier).filter(Supplier.id == str(purchase.supplier_id)).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    db_purchase = SupplierPurchase(**purchase.model_dump())
    db.add(db_purchase)
    db.commit()
    db.refresh(db_purchase)

    return SupplierPurchaseResponse(**{
        "id": db_purchase.id,
        "supplier_id": db_purchase.supplier_id,
        "invoice_number": db_purchase.invoice_number,
        "purchase_date": db_purchase.purchase_date,
        "due_date": db_purchase.due_date,
        "total_amount": db_purchase.total_amount,
        "paid_amount": db_purchase.paid_amount,
        "remaining_amount": Decimal(str(db_purchase.remaining_amount)),
        "status": db_purchase.status.value,
        "is_overdue": db_purchase.is_overdue,
        "description": db_purchase.description,
        "notes": db_purchase.notes,
        "created_at": db_purchase.created_at,
        "updated_at": db_purchase.updated_at,
        "supplier_name": supplier.name
    })


@router.put("/purchases/{purchase_id}", response_model=SupplierPurchaseResponse)
def update_purchase(
    purchase_id: str,
    purchase: SupplierPurchaseUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar una compra (admin only)"""
    db_purchase = db.query(SupplierPurchase).filter(SupplierPurchase.id == purchase_id).first()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")

    update_data = purchase.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_purchase, key, value)

    db.commit()
    db.refresh(db_purchase)

    supplier = db.query(Supplier).filter(Supplier.id == db_purchase.supplier_id).first()

    return SupplierPurchaseResponse(**{
        "id": db_purchase.id,
        "supplier_id": db_purchase.supplier_id,
        "invoice_number": db_purchase.invoice_number,
        "purchase_date": db_purchase.purchase_date,
        "due_date": db_purchase.due_date,
        "total_amount": db_purchase.total_amount,
        "paid_amount": db_purchase.paid_amount,
        "remaining_amount": Decimal(str(db_purchase.remaining_amount)),
        "status": db_purchase.status.value,
        "is_overdue": db_purchase.is_overdue,
        "description": db_purchase.description,
        "notes": db_purchase.notes,
        "created_at": db_purchase.created_at,
        "updated_at": db_purchase.updated_at,
        "supplier_name": supplier.name if supplier else None
    })


@router.delete("/purchases/{purchase_id}")
def delete_purchase(
    purchase_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar una compra (admin only)"""
    db_purchase = db.query(SupplierPurchase).filter(SupplierPurchase.id == purchase_id).first()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")

    # Verificar si tiene pagos asociados
    payments_count = db.query(SupplierPayment).filter(
        SupplierPayment.purchase_id == purchase_id
    ).count()

    if payments_count > 0:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar una compra con pagos asociados"
        )

    db.delete(db_purchase)
    db.commit()
    return {"message": "Compra eliminada"}


# ============ PAYMENT ENDPOINTS ============

@router.get("/payments/all", response_model=List[SupplierPaymentResponse])
def get_all_payments(
    supplier_id: Optional[str] = None,
    purchase_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener todos los pagos (admin only)"""
    query = db.query(SupplierPayment).join(Supplier)

    if supplier_id:
        query = query.filter(SupplierPayment.supplier_id == supplier_id)

    if purchase_id:
        query = query.filter(SupplierPayment.purchase_id == purchase_id)

    payments = query.order_by(SupplierPayment.payment_date.desc()).offset(skip).limit(limit).all()

    result = []
    for payment in payments:
        supplier = db.query(Supplier).filter(Supplier.id == payment.supplier_id).first()
        purchase = None
        if payment.purchase_id:
            purchase = db.query(SupplierPurchase).filter(
                SupplierPurchase.id == payment.purchase_id
            ).first()

        payment_dict = {
            "id": payment.id,
            "supplier_id": payment.supplier_id,
            "purchase_id": payment.purchase_id,
            "payment_date": payment.payment_date,
            "amount": payment.amount,
            "payment_method": payment.payment_method,
            "reference": payment.reference,
            "notes": payment.notes,
            "created_at": payment.created_at,
            "updated_at": payment.updated_at,
            "supplier_name": supplier.name if supplier else None,
            "purchase_invoice": purchase.invoice_number if purchase else None
        }
        result.append(SupplierPaymentResponse(**payment_dict))

    return result


@router.post("/payments", response_model=SupplierPaymentResponse)
def create_payment(
    payment: SupplierPaymentCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Registrar un nuevo pago a proveedor (admin only)"""
    # Verificar que el proveedor existe
    supplier = db.query(Supplier).filter(Supplier.id == str(payment.supplier_id)).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # Verificar que la compra existe si se especifica
    purchase = None
    if payment.purchase_id:
        purchase = db.query(SupplierPurchase).filter(
            SupplierPurchase.id == str(payment.purchase_id)
        ).first()
        if not purchase:
            raise HTTPException(status_code=404, detail="Compra no encontrada")

        # Verificar que no se pague más de lo debido
        if float(payment.amount) > purchase.remaining_amount:
            raise HTTPException(
                status_code=400,
                detail=f"El monto del pago (${payment.amount}) excede la deuda restante (${purchase.remaining_amount})"
            )

    # Crear el pago
    db_payment = SupplierPayment(**payment.model_dump())
    db.add(db_payment)

    # Actualizar el monto pagado de la compra si aplica
    if purchase:
        purchase.paid_amount = float(purchase.paid_amount) + float(payment.amount)

        # Actualizar estado
        if purchase.paid_amount >= purchase.total_amount:
            purchase.status = PaymentStatus.PAID
        elif purchase.paid_amount > 0:
            purchase.status = PaymentStatus.PARTIAL
        else:
            purchase.status = PaymentStatus.PENDING

        # Verificar si está vencida
        if purchase.is_overdue and purchase.status != PaymentStatus.PAID:
            purchase.status = PaymentStatus.OVERDUE

    db.commit()
    db.refresh(db_payment)

    return SupplierPaymentResponse(**{
        "id": db_payment.id,
        "supplier_id": db_payment.supplier_id,
        "purchase_id": db_payment.purchase_id,
        "payment_date": db_payment.payment_date,
        "amount": db_payment.amount,
        "payment_method": db_payment.payment_method,
        "reference": db_payment.reference,
        "notes": db_payment.notes,
        "created_at": db_payment.created_at,
        "updated_at": db_payment.updated_at,
        "supplier_name": supplier.name,
        "purchase_invoice": purchase.invoice_number if purchase else None
    })


@router.delete("/payments/{payment_id}")
def delete_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar un pago (admin only)"""
    db_payment = db.query(SupplierPayment).filter(SupplierPayment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    # Si el pago está asociado a una compra, actualizar el monto pagado
    if db_payment.purchase_id:
        purchase = db.query(SupplierPurchase).filter(
            SupplierPurchase.id == db_payment.purchase_id
        ).first()
        if purchase:
            purchase.paid_amount = float(purchase.paid_amount) - float(db_payment.amount)

            # Actualizar estado
            if purchase.paid_amount >= purchase.total_amount:
                purchase.status = PaymentStatus.PAID
            elif purchase.paid_amount > 0:
                purchase.status = PaymentStatus.PARTIAL
            else:
                purchase.status = PaymentStatus.PENDING

            # Verificar si está vencida
            if purchase.is_overdue and purchase.status != PaymentStatus.PAID:
                purchase.status = PaymentStatus.OVERDUE

    db.delete(db_payment)
    db.commit()
    return {"message": "Pago eliminado"}


# ============ SUMMARY ENDPOINTS ============

@router.get("/summary/all", response_model=List[SupplierSummary])
def get_suppliers_summary(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener resumen de todos los proveedores (admin only)"""
    suppliers = db.query(Supplier).filter(Supplier.is_active == True).all()

    result = []
    for supplier in suppliers:
        purchases = db.query(SupplierPurchase).filter(
            SupplierPurchase.supplier_id == supplier.id
        ).all()

        total_amount = sum(p.total_amount for p in purchases)
        total_paid = sum(p.paid_amount for p in purchases)
        unpaid_purchases = [p for p in purchases if p.status != PaymentStatus.PAID]
        total_debt = sum(p.remaining_amount for p in unpaid_purchases)
        overdue_purchases = [p for p in unpaid_purchases if p.is_overdue]
        overdue_debt = sum(p.remaining_amount for p in overdue_purchases)

        summary = SupplierSummary(
            supplier_id=supplier.id,
            supplier_name=supplier.name,
            total_purchases=len(purchases),
            total_amount=Decimal(str(total_amount)),
            total_paid=Decimal(str(total_paid)),
            total_debt=Decimal(str(total_debt)),
            overdue_debt=Decimal(str(overdue_debt)),
            overdue_purchases=len(overdue_purchases)
        )
        result.append(summary)

    return result
