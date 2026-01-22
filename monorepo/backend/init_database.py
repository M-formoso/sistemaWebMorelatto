"""
Script para inicializar la base de datos con datos necesarios
Ejecutar después de crear las tablas y antes de usar el sistema
"""
import sys
from pathlib import Path

# Agregar el directorio raíz al path para importar módulos
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.shipping import PaymentMethod, ShippingZone, ShippingRate
from decimal import Decimal

def init_payment_methods(db: Session):
    """Inicializar métodos de pago"""
    print("\n📦 Inicializando métodos de pago...")

    # Verificar si ya existen
    existing = db.query(PaymentMethod).count()
    if existing > 0:
        print(f"⚠️  Ya existen {existing} métodos de pago. Saltando...")
        return

    payment_methods = [
        PaymentMethod(
            name="MercadoPago",
            type="mercadopago",
            description="Paga con tarjeta de crédito, débito o en efectivo a través de MercadoPago",
            instructions="Serás redirigido a MercadoPago para completar el pago de forma segura. Aceptamos todas las tarjetas y métodos de pago disponibles en MercadoPago.",
            account_details={},
            display_order=1,
            is_active=True
        ),
        PaymentMethod(
            name="Stripe",
            type="stripe",
            description="Paga con tarjeta de crédito o débito internacional",
            instructions="Completa los datos de tu tarjeta de forma segura. Aceptamos Visa, Mastercard, American Express y más.",
            account_details={},
            display_order=2,
            is_active=False  # Desactivado por defecto hasta configurar Stripe
        ),
        PaymentMethod(
            name="Transferencia Bancaria",
            type="bank_transfer",
            description="Realiza una transferencia bancaria y sube el comprobante",
            instructions="Realiza la transferencia a la cuenta indicada y sube el comprobante. Tu pedido será procesado una vez que verifiquemos el pago (24-48hs hábiles).",
            account_details={
                "bank_name": "Banco Ejemplo",
                "account_holder": "Morelatto Lanas",
                "account_type": "Cuenta Corriente",
                "cbu": "0000003100010000000001",
                "alias": "MORELATTO.LANAS",
                "cuit": "20-12345678-9"
            },
            display_order=3,
            is_active=True
        )
    ]

    for method in payment_methods:
        db.add(method)
        print(f"✅ Creado: {method.name} ({method.type}) - {'Activo' if method.is_active else 'Inactivo'}")

    db.commit()
    print("✅ Métodos de pago inicializados")


