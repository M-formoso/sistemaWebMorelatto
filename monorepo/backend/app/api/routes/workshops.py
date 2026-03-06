from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.db.session import get_db
from app.models.workshop import (
    Workshop, WorkshopClient, Attendance,
    WorkshopProject, ProjectPurchase
)
from app.models.finance import PaymentInstallment
from app.models.product import Product
from app.schemas.workshop import (
    WorkshopCreate, WorkshopUpdate, WorkshopResponse,
    WorkshopClientCreate, WorkshopClientResponse,
    AttendanceCreate, AttendanceResponse,
    WorkshopProjectCreate, WorkshopProjectUpdate, WorkshopProjectResponse,
    ProjectPurchaseCreate, ProjectPurchaseResponse,
    PaymentInstallmentCreate, PaymentInstallmentUpdate, PaymentInstallmentResponse
)
from app.core.security import get_current_admin

router = APIRouter()


# ============ WORKSHOPS ============

def workshop_to_dict(workshop: Workshop) -> dict:
    """Convierte un workshop a dict con campos adicionales para frontend"""
    data = {
        "id": workshop.id,
        "title": workshop.title or workshop.name,
        "name": workshop.name or workshop.title,
        "slug": workshop.slug,
        "description": workshop.description,
        "content": workshop.content,
        "date": workshop.date or workshop.start_date,
        "start_date": workshop.start_date,
        "end_date": workshop.end_date,
        "duration_hours": workshop.duration_hours,
        "location": workshop.location,
        "materials_included": workshop.materials_included,
        "price": workshop.price,
        "installments_allowed": workshop.installments_allowed,
        "product_discount": workshop.product_discount,
        "max_participants": workshop.max_participants,
        "current_participants": workshop.current_participants,
        "enrolled_count": workshop.current_participants,  # Alias para frontend
        "is_active": workshop.is_active,
        "is_public": workshop.is_public,
        "image_url": workshop.image_url,
        "created_at": workshop.created_at,
        "images": workshop.images if hasattr(workshop, 'images') else []
    }
    return data


