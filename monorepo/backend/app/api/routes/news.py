from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel, Field, field_serializer, field_validator
from datetime import datetime, date
from uuid import UUID
import re

from app.db.session import get_db
from app.models.content import News
from app.core.security import get_current_admin

router = APIRouter(prefix="/news", tags=["news"])


class NewsImageResponse(BaseModel):
    id: UUID
    image_url: str
    is_primary: bool
    display_order: int
    alt_text: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


class NewsBase(BaseModel):
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    published_date: date
    is_active: bool = True
    card_size: Optional[str] = "medium"  # small, medium, large
    layout_type: Optional[str] = "grid"  # grid, list, featured

    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v: str) -> str:
        # No permitir URLs en el slug
        if '://' in v or v.startswith('http') or v.startswith('www.') or '/' in v:
            raise ValueError('El slug no puede ser una URL. Usa un slug simple como "mi-novedad"')
        # Solo permitir letras, números, guiones y guiones bajos (más flexible)
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('El slug solo puede contener letras, números, guiones (-) y guiones bajos (_)')
        return v


class NewsCreate(NewsBase):
    pass


class NewsUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    published_date: Optional[date] = None
    is_active: Optional[bool] = None
    card_size: Optional[str] = None
    layout_type: Optional[str] = None

    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # No permitir URLs en el slug
        if '://' in v or v.startswith('http') or v.startswith('www.') or '/' in v:
            raise ValueError('El slug no puede ser una URL completa. Usa solo la parte final como "lanas-e-hilos"')
        # Solo permitir letras, números, guiones y guiones bajos
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('El slug solo puede contener letras, números, guiones (-) y guiones bajos (_)')
        return v


class NewsResponse(BaseModel):
    id: UUID
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    published_date: date
    is_active: bool
    card_size: str = "medium"
    layout_type: str = "grid"
    images: List[NewsImageResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)

    class Config:
        from_attributes = True


# ============ PUBLIC ENDPOINTS ============

@router.get("", response_model=List[NewsResponse])
def get_news(
    is_active: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all published news (public)"""
    query = db.query(News).options(joinedload(News.images))
    if is_active:
        query = query.filter(News.is_active == True)
    return query.order_by(News.published_date.desc()).offset(skip).limit(limit).all()


@router.get("/{news_id}", response_model=NewsResponse)
def get_news_item(
    news_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific news item (public)"""
    # Primero intentar buscar por slug (más común)
    news = db.query(News).options(joinedload(News.images)).filter(News.slug == news_id).first()

    # Si no se encuentra y parece ser un UUID, intentar por ID
    if not news:
        try:
            from uuid import UUID
            # Validar que sea un UUID válido
            UUID(news_id)
            news = db.query(News).options(joinedload(News.images)).filter(News.id == news_id).first()
        except ValueError:
            # No es un UUID válido, no intentar buscar por ID
            pass

    if not news:
        raise HTTPException(status_code=404, detail="Novedad no encontrada")
    return news


# ============ ADMIN ENDPOINTS ============

@router.post("", response_model=NewsResponse)
def create_news(
    news: NewsCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Create a new news item (admin only)"""
    # Check for duplicate slug
    existing = db.query(News).filter(News.slug == news.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una novedad con ese slug")

    db_news = News(**news.model_dump())
    db.add(db_news)
    db.commit()
    db.refresh(db_news)
    return db_news


@router.put("/{news_id}", response_model=NewsResponse)
def update_news(
    news_id: str,
    news: NewsUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Update a news item (admin only)"""
    db_news = db.query(News).filter(News.id == news_id).first()
    if not db_news:
        raise HTTPException(status_code=404, detail="Novedad no encontrada")

    # Check for duplicate slug if being updated
    if news.slug and news.slug != db_news.slug:
        existing = db.query(News).filter(News.slug == news.slug).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe una novedad con ese slug")

    update_data = news.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_news, key, value)

    db.commit()
    db.refresh(db_news)
    return db_news


@router.delete("/{news_id}")
def delete_news(
    news_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Delete a news item (admin only)"""
    db_news = db.query(News).filter(News.id == news_id).first()
    if not db_news:
        raise HTTPException(status_code=404, detail="Novedad no encontrada")

    db.delete(db_news)
    db.commit()
    return {"message": "Novedad eliminada"}
