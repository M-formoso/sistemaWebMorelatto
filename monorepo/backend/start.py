#!/usr/bin/env python3
"""Script de inicio para Railway - crea tablas y ejecuta migraciones"""

import os
import subprocess
import sys

def main():
    print("=== Iniciando servidor Morelatto ===")

    # 1. Crear todas las tablas
    print("1. Creando tablas en la base de datos...")
    try:
        from app.db.base import Base
        from app.db.session import engine
        from app.models import *  # noqa - importa todos los modelos

        Base.metadata.create_all(bind=engine)
        print("   Tablas creadas correctamente")
    except Exception as e:
        print(f"   Error creando tablas: {e}")
        # Continuar de todos modos, las tablas pueden ya existir

    # 2. Ejecutar migraciones de alembic (si hay)
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
            # No fallar - la migración puede ya estar aplicada o no ser necesaria
    except Exception as e:
        print(f"   Error en migraciones: {e}")

    # 3. Iniciar uvicorn
    print("3. Iniciando servidor uvicorn...")
    port = os.environ.get("PORT", "8000")
    os.execvp("uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", port])

if __name__ == "__main__":
    main()
