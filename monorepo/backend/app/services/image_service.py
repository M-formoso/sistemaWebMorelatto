import os
import uuid
import shutil
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException
from PIL import Image
import io

# Cloudinary (opcional - solo si esta configurado)
try:
    import cloudinary
    import cloudinary.uploader
    CLOUDINARY_AVAILABLE = True
except ImportError:
    CLOUDINARY_AVAILABLE = False

# Directorio para almacenar imagenes (fallback local)
UPLOAD_DIR = Path("uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Configuracion
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_WIDTH = 1920
MAX_IMAGE_HEIGHT = 1920


def get_cloudinary_config():
    """Verifica si Cloudinary esta configurado"""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if cloud_name and api_key and api_secret:
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )
        return True
    return False


# Verificar si usar Cloudinary
USE_CLOUDINARY = CLOUDINARY_AVAILABLE and get_cloudinary_config()


class ImageService:
    """Servicio para manejo de imagenes de productos"""

    @staticmethod
    def validate_image(file: UploadFile) -> None:
        """Valida que el archivo sea una imagen valida"""
        # Validar extension
        file_ext = Path(file.filename or "").suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Formato no permitido. Use: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Validar que sea una imagen real
        try:
            image = Image.open(file.file)
            image.verify()
            file.file.seek(0)  # Reset file pointer
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="El archivo no es una imagen valida"
            )

    @staticmethod
    def optimize_image(image: Image.Image, max_width: int = MAX_IMAGE_WIDTH, max_height: int = MAX_IMAGE_HEIGHT) -> Image.Image:
        """Optimiza la imagen redimensionandola si es necesario"""
        # Mantener aspect ratio
        image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

        # Convertir RGBA a RGB si es necesario
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')

        return image

    @staticmethod
    async def upload_to_cloudinary(file: UploadFile) -> str:
        """Sube imagen a Cloudinary"""
        try:
            # Leer y optimizar imagen
            file_content = await file.read()
            image = Image.open(io.BytesIO(file_content))
            image = ImageService.optimize_image(image)

            # Convertir a bytes
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='JPEG', quality=85, optimize=True)
            img_byte_arr.seek(0)

            # Subir a Cloudinary
            result = cloudinary.uploader.upload(
                img_byte_arr,
                folder="morelatto/products",
                resource_type="image",
                transformation=[
                    {"width": MAX_IMAGE_WIDTH, "height": MAX_IMAGE_HEIGHT, "crop": "limit"}
                ]
            )

            return result["secure_url"]

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error al subir imagen a Cloudinary: {str(e)}"
            )

    @staticmethod
    async def upload_to_local(file: UploadFile, optimize: bool = True) -> str:
        """Sube imagen al filesystem local"""
        # Generar nombre unico
        file_ext = Path(file.filename or "").suffix.lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename

        try:
            if optimize:
                # Optimizar imagen
                image = Image.open(file.file)
                image = ImageService.optimize_image(image)

                # Guardar imagen optimizada
                image.save(file_path, "JPEG", quality=85, optimize=True)
            else:
                # Guardar sin optimizar
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)

            # Retornar URL relativa
            return f"/uploads/products/{unique_filename}"

        except Exception as e:
            # Limpiar archivo si hubo error
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=500,
                detail=f"Error al subir imagen: {str(e)}"
            )

    @staticmethod
    async def upload_image(file: UploadFile, optimize: bool = True) -> str:
        """
        Sube una imagen y retorna la URL
        Usa Cloudinary si esta configurado, sino filesystem local

        Args:
            file: Archivo a subir
            optimize: Si debe optimizar la imagen

        Returns:
            URL de la imagen subida
        """
        # Validar imagen
        ImageService.validate_image(file)

        if USE_CLOUDINARY:
            return await ImageService.upload_to_cloudinary(file)
        else:
            return await ImageService.upload_to_local(file, optimize)

    @staticmethod
    def delete_image(image_url: str) -> bool:
        """
        Elimina una imagen

        Args:
            image_url: URL de la imagen

        Returns:
            True si se elimino exitosamente
        """
        try:
            # Si es URL de Cloudinary, eliminar de Cloudinary
            if USE_CLOUDINARY and "cloudinary" in image_url:
                # Extraer public_id de la URL
                # URL format: https://res.cloudinary.com/{cloud}/image/upload/v123/morelatto/products/abc.jpg
                parts = image_url.split("/")
                # Obtener morelatto/products/filename sin extension
                public_id = "/".join(parts[-3:]).rsplit(".", 1)[0]
                cloudinary.uploader.destroy(public_id)
                return True
            else:
                # Eliminar de filesystem local
                filename = Path(image_url).name
                file_path = UPLOAD_DIR / filename

                if file_path.exists():
                    file_path.unlink()
                    return True
                return False
        except Exception as e:
            print(f"Error al eliminar imagen: {e}")
            return False

    @staticmethod
    async def upload_multiple_images(files: list[UploadFile]) -> list[str]:
        """
        Sube multiples imagenes

        Args:
            files: Lista de archivos a subir

        Returns:
            Lista de URLs de las imagenes subidas
        """
        uploaded_urls = []

        for file in files:
            try:
                url = await ImageService.upload_image(file)
                uploaded_urls.append(url)
            except Exception as e:
                # Si falla una, eliminar las que ya se subieron
                for url in uploaded_urls:
                    ImageService.delete_image(url)
                raise HTTPException(
                    status_code=500,
                    detail=f"Error al subir imagenes: {str(e)}"
                )

        return uploaded_urls
