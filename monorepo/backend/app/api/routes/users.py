"""
Endpoints para gestión de usuarios del sistema
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr

from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.security import get_current_admin, get_password_hash, verify_password

router = APIRouter(prefix="/users", tags=["Usuarios"])


# ============ SCHEMAS ============

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    phone: Optional[str]
    document: Optional[str]
    role: str
    is_active: bool
    created_at: Optional[str]

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    document: Optional[str] = None
    role: str = "user"
    is_active: bool = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    document: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PasswordChange(BaseModel):
    new_password: str


class UserStats(BaseModel):
    total: int
    by_role: dict
    active: int
    inactive: int


# ============ ENDPOINTS ============

@router.get("", response_model=List[UserResponse])
def get_users(
    role: Optional[str] = Query(None, description="Filtrar por rol"),
    is_active: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    search: Optional[str] = Query(None, description="Buscar por email o nombre"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener lista de todos los usuarios (requiere admin)"""
    query = db.query(User)

    if role:
        try:
            role_enum = UserRole(role)
            query = query.filter(User.role == role_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Rol inválido: {role}")

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_term)) |
            (User.full_name.ilike(search_term))
        )

    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    return [
        UserResponse(
            id=str(u.id),
            email=u.email,
            full_name=u.full_name,
            phone=u.phone,
            document=u.document,
            role=u.role.value,
            is_active=u.is_active,
            created_at=u.created_at.isoformat() if u.created_at else None
        )
        for u in users
    ]


@router.get("/stats", response_model=UserStats)
def get_user_stats(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener estadísticas de usuarios"""
    total = db.query(User).count()
    active = db.query(User).filter(User.is_active == True).count()
    inactive = total - active

    # Contar por rol
    by_role = {}
    for role in UserRole:
        count = db.query(User).filter(User.role == role).count()
        by_role[role.value] = count

    return UserStats(
        total=total,
        by_role=by_role,
        active=active,
        inactive=inactive
    )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Obtener un usuario por ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        document=user.document,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else None
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Crear un nuevo usuario (requiere admin)"""
    # Verificar si el email ya existe
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Validar rol
    try:
        role_enum = UserRole(user_data.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Rol inválido: {user_data.role}")

    # Crear usuario
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        document=user_data.document,
        role=role_enum,
        is_active=user_data.is_active
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        document=user.document,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else None
    )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar un usuario"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Actualizar campos
    if user_data.email is not None:
        # Verificar que el email no esté en uso por otro usuario
        existing = db.query(User).filter(
            User.email == user_data.email,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está en uso")
        user.email = user_data.email

    if user_data.full_name is not None:
        user.full_name = user_data.full_name

    if user_data.phone is not None:
        user.phone = user_data.phone

    if user_data.document is not None:
        user.document = user_data.document

    if user_data.role is not None:
        try:
            user.role = UserRole(user_data.role)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Rol inválido: {user_data.role}")

    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        document=user.document,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else None
    )


@router.patch("/{user_id}/password")
def change_user_password(
    user_id: UUID,
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Cambiar contraseña de un usuario (requiere admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Contraseña actualizada exitosamente"}


@router.patch("/{user_id}/toggle-active")
def toggle_user_active(
    user_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Activar/desactivar un usuario"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.is_active = not user.is_active
    db.commit()

    return {
        "message": f"Usuario {'activado' if user.is_active else 'desactivado'}",
        "is_active": user.is_active
    }


@router.delete("/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar un usuario (requiere admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # No permitir eliminar al propio usuario admin
    # (esto se podría mejorar verificando el token)

    db.delete(user)
    db.commit()

    return {"message": "Usuario eliminado exitosamente"}


@router.get("/roles/list")
def get_available_roles(_: dict = Depends(get_current_admin)):
    """Obtener lista de roles disponibles"""
    return {
        "roles": [
            {"value": "admin", "label": "Administrador", "description": "Acceso total al sistema"},
            {"value": "empleado", "label": "Empleado", "description": "Acceso al sistema de gestión"},
            {"value": "user", "label": "Usuario", "description": "Usuario del ecommerce"}
        ]
    }
