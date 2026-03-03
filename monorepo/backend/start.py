#!/usr/bin/env python3
"""Script de inicio para Railway - crea tablas y ejecuta migraciones"""

import os
import subprocess
import sys

# Importar modelos a nivel de módulo (requerido para import *)
from app.db.base import Base
from app.db.session import engine
from app.models import user, product, category, order, workshop, sale, client
from app.models import shipping, news, supplier

def create_tables():
    """Crear todas las tablas en la base de datos"""
    print("1. Creando tablas en la base de datos...")
    try:
        Base.metadata.create_all(bind=engine)
        print("   Tablas creadas correctamente")
        return True
    except Exception as e:
        print(f"   Error creando tablas: {e}")
        return False

def run_migrations():
    """Ejecutar migraciones de alembic"""
    print("2. Ejecutando migraciones de alembic...")
    try:
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("   Migraciones ejecutadas correctamente")
        else:
            print(f"   Alembic salió con código {result.returncode}")
            if result.stderr:
                print(f"   Stderr: {result.stderr[:500]}")
    except Exception as e:
        print(f"   Error en migraciones: {e}")

def start_server():
    """Iniciar uvicorn"""
    print("3. Iniciando servidor uvicorn...")
    port = os.environ.get("PORT", "8000")
    os.execvp("uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", port])

def main():
    print("=== Iniciando servidor Morelatto ===")
    create_tables()
    run_migrations()
    start_server()

if __name__ == "__main__":
    main()
