from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from uuid import UUID

from app.db.session import get_db
from app.models.workshop import Workshop, WorkshopClient, Attendance
from app.schemas.workshop import (
    WorkshopCreate, WorkshopResponse,
    WorkshopClientCreate, WorkshopClientResponse,
    AttendanceCreate, AttendanceResponse
)
from app.core.security import get_current_admin

router = APIRouter()


# ============ WORKSHOPS ============

@router.get("", response_model=List[WorkshopResponse])
def get_workshops(
    is_active: Optional[bool] = None,
    is_public: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Listar talleres"""
    query = db.query(Workshop)

    if is_active is not None:
        query = query.filter(Workshop.is_active == is_active)

    if is_public is not None:
        query = query.filter(Workshop.is_public == is_public)

    return query.order_by(Workshop.start_date.desc()).all()


@router.get("/public", response_model=List[WorkshopResponse])
def get_public_workshops(db: Session = Depends(get_db)):
    """Listar talleres publicos para el ecommerce"""
    return db.query(Workshop).filter(
        Workshop.is_active == True,
        Workshop.is_public == True
    ).order_by(Workshop.start_date.desc()).all()


@router.get("/{workshop_id}", response_model=WorkshopResponse)
def get_workshop(workshop_id: UUID, db: Session = Depends(get_db)):
    """Obtener taller por ID"""
    workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    return workshop


@router.get("/slug/{slug}", response_model=WorkshopResponse)
def get_workshop_by_slug(slug: str, db: Session = Depends(get_db)):
    """Obtener taller por slug"""
    workshop = db.query(Workshop).filter(
        Workshop.slug == slug,
        Workshop.is_public == True
    ).first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    return workshop


@router.post("", response_model=WorkshopResponse, status_code=status.HTTP_201_CREATED)
def create_workshop(
    workshop_data: WorkshopCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crear taller"""
    workshop = Workshop(**workshop_data.model_dump())
    db.add(workshop)
    db.commit()
    db.refresh(workshop)
    return workshop


@router.put("/{workshop_id}", response_model=WorkshopResponse)
def update_workshop(
    workshop_id: UUID,
    workshop_data: WorkshopCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar taller"""
    workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Taller no encontrado")

    for field, value in workshop_data.model_dump().items():
        setattr(workshop, field, value)

    db.commit()
    db.refresh(workshop)
    return workshop


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
