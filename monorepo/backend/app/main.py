from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_SISTEMA_URL,
        settings.FRONTEND_ECOMMERCE_URL,
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas
app.include_router(api_router, prefix="/api")


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
