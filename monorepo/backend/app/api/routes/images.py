from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, field_serializer
from datetime import datetime

from app.db.session import get_db
from app.models.product import Product, ProductImage
from app.models.workshop import Workshop, WorkshopImage
from app.models.content import News, NewsImage
from app.schemas.product import ProductImageResponse, ProductImageCreate, ProductImageUpdate
from app.services.image_service import ImageService
from app.core.security import get_current_admin

router = APIRouter()


# Generic Image Response Schema
class ImageResponse(BaseModel):
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


@router.post("/upload", response_model=dict)
async def upload_single_image(
    file: UploadFile = File(...),
    _: dict = Depends(get_current_admin)
):
    """Subir una imagen (retorna URL)"""
    image_url = await ImageService.upload_image(file)
    return {"image_url": image_url}


@router.post("/upload/multiple", response_model=dict)
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    _: dict = Depends(get_current_admin)
):
    """Subir multiples imagenes"""
    image_urls = await ImageService.upload_multiple_images(files)
    return {"image_urls": image_urls}


@router.post("/products/{product_id}/images", response_model=ProductImageResponse)
async def add_product_image(
    product_id: UUID,
    image_data: ProductImageCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Agregar imagen a un producto"""
    # Verificar que el producto existe
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Si es imagen principal, desmarcar las otras
    if image_data.is_primary:
        db.query(ProductImage).filter(
            ProductImage.product_id == product_id,
            ProductImage.is_primary == True
        ).update({"is_primary": False})

    # Crear imagen
    image = ProductImage(
        product_id=product_id,
        **image_data.model_dump()
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return image


@router.get("/products/{product_id}/images", response_model=List[ProductImageResponse])
def get_product_images(
    product_id: UUID,
    db: Session = Depends(get_db)
):
    """Obtener todas las imagenes de un producto"""
    images = db.query(ProductImage).filter(
        ProductImage.product_id == product_id
    ).order_by(ProductImage.display_order).all()

    return images


@router.patch("/products/images/{image_id}", response_model=ProductImageResponse)
def update_product_image(
    image_id: UUID,
    image_data: ProductImageUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar imagen de producto"""
    image = db.query(ProductImage).filter(ProductImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    # Si se marca como principal, desmarcar las otras del mismo producto
    if image_data.is_primary:
        db.query(ProductImage).filter(
            ProductImage.product_id == image.product_id,
            ProductImage.id != image_id,
            ProductImage.is_primary == True
        ).update({"is_primary": False})

    # Actualizar
    update_data = image_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(image, field, value)

    db.commit()
    db.refresh(image)

    return image


@router.delete("/products/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_image(
    image_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar imagen de producto"""
    image = db.query(ProductImage).filter(ProductImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    # Eliminar archivo del filesystem
    ImageService.delete_image(image.image_url)

    # Eliminar registro de BD
    db.delete(image)
    db.commit()


@router.post("/products/{product_id}/images/set-primary/{image_id}", response_model=ProductImageResponse)
def set_primary_image(
    product_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Marcar una imagen como principal"""
    # Verificar que la imagen existe y pertenece al producto
    image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id
    ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    # Desmarcar todas las imagenes del producto
    db.query(ProductImage).filter(
        ProductImage.product_id == product_id
    ).update({"is_primary": False})

    # Marcar esta como principal
    image.is_primary = True
    db.commit()
    db.refresh(image)

    return image


@router.patch("/products/{product_id}/images/reorder", response_model=List[ProductImageResponse])
def reorder_images(
    product_id: UUID,
    image_orders: List[dict],  # [{"id": "uuid", "display_order": 0}, ...]
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Reordenar imagenes de un producto"""
    # Verificar que el producto existe
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Actualizar orden de cada imagen
    for item in image_orders:
        db.query(ProductImage).filter(
            ProductImage.id == item["id"],
            ProductImage.product_id == product_id
        ).update({"display_order": item["display_order"]})

    db.commit()

    # Retornar imagenes actualizadas
    images = db.query(ProductImage).filter(
        ProductImage.product_id == product_id
    ).order_by(ProductImage.display_order).all()

    return images


# ============ WORKSHOP IMAGES ============

@router.post("/workshops/{workshop_id}/images", response_model=ImageResponse)
async def add_workshop_image(
    workshop_id: UUID,
    image_data: ProductImageCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Agregar imagen a un taller"""
    workshop = db.query(Workshop).filter(Workshop.id == workshop_id).first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Taller no encontrado")

    if image_data.is_primary:
        db.query(WorkshopImage).filter(
            WorkshopImage.workshop_id == workshop_id,
            WorkshopImage.is_primary == True
        ).update({"is_primary": False})

    image = WorkshopImage(
        workshop_id=workshop_id,
        **image_data.model_dump()
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return image


@router.get("/workshops/{workshop_id}/images", response_model=List[ImageResponse])
def get_workshop_images(
    workshop_id: UUID,
    db: Session = Depends(get_db)
):
    """Obtener todas las imagenes de un taller"""
    images = db.query(WorkshopImage).filter(
        WorkshopImage.workshop_id == workshop_id
    ).order_by(WorkshopImage.display_order).all()

    return images


@router.patch("/workshops/images/{image_id}", response_model=ImageResponse)
def update_workshop_image(
    image_id: UUID,
    image_data: ProductImageUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar imagen de taller"""
    image = db.query(WorkshopImage).filter(WorkshopImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    if image_data.is_primary:
        db.query(WorkshopImage).filter(
            WorkshopImage.workshop_id == image.workshop_id,
            WorkshopImage.id != image_id,
            WorkshopImage.is_primary == True
        ).update({"is_primary": False})

    update_data = image_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(image, field, value)

    db.commit()
    db.refresh(image)

    return image


@router.delete("/workshops/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workshop_image(
    image_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar imagen de taller"""
    image = db.query(WorkshopImage).filter(WorkshopImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    ImageService.delete_image(image.image_url)
    db.delete(image)
    db.commit()


# ============ NEWS IMAGES ============

@router.post("/news/{news_id}/images", response_model=ImageResponse)
async def add_news_image(
    news_id: UUID,
    image_data: ProductImageCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Agregar imagen a una novedad"""
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Novedad no encontrada")

    if image_data.is_primary:
        db.query(NewsImage).filter(
            NewsImage.news_id == news_id,
            NewsImage.is_primary == True
        ).update({"is_primary": False})

    image = NewsImage(
        news_id=news_id,
        **image_data.model_dump()
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return image


@router.get("/news/{news_id}/images", response_model=List[ImageResponse])
def get_news_images(
    news_id: UUID,
    db: Session = Depends(get_db)
):
    """Obtener todas las imagenes de una novedad"""
    images = db.query(NewsImage).filter(
        NewsImage.news_id == news_id
    ).order_by(NewsImage.display_order).all()

    return images


@router.patch("/news/images/{image_id}", response_model=ImageResponse)
def update_news_image(
    image_id: UUID,
    image_data: ProductImageUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Actualizar imagen de novedad"""
    image = db.query(NewsImage).filter(NewsImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    if image_data.is_primary:
        db.query(NewsImage).filter(
            NewsImage.news_id == image.news_id,
            NewsImage.id != image_id,
            NewsImage.is_primary == True
        ).update({"is_primary": False})

    update_data = image_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(image, field, value)

    db.commit()
    db.refresh(image)

    return image


@router.delete("/news/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_news_image(
    image_id: UUID,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """Eliminar imagen de novedad"""
    image = db.query(NewsImage).filter(NewsImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    ImageService.delete_image(image.image_url)
    db.delete(image)
    db.commit()
