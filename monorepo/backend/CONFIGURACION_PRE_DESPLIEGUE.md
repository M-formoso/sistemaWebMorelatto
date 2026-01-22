# 🔧 Configuración Pre-Despliegue - Morelatto Lanas

Esta guía te ayudará a configurar y probar tu sistema localmente ANTES de desplegarlo a producción.

---

## 📋 Índice

1. [Configuración Local](#1-configuración-local)
2. [Inicialización de Base de Datos](#2-inicialización-de-base-datos)
3. [Testing del Sistema](#3-testing-del-sistema)
4. [Integración Frontend-Backend](#4-integración-frontend-backend)
5. [Verificación Final](#5-verificación-final)

---

## 1. Configuración Local

### 1.1. Requisitos Previos

```bash
# Verificar instalaciones
python --version  # Python 3.12+
docker --version  # Docker
docker compose version  # Docker Compose
```

### 1.2. Instalar Dependencias

```bash
cd monorepo/backend

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 1.3. Configurar Variables de Entorno Local

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env
nano .env
```

**Configuración mínima para desarrollo local**:

```bash
# Base de datos (Docker)
DATABASE_URL=postgresql://morelatto:morelatto_secret_2024@localhost:5433/morelatto_db

# Seguridad (generar con: openssl rand -hex 32)
SECRET_KEY=tu_secret_key_para_desarrollo
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# App
APP_NAME=Morelatto API
DEBUG=True  # True para desarrollo

# CORS - URLs frontend
FRONTEND_SISTEMA_URL=http://localhost:5173
FRONTEND_ECOMMERCE_URL=http://localhost:5174

# MercadoPago (SANDBOX para testing)
MERCADOPAGO_ACCESS_TOKEN=TEST-7875135435888656-122819-xxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-ad367137-6d71-46a5-xxxxx
MERCADOPAGO_SUCCESS_URL=http://localhost:5174/checkout/success
MERCADOPAGO_FAILURE_URL=http://localhost:5174/checkout/failure
MERCADOPAGO_PENDING_URL=http://localhost:5174/checkout/pending
```

### 1.4. Iniciar Base de Datos

```bash
# Iniciar PostgreSQL con Docker
docker-compose up -d db

# Verificar que está corriendo
docker-compose ps

# Debería mostrar:
# morelatto_db | Up | 5432/tcp, 0.0.0.0:5433->5432/tcp
```

---

## 2. Inicialización de Base de Datos

### 2.1. Crear Tablas e Inicializar Datos

```bash
# Ejecutar script de inicialización
python init_database.py
```

Este script:
- ✅ Crea todas las tablas
- ✅ Inicializa 3 métodos de pago (MercadoPago, Stripe, Transferencia)
- ✅ Crea 4 zonas de envío (CABA, GBA, Buenos Aires, Nacional)
- ✅ Configura tarifas de envío por zona

**Salida esperada**:

```
============================================================
🚀 INICIALIZACIÓN DE BASE DE DATOS - MORELATTO LANAS
============================================================

📋 Creando tablas en la base de datos...
✅ Tablas creadas

📦 Inicializando métodos de pago...
✅ Creado: MercadoPago (mercadopago) - Activo
✅ Creado: Stripe (stripe) - Inactivo
✅ Creado: Transferencia Bancaria (bank_transfer) - Activo
✅ Métodos de pago inicializados

🚚 Inicializando zonas de envío...
✅ Zona creada: CABA
✅ Zona creada: GBA (Gran Buenos Aires)
✅ Zona creada: Buenos Aires Interior
✅ Zona creada: Resto del País
✅ Zonas de envío y tarifas inicializadas

============================================================
✅ INICIALIZACIÓN COMPLETADA EXITOSAMENTE
============================================================

📊 Resumen:
   • Métodos de pago: 3
   • Zonas de envío: 4
   • Tarifas de envío: 4
```

### 2.2. Verificar Base de Datos

```bash
# Conectarse a PostgreSQL
docker exec -it morelatto_db psql -U morelatto -d morelatto_db

# Ver tablas
\dt

# Ver métodos de pago
SELECT name, type, is_active FROM payment_methods;

# Ver zonas de envío
SELECT name, description FROM shipping_zones;

# Salir
\q
```

### 2.3. Crear Usuario Admin (Opcional)

Si necesitas acceso al panel de administración:

```bash
# Entrar a Python interactivo
python

>>> from app.db.session import SessionLocal
>>> from app.models.user import User
>>> from app.core.security import get_password_hash
>>>
>>> db = SessionLocal()
>>>
>>> admin = User(
...     email="admin@morelatto.com",
...     hashed_password=get_password_hash("admin123"),
...     name="Admin",
...     role="admin",
...     is_active=True
... )
>>>
>>> db.add(admin)
>>> db.commit()
>>> print(f"Usuario admin creado: {admin.email}")
>>> db.close()
>>> exit()
```

---

## 3. Testing del Sistema

### 3.1. Iniciar la API

```bash
# Opción A: Con uvicorn directamente
uvicorn app.main:app --reload --port 8000

# Opción B: Con Docker Compose (completo)
docker-compose up -d
```

### 3.2. Verificar que la API Funciona

```bash
# Health check
curl http://localhost:8000/health
# Respuesta esperada: {"status":"healthy"}

# Documentación
open http://localhost:8000/docs
# O visitar en navegador: http://localhost:8000/docs
```

### 3.3. Probar Endpoints Principales

#### A. Listar Métodos de Pago

```bash
curl http://localhost:8000/api/shipping/payment-methods
```

**Respuesta esperada**:
```json
[
  {
    "id": "uuid",
    "name": "MercadoPago",
    "type": "mercadopago",
    "description": "Paga con tarjeta...",
    "is_active": true,
    ...
  },
  ...
]
```

#### B. Calcular Costo de Envío

```bash
curl -X POST http://localhost:8000/api/shipping/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "city": "CABA",
    "postal_code": "1425",
    "weight": 0.5
  }'
```

**Respuesta esperada**:
```json
{
  "zone": "CABA",
  "base_cost": 1500.00,
  "weight_cost": 150.00,
  "total_cost": 1650.00,
  "is_free": false
}
```

#### C. Listar Productos

```bash
curl http://localhost:8000/api/products
```

#### D. Crear Producto de Prueba

```bash
curl -X POST http://localhost:8000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_ADMIN" \
  -d '{
    "name": "Lana Merino Premium",
    "description": "Lana de alta calidad",
    "code": "LANA-001",
    "price": 1500.00,
    "stock": 100,
    "category_id": null,
    "is_active": true
  }'
```

### 3.4. Probar Flujo de Compra Completo

#### Paso 1: Agregar al Carrito

```bash
curl -X POST http://localhost:8000/api/orders/cart \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session-123" \
  -d '{
    "product_id": "PRODUCT_UUID_AQUI",
    "quantity": 2
  }'
```

#### Paso 2: Ver Carrito

```bash
curl http://localhost:8000/api/orders/cart \
  -H "X-Session-ID: test-session-123"
```

#### Paso 3: Crear Orden

```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session-123" \
  -d '{
    "customer_name": "Juan Pérez",
    "customer_email": "juan@example.com",
    "customer_phone": "+5491112345678",
    "shipping_address": "Av. Corrientes 1234",
    "shipping_city": "CABA",
    "shipping_postal_code": "1043",
    "payment_method": "mercadopago",
    "items": [
      {
        "product_id": "PRODUCT_UUID_AQUI",
        "quantity": 2
      }
    ]
  }'
```

**Respuesta esperada**:
```json
{
  "id": "order_uuid",
  "status": "pending",
  "payment_status": "pending",
  "total_amount": 3000.00,
  "customer_name": "Juan Pérez",
  ...
}
```

#### Paso 4: Crear Preferencia de MercadoPago

```bash
curl -X POST http://localhost:8000/api/payments/preference \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORDER_UUID_AQUI",
    "items": [{
      "title": "Lana Merino Premium x2",
      "quantity": 2,
      "unit_price": 1500.00,
      "currency_id": "ARS"
    }],
    "payer": {
      "name": "Juan",
      "surname": "Pérez",
      "email": "juan@example.com"
    }
  }'
```

**Respuesta esperada**:
```json
{
  "preference_id": "123456-abc123",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
}
```

#### Paso 5: Simular Webhook (Testing)

```bash
# Confirmar pago manualmente (solo para testing)
curl -X POST http://localhost:8000/api/orders/ORDER_UUID/confirm-payment \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 3.5. Verificar Integración de Envíos

#### Crear Envío

```bash
curl -X POST http://localhost:8000/api/shipping/shipments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "order_id": "ORDER_UUID",
    "carrier": "manual",
    "weight": 0.5,
    "length": 30,
    "width": 20,
    "height": 10
  }'
```

---

## 4. Integración Frontend-Backend

### 4.1. Verificar CORS

El backend ya está configurado para aceptar requests de:
- `http://localhost:5173` (Panel Admin/Sistema)
- `http://localhost:5174` (E-commerce)

En producción, cambiar en `.env`:
```bash
FRONTEND_SISTEMA_URL=https://admin.morelattolanas.com
FRONTEND_ECOMMERCE_URL=https://morelattolanas.com
```

### 4.2. Endpoints Clave para el Frontend

#### E-commerce (Frontend Público)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/products` | GET | Listar productos |
| `/api/products/{id}` | GET | Ver producto |
| `/api/categories` | GET | Listar categorías |
| `/api/orders/cart` | GET | Ver carrito |
| `/api/orders/cart` | POST | Agregar al carrito |
| `/api/orders` | POST | Crear orden |
| `/api/payments/preference` | POST | Crear pago MercadoPago |
| `/api/payments/config` | GET | Config pública MP |
| `/api/shipping/calculate` | POST | Calcular envío |
| `/api/shipping/payment-methods` | GET | Métodos de pago |

#### Panel Admin

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/orders` | GET | Listar órdenes | Admin |
| `/api/orders/{id}` | GET | Ver orden | Admin |
| `/api/orders/{id}/status` | PATCH | Actualizar estado | Admin |
| `/api/shipping/shipments` | POST | Crear envío | Admin |
| `/api/products` | POST | Crear producto | Admin |
| `/api/payments/bank-transfer/verify/{order_id}` | POST | Verificar transferencia | Admin |

### 4.3. Autenticación

El sistema usa JWT Bearer tokens.

**Login**:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@morelatto.com",
    "password": "admin123"
  }'
```

**Respuesta**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "admin@morelatto.com",
    "name": "Admin",
    "role": "admin"
  }
}
```

**Usar token**:
```bash
curl http://localhost:8000/api/orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 5. Verificación Final

### 5.1. Checklist Pre-Despliegue

- [ ] ✅ Base de datos inicializada correctamente
- [ ] ✅ Métodos de pago creados (3)
- [ ] ✅ Zonas de envío configuradas (4)
- [ ] ✅ Al menos 1 producto de prueba creado
- [ ] ✅ Flujo de compra completo probado
- [ ] ✅ Carrito funcionando
- [ ] ✅ Creación de órdenes funcionando
- [ ] ✅ MercadoPago integrado (sandbox)
- [ ] ✅ Cálculo de envío funcionando
- [ ] ✅ Webhooks de MercadoPago probados
- [ ] ✅ Panel admin accesible
- [ ] ✅ CORS configurado correctamente
- [ ] ✅ Documentación de API revisada (/docs)

### 5.2. Datos a Configurar Antes de Producción

#### A. Actualizar Datos Bancarios

```sql
-- Conectarse a la base de datos
UPDATE payment_methods
SET account_details = '{
  "bank_name": "Banco Real",
  "account_holder": "Morelatto Lanas SRL",
  "account_type": "Cuenta Corriente",
  "cbu": "TU_CBU_REAL",
  "alias": "TU.ALIAS.REAL",
  "cuit": "TU-CUIT-REAL"
}'
WHERE type = 'bank_transfer';
```

#### B. Ajustar Tarifas de Envío

Si las tarifas no son adecuadas:

```sql
-- Ver tarifas actuales
SELECT
  z.name as zona,
  r.min_weight,
  r.max_weight,
  r.base_cost,
  r.cost_per_kg,
  r.free_shipping_threshold
FROM shipping_rates r
JOIN shipping_zones z ON r.zone_id = z.id;

-- Actualizar tarifa (ejemplo: CABA)
UPDATE shipping_rates
SET
  base_cost = 2000.00,
  cost_per_kg = 400.00,
  free_shipping_threshold = 20000.00
WHERE zone_id IN (
  SELECT id FROM shipping_zones WHERE name = 'CABA'
);
```

#### C. Activar/Desactivar Métodos de Pago

```sql
-- Activar Stripe
UPDATE payment_methods SET is_active = true WHERE type = 'stripe';

-- Desactivar Transferencia Bancaria
UPDATE payment_methods SET is_active = false WHERE type = 'bank_transfer';
```

### 5.3. Obtener Credenciales Reales

Antes de producción, obtén:

1. **MercadoPago** (Producción)
   - Ir a: https://www.mercadopago.com.ar/developers/panel/app
   - Cambiar de "Test" a "Producción"
   - Copiar Access Token y Public Key
   - Actualizar en `.env.production`

2. **Stripe** (Opcional)
   - Ir a: https://dashboard.stripe.com/apikeys
   - Obtener keys de producción (empiezan con `sk_live_` y `pk_live_`)
   - Actualizar en `.env.production`

3. **PAQ.AR** (Opcional)
   - Contactar Correo Argentino: comercioelectronico@correoargentino.com.ar
   - Solicitar API Key y Agreement ID
   - Actualizar en `.env.production`

4. **Andreani** (Opcional)
   - Ir a: https://clientes.andreani.com
   - Solicitar credenciales API
   - Actualizar en `.env.production`

---

## 6. Comandos Útiles

### Reiniciar Todo

```bash
# Detener todo
docker-compose down

# Eliminar volúmenes (CUIDADO: borra la base de datos)
docker-compose down -v

# Iniciar de nuevo
docker-compose up -d
python init_database.py
```

### Ver Logs

```bash
# API
docker-compose logs -f api

# Base de datos
docker-compose logs -f db

# Todos
docker-compose logs -f
```

### Backup de Base de Datos

```bash
# Backup
docker exec morelatto_db pg_dump -U morelatto -d morelatto_db > backup.sql

# Restaurar
docker exec -i morelatto_db psql -U morelatto -d morelatto_db < backup.sql
```

---

## 7. Problemas Comunes

### No puedo conectarme a la base de datos

```bash
# Verificar que el contenedor está corriendo
docker ps | grep morelatto_db

# Ver logs
docker-compose logs db

# Reiniciar
docker-compose restart db
```

### Error al crear productos

Verificar que:
- El código del producto sea único
- El stock sea >= 0
- El precio sea > 0
- Si usas categoría, que exista

### Webhook de MercadoPago no funciona localmente

Usar ngrok para exponer tu localhost:

```bash
ngrok http 8000
# Usar la URL generada para configurar el webhook
```

---

## 8. Siguiente Paso

Una vez que todo funcione correctamente en local:

1. ✅ Lee [QUICK_START.md](./QUICK_START.md) para desplegar a producción
2. ✅ Usa [CHECKLIST_DESPLIEGUE.md](./CHECKLIST_DESPLIEGUE.md) durante el proceso
3. ✅ Configura webhooks según [CONFIGURACION_WEBHOOKS.md](./CONFIGURACION_WEBHOOKS.md)

---

**¡Tu sistema está listo para producción!** 🚀