def init_shipping_zones(db: Session):
    """Inicializar zonas y tarifas de envío"""
    print("\n🚚 Inicializando zonas de envío...")

    # Verificar si ya existen
    existing = db.query(ShippingZone).count()
    if existing > 0:
        print(f"⚠️  Ya existen {existing} zonas de envío. Saltando...")
        return

    # Zona 1: CABA
    zone_caba = ShippingZone(
        name="CABA",
        description="Ciudad Autónoma de Buenos Aires",
        provinces=["Ciudad Autónoma de Buenos Aires"],
        cities=["CABA", "Buenos Aires"],
        is_active=True
    )
    db.add(zone_caba)
    db.flush()

    # Tarifa para CABA
    rate_caba = ShippingRate(
        zone_id=zone_caba.id,
        min_weight=Decimal("0"),
        max_weight=Decimal("5"),
        base_cost=Decimal("1500"),
        cost_per_kg=Decimal("300"),
        free_shipping_threshold=Decimal("15000"),  # Envío gratis desde $15000
        is_active=True
    )
    db.add(rate_caba)
    print(f"✅ Zona creada: {zone_caba.name}")

    # Zona 2: GBA (Gran Buenos Aires)
    zone_gba = ShippingZone(
        name="GBA (Gran Buenos Aires)",
        description="Zona metropolitana de Buenos Aires",
        provinces=["Buenos Aires"],
        cities=[
            "La Matanza", "Lomas de Zamora", "Quilmes", "Lanús", "Almirante Brown",
            "Morón", "Tres de Febrero", "Avellaneda", "San Martín", "Vicente López",
            "San Isidro", "Tigre", "San Fernando", "Hurlingham", "Ituzaingó",
            "José C. Paz", "Malvinas Argentinas", "San Miguel", "Moreno", "Merlo",
            "General San Martín", "Esteban Echeverría", "Berazategui", "Florencio Varela"
        ],
        is_active=True
    )
    db.add(zone_gba)
    db.flush()

    rate_gba = ShippingRate(
        zone_id=zone_gba.id,
        min_weight=Decimal("0"),
        max_weight=Decimal("5"),
        base_cost=Decimal("2000"),
        cost_per_kg=Decimal("400"),
        free_shipping_threshold=Decimal("20000"),
        is_active=True
    )
    db.add(rate_gba)
    print(f"✅ Zona creada: {zone_gba.name}")

    # Zona 3: Buenos Aires Interior
    zone_bsas = ShippingZone(
        name="Buenos Aires Interior",
        description="Resto de la provincia de Buenos Aires",
        provinces=["Buenos Aires"],
        cities=[],  # Todas las demás ciudades
        is_active=True
    )
    db.add(zone_bsas)
    db.flush()

    rate_bsas = ShippingRate(
        zone_id=zone_bsas.id,
        min_weight=Decimal("0"),
        max_weight=Decimal("5"),
        base_cost=Decimal("2500"),
        cost_per_kg=Decimal("500"),
        free_shipping_threshold=Decimal("25000"),
        is_active=True
    )
    db.add(rate_bsas)
    print(f"✅ Zona creada: {zone_bsas.name}")

    # Zona 4: Resto del país
    zone_nacional = ShippingZone(
        name="Resto del País",
        description="Todas las demás provincias",
        provinces=[
            "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos",
            "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
            "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
            "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"
        ],
        cities=[],
        is_active=True
    )
    db.add(zone_nacional)
    db.flush()

    rate_nacional = ShippingRate(
        zone_id=zone_nacional.id,
        min_weight=Decimal("0"),
        max_weight=Decimal("5"),
        base_cost=Decimal("3500"),
        cost_per_kg=Decimal("700"),
        free_shipping_threshold=Decimal("30000"),
        is_active=True
    )
    db.add(rate_nacional)
    print(f"✅ Zona creada: {zone_nacional.name}")

    db.commit()
    print("✅ Zonas de envío y tarifas inicializadas")


def init_database():
    """Función principal de inicialización"""
    print("="*60)
    print("🚀 INICIALIZACIÓN DE BASE DE DATOS - MORELATTO LANAS")
    print("="*60)

    # Crear todas las tablas
    print("\n📋 Creando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas")

    # Crear sesión
    db = SessionLocal()

    try:
        # Inicializar datos
        init_payment_methods(db)
        init_shipping_zones(db)

        print("\n" + "="*60)
        print("✅ INICIALIZACIÓN COMPLETADA EXITOSAMENTE")
        print("="*60)
        print("\n📊 Resumen:")

        # Mostrar resumen
        payment_methods_count = db.query(PaymentMethod).count()
        shipping_zones_count = db.query(ShippingZone).count()
        shipping_rates_count = db.query(ShippingRate).count()

        print(f"   • Métodos de pago: {payment_methods_count}")
        print(f"   • Zonas de envío: {shipping_zones_count}")
        print(f"   • Tarifas de envío: {shipping_rates_count}")

        print("\n💡 Próximos pasos:")
        print("   1. Configurar credenciales de MercadoPago en .env")
        print("   2. Configurar credenciales de Stripe en .env (opcional)")
        print("   3. Ajustar datos bancarios en el método 'Transferencia Bancaria'")
        print("   4. Ajustar tarifas de envío según tus necesidades")
        print("   5. Cargar productos en el sistema")
        print("\n🔗 Endpoints disponibles:")
        print("   • Ver métodos de pago: GET /api/shipping/payment-methods")
        print("   • Ver zonas de envío: GET /api/shipping/zones")
        print("   • Calcular envío: POST /api/shipping/calculate")
        print()

    except Exception as e:
        print(f"\n❌ Error durante la inicialización: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
