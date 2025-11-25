from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.models.shipping import PaymentMethod
from app.core.security import get_current_admin

router = APIRouter(prefix="/payment-methods", tags=["payment-methods"])


class PaymentMethodBase(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    is_active: bool = True


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None


class PaymentMethodResponse(PaymentMethodBase):
    id: str

    class Config:
        from_attributes = True


# ============ PUBLIC ENDPOINTS ============

@router.get("", response_model=List[PaymentMethodResponse])
def get_payment_methods(
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """Get all active payment methods (public)"""
    query = db.query(PaymentMethod)
    if is_active:
        query = query.filter(PaymentMethod.is_active == True)
    return query.all()


@router.get("/{method_id}", response_model=PaymentMethodResponse)
def get_payment_method(
    method_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific payment method"""
    method = db.query(PaymentMethod).filter(PaymentMethod.id == method_id).first()
    if not method:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")
    return method


# ============ ADMIN ENDPOINTS ============

@router.post("", response_model=PaymentMethodResponse)
def create_payment_method(
    method: PaymentMethodCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Create a new payment method (admin only)"""
    db_method = PaymentMethod(**method.model_dump())
    db.add(db_method)
    db.commit()
    db.refresh(db_method)
    return db_method


@router.put("/{method_id}", response_model=PaymentMethodResponse)
def update_payment_method(
    method_id: str,
    method: PaymentMethodUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Update a payment method (admin only)"""
    db_method = db.query(PaymentMethod).filter(PaymentMethod.id == method_id).first()
    if not db_method:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")

    update_data = method.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_method, key, value)

    db.commit()
    db.refresh(db_method)
    return db_method


@router.delete("/{method_id}")
def delete_payment_method(
    method_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Delete a payment method (admin only)"""
    db_method = db.query(PaymentMethod).filter(PaymentMethod.id == method_id).first()
    if not db_method:
        raise HTTPException(status_code=404, detail="Método de pago no encontrado")

    db.delete(db_method)
    db.commit()
    return {"message": "Método de pago eliminado"}