@router.get("")
def get_workshops(
    is_active: Optional[bool] = None,
    is_public: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Listar talleres"""
    query = db.query(Workshop).options(joinedload(Workshop.images))

    if is_active is not None:
        query = query.filter(Workshop.is_active == is_active)

    if is_public is not None:
        query = query.filter(Workshop.is_public == is_public)

    workshops = query.order_by(Workshop.start_date.desc().nulls_last()).all()
    return [workshop_to_dict(w) for w in workshops]


@router.get("/public")
def get_public_workshops(db: Session = Depends(get_db)):
    """Listar talleres publicos para el ecommerce"""
    workshops = db.query(Workshop).options(joinedload(Workshop.images)).filter(
        Workshop.is_active == True,
        Workshop.is_public == True
    ).order_by(Workshop.start_date.desc().nulls_last()).all()
    return [workshop_to_dict(w) for w in workshops]


@router.get("/{workshop_id}")
def get_workshop(workshop_id: UUID, db: Session = Depends(get_db)):
    """Obtener taller por ID"""
    workshop = db.query(Workshop).options(joinedload(Workshop.images)).filter(Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    return workshop_to_dict(workshop)


@router.get("/slug/{slug}")
def get_workshop_by_slug(slug: str, db: Session = Depends(get_db)):
    """Obtener taller por slug"""
    workshop = db.query(Workshop).options(joinedload(Workshop.images)).filter(
        Workshop.slug == slug,
        Workshop.is_public == True
    ).first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    return workshop_to_dict(workshop)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_workshop(
    workshop_data: WorkshopCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crear taller"""
    data = workshop_data.model_dump(exclude_none=True)

    # Si viene 'date' pero no 'start_date', copiar la fecha
    if 'date' in data and 'start_date' not in data:
        if isinstance(data['date'], datetime):
            data['start_date'] = data['date'].date()

    workshop = Workshop(**data)
    db.add(workshop)
    db.commit()
    db.refresh(workshop)
    return workshop_to_dict(workshop)


@router.put("/{workshop_id}")
def update_workshop(
    workshop_id: UUID,
    workshop_data: WorkshopUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar taller"""
    workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Taller no encontrado")

    update_data = workshop_data.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in update_data.items():
        setattr(workshop, field, value)

    db.commit()
    db.refresh(workshop)
    return workshop_to_dict(workshop)


@router.delete("/{workshop_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workshop(
    workshop_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar taller"""
    workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Taller no encontrado")

    db.delete(workshop)
    db.commit()


# ============ INSCRIPCIONES ============

@router.get("/{workshop_id}/enrollments", response_model=List[WorkshopClientResponse])
def get_workshop_enrollments(
    workshop_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar inscripciones de un taller"""
    return db.query(WorkshopClient).filter(
        WorkshopClient.workshop_id == workshop_id
    ).all()


@router.post("/enrollments", response_model=WorkshopClientResponse, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    enrollment_data: WorkshopClientCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Inscribir cliente a taller"""
    # Verificar taller
    workshop = db.query(Workshop).filter(Workshop.id == enrollment_data.workshop_id).first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Taller no encontrado")

    # Verificar capacidad
    if workshop.max_participants and workshop.current_participants >= workshop.max_participants:
        raise HTTPException(status_code=400, detail="Taller completo")

    enrollment = WorkshopClient(**enrollment_data.model_dump())
    db.add(enrollment)

    # Actualizar contador
    workshop.current_participants += 1

    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/enrollments/{enrollment_id}", response_model=WorkshopClientResponse)
def get_enrollment(
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener inscripcion"""
    enrollment = db.query(WorkshopClient).filter(WorkshopClient.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscripcion no encontrada")
    return enrollment


# ============ ASISTENCIAS ============

@router.get("/enrollments/{enrollment_id}/attendances", response_model=List[AttendanceResponse])
def get_attendances(
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar asistencias de una inscripcion"""
    return db.query(Attendance).filter(
        Attendance.enrollment_id == enrollment_id
    ).order_by(Attendance.date.desc()).all()


@router.post("/attendances", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def create_attendance(
    attendance_data: AttendanceCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Registrar asistencia"""
    attendance = Attendance(**attendance_data.model_dump())
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


@router.patch("/attendances/{attendance_id}")
def update_attendance(
    attendance_id: UUID,
    attended: bool,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar asistencia"""
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")

    attendance.attended = attended
    if notes:
        attendance.notes = notes

    db.commit()
    return {"message": "Asistencia actualizada"}


# ============ PROYECTOS ============

@router.get("/enrollments/{enrollment_id}/projects", response_model=List[WorkshopProjectResponse])
def get_enrollment_projects(
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar proyectos de una inscripcion"""
    return db.query(WorkshopProject).filter(
        WorkshopProject.enrollment_id == enrollment_id
    ).order_by(WorkshopProject.created_at.desc()).all()


@router.get("/projects", response_model=List[WorkshopProjectResponse])
def get_all_projects(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar todos los proyectos"""
    return db.query(WorkshopProject).order_by(
        WorkshopProject.created_at.desc()
    ).all()


@router.get("/projects/{project_id}", response_model=WorkshopProjectResponse)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener proyecto por ID"""
    project = db.query(WorkshopProject).filter(WorkshopProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


@router.post("/projects", response_model=WorkshopProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: WorkshopProjectCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crear proyecto"""
    # Verificar que la inscripcion existe
    enrollment = db.query(WorkshopClient).filter(
        WorkshopClient.id == project_data.enrollment_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscripcion no encontrada")

    project = WorkshopProject(**project_data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/projects/{project_id}", response_model=WorkshopProjectResponse)
def update_project(
    project_id: UUID,
    project_data: WorkshopProjectUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar proyecto"""
    project = db.query(WorkshopProject).filter(WorkshopProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar proyecto"""
    project = db.query(WorkshopProject).filter(WorkshopProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    db.delete(project)
    db.commit()


# ============ COMPRAS DE PROYECTO ============

@router.get("/projects/{project_id}/purchases", response_model=List[ProjectPurchaseResponse])
def get_project_purchases(
    project_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar compras de un proyecto"""
    return db.query(ProjectPurchase).filter(
        ProjectPurchase.project_id == project_id
    ).order_by(ProjectPurchase.date.desc()).all()


@router.get("/purchases", response_model=List[ProjectPurchaseResponse])
def get_all_purchases(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar todas las compras de proyectos"""
    return db.query(ProjectPurchase).order_by(
        ProjectPurchase.date.desc()
    ).all()


@router.post("/purchases", response_model=ProjectPurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(
    purchase_data: ProjectPurchaseCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crear compra de proyecto"""
    # Verificar proyecto
    project = db.query(WorkshopProject).filter(
        WorkshopProject.id == purchase_data.project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Verificar producto
    product = db.query(Product).filter(
        Product.id == purchase_data.product_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    purchase = ProjectPurchase(**purchase_data.model_dump())
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return purchase


@router.delete("/purchases/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_purchase(
    purchase_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar compra"""
    purchase = db.query(ProjectPurchase).filter(ProjectPurchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Compra no encontrada")

    db.delete(purchase)
    db.commit()


# ============ CUOTAS DE PAGO ============

@router.get("/enrollments/{enrollment_id}/installments", response_model=List[PaymentInstallmentResponse])
def get_enrollment_installments(
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar cuotas de una inscripcion"""
    return db.query(PaymentInstallment).filter(
        PaymentInstallment.enrollment_id == enrollment_id
    ).order_by(PaymentInstallment.due_date).all()


@router.get("/installments", response_model=List[PaymentInstallmentResponse])
def get_all_installments(
    pending_only: bool = False,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Listar todas las cuotas"""
    query = db.query(PaymentInstallment)
    if pending_only:
        query = query.filter(PaymentInstallment.paid == False)
    return query.order_by(PaymentInstallment.due_date).all()


@router.post("/installments", response_model=PaymentInstallmentResponse, status_code=status.HTTP_201_CREATED)
def create_installment(
    installment_data: PaymentInstallmentCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crear cuota"""
    # Verificar inscripcion
    enrollment = db.query(WorkshopClient).filter(
        WorkshopClient.id == installment_data.enrollment_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscripcion no encontrada")

    installment = PaymentInstallment(**installment_data.model_dump())
    db.add(installment)
    db.commit()
    db.refresh(installment)
    return installment


@router.patch("/installments/{installment_id}", response_model=PaymentInstallmentResponse)
def update_installment(
    installment_id: UUID,
    installment_data: PaymentInstallmentUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar cuota"""
    installment = db.query(PaymentInstallment).filter(
        PaymentInstallment.id == installment_id
    ).first()
    if not installment:
        raise HTTPException(status_code=404, detail="Cuota no encontrada")

    update_data = installment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(installment, field, value)

    db.commit()
    db.refresh(installment)
    return installment


@router.delete("/installments/{installment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_installment(
    installment_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar cuota"""
    installment = db.query(PaymentInstallment).filter(
        PaymentInstallment.id == installment_id
    ).first()
    if not installment:
        raise HTTPException(status_code=404, detail="Cuota no encontrada")

    db.delete(installment)
    db.commit()
