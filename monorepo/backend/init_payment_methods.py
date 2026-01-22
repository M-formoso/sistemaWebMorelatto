"""
Script para inicializar los métodos de pago en la base de datos
"""
import requests
import json

BASE_URL = "http://localhost:8000"  # Puerto por defecto de la API

# Nota: Este endpoint requiere autenticación de admin
# Por ahora lo haremos sin autenticación para testing
# En producción deberías usar un token de admin

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
        "is_active": False  # Desactivado por defecto hasta configurar Stripe
    },
    {
        "name": "Transferencia Bancaria",
        "type": "bank_transfer",
        "description": "Realiza una transferencia bancaria y sube el comprobante",
        "instructions": "Realiza la transferencia a la cuenta indicada y sube el comprobante para que podamos verificarlo",
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

print("Creando métodos de pago...")
print("-" * 50)

for method in payment_methods:
    try:
        response = requests.post(
            f"{BASE_URL}/api/shipping/payment-methods",
            json=method,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 201 or response.status_code == 200:
            print(f"✅ Creado: {method['name']}")
        else:
            print(f"❌ Error al crear {method['name']}: {response.status_code}")
            print(f"   Respuesta: {response.text}")
    except Exception as e:
        print(f"❌ Error al crear {method['name']}: {str(e)}")

print("-" * 50)
print("\nVerificando métodos de pago creados:")

try:
    response = requests.get(f"{BASE_URL}/api/shipping/payment-methods")
    methods = response.json()
    print(f"\n✅ Total de métodos de pago: {len(methods)}")
    for method in methods:
        status = "✅ Activo" if method['is_active'] else "⚠️  Inactivo"
        print(f"  - {method['name']} ({method['type']}) {status}")
except Exception as e:
    print(f"❌ Error al obtener métodos: {str(e)}")
