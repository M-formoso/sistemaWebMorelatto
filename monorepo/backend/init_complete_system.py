"""
Script completo para inicializar el sistema de e-commerce
Crea:
- Métodos de pago (MercadoPago, Stripe, Transferencia)
- Zonas de envío (CABA, GBA, Buenos Aires, Nacional)
- Tarifas de envío
- Usuario admin de prueba
"""
import sys
import os
from sqlalchemy.orm import Session

# Agregar el directorio padre al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.models import User, PaymentMethod, ShippingZone, ShippingRate
from app.core.security import get_password_hash

def init_db():
    """Crear todas las tablas"""
    print("🗄️  Creando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas exitosamente\n")

def create_admin_user(db: Session):
    """Crear usuario admin de prueba"""
    print("👤 Creando usuario admin...")

    # Verificar si ya existe
    existing = db.query(User).filter(User.email == "admin@morelatto.com").first()
    if existing:
        print("⚠️  Usuario admin ya existe\n")
        return existing

    admin = User(
        email="admin@morelatto.com",
        hashed_password=get_password_hash("admin123"),
        full_name="Admin Morelatto",
        role="admin",
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print("✅ Usuario admin creado: admin@morelatto.com / admin123\n")
    return admin

def create_payment_methods(db: Session):
    """Crear métodos de pago"""
    print("💳 Creando métodos de pago...")

    # Verificar si ya existen
    existing_count = db.query(PaymentMethod).count()
    if existing_count > 0:
        print(f"⚠️  Ya existen {existing_count} métodos de pago\n")
        return

    payment_methods = [
        {
            "name": "MercadoPago",
            "type": "mercadopago",
            "description": "Paga con tarjeta de crédito, débito o en efectivo a través de MercadoPago",
            "instructions": "Serás redirigido a MercadoPago para completar el pago de forma segura",
            "account_details": {},
            "display_order": 1,
            "is_active": True
        },
        {
            "name": "Stripe",
            "type": "stripe",
            "description": "Paga con tarjeta de crédito o débito internacional",
            "instructions": "Completa los datos de tu tarjeta de forma segura",
            "account_details": {},
            "display_order": 2,
            "is_active": False  # Desactivado hasta configurar
        },
        {
            "name": "Transferencia Bancaria",
            "type": "bank_transfer",
            "description": "Realiza una transferencia bancaria y sube el comprobante",
            "instructions": "Realiza la transferencia a la cuenta indicada y envíanos el comprobante por email",
            "account_details": {
                "bank_name": "Banco Ejemplo",
                "account_holder": "Morelatto Lanas",
                "cbu": "0000003100010000000001",
                "alias": "MORELATTO.LANAS",
                "cuit": "20-12345678-9"
            },
            "display_order": 3,
            "is_active": True
        }
    ]

    for method_data in payment_methods:
        method = PaymentMethod(**method_data)
        db.add(method)

    db.commit()
    print("✅ Métodos de pago creados:\n")
    print("   • MercadoPago (activo)")
    print("   • Stripe (inactivo)")
    print("   • Transferencia Bancaria (activo)\n")

def create_shipping_zones_and_rates(db: Session):
    """Crear zonas de envío y tarifas"""
    print("🚚 Creando zonas de envío y tarifas...")

    # Verificar si ya existen
    existing_count = db.query(ShippingZone).count()
    if existing_count > 0:
        print(f"⚠️  Ya existen {existing_count} zonas de envío\n")
        return

    zones_data = [
        {
            "zone": {
                "name": "CABA",
                "description": "Ciudad Autónoma de Buenos Aires",
                "cities": ["CABA", "Buenos Aires", "Capital Federal"],
                "provinces": ["Capital Federal", "CABA"],
                "is_active": True
            },
            "rates": [
                {
                    "min_weight": 0.0,
                    "max_weight": 99999.0,  # Máximo soportado por Numeric(8,3)
                    "base_cost": 1500.0,
                    "cost_per_kg": 300.0,
                    "free_shipping_threshold": 50000.0,
                    "is_active": True
                }
            ]
        },
        {
            "zone": {
                "name": "GBA",
                "description": "Gran Buenos Aires",
                "cities": ["La Matanza", "Lomas de Zamora", "Quilmes", "Morón", "San Isidro", "Vicente López"],
                "provinces": ["Buenos Aires"],
                "is_active": True
            },
            "rates": [
                {
                    "min_weight": 0.0,
                    "max_weight": 99999.0,
                    "base_cost": 2000.0,
                    "cost_per_kg": 400.0,
                    "free_shipping_threshold": 60000.0,
                    "is_active": True
                }
            ]
        },
        {
            "zone": {
                "name": "Buenos Aires Interior",
                "description": "Resto de la provincia de Buenos Aires",
                "cities": ["La Plata", "Mar del Plata", "Bahía Blanca", "Tandil"],
                "provinces": ["Buenos Aires"],
                "is_active": True
            },
            "rates": [
                {
                    "min_weight": 0.0,
                    "max_weight": 99999.0,
                    "base_cost": 2500.0,
                    "cost_per_kg": 500.0,
                    "free_shipping_threshold": 70000.0,
                    "is_active": True
                }
            ]
        },
        {
            "zone": {
                "name": "Resto del País",
                "description": "Todas las demás provincias",
                "cities": [],
                "provinces": ["Córdoba", "Santa Fe", "Mendoza", "Tucumán", "Entre Ríos", "Corrientes", "Misiones"],
                "is_active": True
            },
            "rates": [
                {
                    "min_weight": 0.0,
                    "max_weight": 99999.0,
                    "base_cost": 3500.0,
                    "cost_per_kg": 700.0,
                    "free_shipping_threshold": 80000.0,
                    "is_active": True
                }
            ]
        }
    ]

    for zone_data in zones_data:
        # Crear zona
        zone = ShippingZone(**zone_data["zone"])
        db.add(zone)
        db.flush()  # Para obtener el ID

        # Crear tarifas para esta zona
        for rate_data in zone_data["rates"]:
            rate = ShippingRate(zone_id=zone.id, **rate_data)
            db.add(rate)

        print(f"   ✓ {zone.name}")

    db.commit()
    print("\n✅ Zonas de envío y tarifas creadas\n")

def main():
    print("=" * 60)
    print("🚀 INICIALIZACIÓN COMPLETA DEL SISTEMA MORELATTO")
    print("=" * 60)
    print()

    # Crear tablas
    init_db()

    # Crear sesión de BD
    db = SessionLocal()

    try:
        # Crear usuario admin
        create_admin_user(db)

        # Crear métodos de pago
        create_payment_methods(db)

        # Crear zonas y tarifas de envío
        create_shipping_zones_and_rates(db)

        print("=" * 60)
        print("✅ SISTEMA INICIALIZADO CORRECTAMENTE")
        print("=" * 60)
        print()
        print("📝 RESUMEN:")
        print()
        print("🔐 Usuario Admin:")
        print("   Email: admin@morelatto.com")
        print("   Contraseña: admin123")
        print()
        print("💳 Métodos de Pago:")
        print("   • MercadoPago (activo)")
        print("   • Stripe (inactivo - configurar credenciales)")
        print("   • Transferencia Bancaria (activo)")
        print()
        print("🚚 Zonas de Envío:")
        print("   • CABA - Envío gratis desde $50.000")
        print("   • GBA - Envío gratis desde $60.000")
        print("   • Buenos Aires Interior - Envío gratis desde $70.000")
        print("   • Resto del País - Envío gratis desde $80.000")
        print()
        print("🎯 PRÓXIMOS PASOS:")
        print()
        print("1. Iniciar el backend:")
        print("   uvicorn app.main:app --reload")
        print()
        print("2. Verificar que MercadoPago está configurado:")
        print("   curl http://localhost:8000/api/payments/config")
        print()
        print("3. Crear algunos productos desde el panel admin")
        print()
        print("4. Probar el flujo de compra completo")
        print()
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
