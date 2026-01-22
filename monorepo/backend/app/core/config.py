from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://morelatto:morelatto_secret_2024@localhost:5432/morelatto_db"

    # JWT
    SECRET_KEY: str = "tu_secret_key_muy_segura_cambiar_en_produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # App
    APP_NAME: str = "Morelatto API"
    DEBUG: bool = True

    # CORS - URLs de los frontends
    FRONTEND_SISTEMA_URL: str = "http://localhost:5173"
    FRONTEND_ECOMMERCE_URL: str = "http://localhost:5174"

    # MercadoPago
    MERCADOPAGO_ACCESS_TOKEN: str = ""  # Token de producción o sandbox
    MERCADOPAGO_PUBLIC_KEY: str = ""
    MERCADOPAGO_WEBHOOK_URL: Optional[str] = None
    MERCADOPAGO_SUCCESS_URL: str = "http://localhost:5174/checkout/success"
    MERCADOPAGO_FAILURE_URL: str = "http://localhost:5174/checkout/failure"
    MERCADOPAGO_PENDING_URL: str = "http://localhost:5174/checkout/pending"

    # Stripe
    STRIPE_SECRET_KEY: str = ""  # Secret key de Stripe
    STRIPE_PUBLISHABLE_KEY: str = ""  # Publishable key de Stripe
    STRIPE_WEBHOOK_SECRET: str = ""  # Webhook signing secret

    # AFIP - Facturación Electrónica
    AFIP_CUIT: str = ""  # CUIT sin guiones (ej: 20123456789)
    AFIP_CERT_PATH: str = ""  # Ruta al certificado .crt
    AFIP_KEY_PATH: str = ""  # Ruta a la clave privada .key
    AFIP_PRODUCTION: bool = False  # False = homologación, True = producción
    AFIP_PUNTO_VENTA: int = 1  # Punto de venta habilitado en AFIP

    # PAQ.AR - Correo Argentino API
    PAQAR_API_KEY: str = ""  # API Key de PAQ.AR
    PAQAR_AGREEMENT_ID: str = ""  # ID de Acuerdo/Contrato con Correo Argentino
    PAQAR_PRODUCTION: bool = False  # False = testing, True = producción

    # Carriers - Envíos
    ANDREANI_API_KEY: str = ""
    ANDREANI_CONTRACT: str = ""
    OCA_API_KEY: str = ""
    OCA_USERNAME: str = ""
    OCA_PASSWORD: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
