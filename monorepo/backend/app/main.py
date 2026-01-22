from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pathlib import Path

from app.core.config import settings
from app.api.routes import api_router
from app.db.base import Base
from app.db.session import engine

# Importar todos los modelos para que SQLAlchemy los registre
from app.models import *  # noqa

# Crear tablas (en desarrollo - usar Alembic en produccion)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="API unificada para Sistema de Gestion y Ecommerce Morelatto",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Handler para errores de validación
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# CORS - Permitir todos los origenes en desarrollo (debe ir antes de las rutas)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todos los origenes (cambiar en produccion)
    allow_credentials=False,  # Debe ser False cuando allow_origins es "*"
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Rutas API
app.include_router(api_router, prefix="/api")

# Crear directorio de uploads si no existe
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "products").mkdir(exist_ok=True)

# Montar directorio de archivos estaticos (debe ir DESPUES de las rutas API)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    return {
        "message": "Morelatto API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
