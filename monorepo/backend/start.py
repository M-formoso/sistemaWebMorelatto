#!/usr/bin/env python3
"""Script de inicio para Railway - crea tablas y ejecuta migraciones"""

import os
import subprocess
import sys

# Importar modelos a nivel de módulo
from app.db.base import Base
from app.db.session import engine
# Importar todos los modelos para que SQLAlchemy los registre
from app.models import (
    User, Product, ProductVariant, Category, ProductImage,
    Sale, SaleItem, Order, OrderItem, CartItem,
    Workshop, WorkshopClient, Attendance, WorkshopProject, ProjectPurchase, WorkshopImage,
    Movement, PaymentInstallment, Client,
    ShippingZone, ShippingRate, PaymentMethod,
    News, NewsImage, Supplier, SupplierPurchase, SupplierPayment
)

def create_tables():
    """Crear todas las tablas en la base de datos"""
    print("1. Creando tablas en la base de datos...")
    try:
        Base.metadata.create_all(bind=engine)
        print("   Tablas creadas/actualizadas correctamente")
        return True
    except Exception as e:
        print(f"   Error creando tablas: {e}")
        return False

def run_migrations():
    """Ejecutar migraciones de alembic"""
    print("2. Ejecutando migraciones de alembic...")
    try:
        # Primero mostrar estado actual
        print("   Verificando estado actual de migraciones...")
        current = subprocess.run(
            ["alembic", "current"],
            capture_output=True,
            text=True
        )
        print(f"   Estado actual: {current.stdout.strip() or 'Sin migraciones aplicadas'}")
        if current.stderr:
            print(f"   Info: {current.stderr[:200]}")

        # Ejecutar migraciones
        print("   Aplicando migraciones pendientes...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True
        )
        print(f"   Stdout: {result.stdout}")
        if result.returncode == 0:
            print("   Migraciones ejecutadas correctamente")
        else:
            print(f"   Alembic salió con código {result.returncode}")
            if result.stderr:
                print(f"   Stderr: {result.stderr}")
            # Intentar stamp si hay problemas con la tabla de versiones
            if "alembic_version" in result.stderr or "no such table" in result.stderr.lower():
                print("   Intentando inicializar tabla de versiones...")
                subprocess.run(["alembic", "stamp", "head"], capture_output=True)
    except Exception as e:
        print(f"   Error en migraciones: {e}")
        import traceback
        traceback.print_exc()

def start_server():
    """Iniciar uvicorn"""
    print("3. Iniciando servidor uvicorn...")
    port = os.environ.get("PORT", "8000")
    os.execvp("uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", port])

def main():
    print("=== Iniciando servidor Morelatto ===")
    print(f"    Python: {sys.version}")
    print(f"    DATABASE_URL: {os.environ.get('DATABASE_URL', 'No configurada')[:50]}...")
    create_tables()
    run_migrations()
    start_server()

if __name__ == "__main__":
    main()
