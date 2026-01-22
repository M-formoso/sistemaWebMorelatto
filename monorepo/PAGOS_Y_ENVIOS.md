# Sistema de Pagos y Envíos - Morelatto Lanas

## Resumen

Se ha implementado un sistema completo de pagos y seguimiento de envíos con las siguientes características:

### Pasarelas de Pago
- **MercadoPago**: Para Argentina y Latinoamérica (tarjetas, efectivo, transferencias)
- **Stripe**: Para pagos internacionales con tarjeta
- **Transferencia Bancaria**: Con carga de comprobante manual

### Carriers de Envío
- **Andreani**: Integración automática con API REST
- **OCA**: Preparado para integración SOAP
- **Correo Argentino**: Integración completa con PAQ.AR API v2.0 (REST)
- **Manual**: Para envíos personalizados

---

## 1. Configuración Inicial

### 1.1. Instalar Dependencias

```bash
cd monorepo/backend
python3 -m pip install -r requirements.txt
```

### 1.2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` y completa las credenciales:

```bash
cp .env.example .env
nano .env  # O usa tu editor favorito
```

### 1.3. Obtener Credenciales

#### MercadoPago
1. Ir a https://www.mercadopago.com.ar/developers
2. Crear una aplicación
3. Copiar `ACCESS_TOKEN` y `PUBLIC_KEY`
4. Usar TEST keys para pruebas, PROD keys para producción
Public Key: TU_PUBLIC_KEY_AQUI
Access Token: TU_ACCESS_TOKEN_AQUI
webhooks clacve: TU_CLAVE_WEBHOOK_AQUI

#### Stripe
1. Ir a https://dashboard.stripe.com/apikeys
2. Crear cuenta
3. Copiar `Secret Key`, `Publishable Key` y `Webhook Secret`
4. Usar TEST mode para desarrollo

#### Andreani (Opcional)
1. Crear cuenta en https://clientes.andreani.com
2. Solicitar credenciales API al soporte
3. Obtener API Key y número de contrato

### 1.4. Aplicar Migraciones

```bash
# Opción 1: Auto-crear tablas (desarrollo)
python3 -m uvicorn app.main:app --reload

# Opción 2: Usar Alembic (producción recomendado)
alembic upgrade head
```

---

## 2. Flujo de Compra Completo

### 2.1. Crear una Orden

**Endpoint**: `POST /api/orders`

```json
{
  "customer_name": "Juan Pérez",
  "customer_email": "juan@example.com",
  "customer_phone": "+54911234567",
  "shipping_address": "Av. Libertador 1234",
  "shipping_city": "Buenos Aires",
  "shipping_postal_code": "1425",
  "notes": "Dejar con portero",
  "items": [
    {
      "product_id": "uuid-del-producto",
      "variant_id": "uuid-de-la-variante",  // Opcional
      "quantity": 2
    }
  ]
}
```

**Respuesta**:
```json
{
  "id": "order-uuid",
  "status": "pending",
  "payment_status": "pending",
  "total_amount": 1500.00,
  ...
}
```

### 2.2. Iniciar Pago

Tienes 3 opciones:

#### Opción A: Pago con MercadoPago

1. **Crear Preferencia de Pago**

**Endpoint**: `POST /api/payments/preference`

```json
{
  "order_id": "order-uuid",
  "items": [
    {
      "title": "Lana Merino x2",
      "quantity": 2,
      "unit_price": 750.00,
      "currency_id": "ARS"
    }
  ],
  "payer": {
    "name": "Juan",
    "surname": "Pérez",
    "email": "juan@example.com"
  }
}
```

**Respuesta**:
```json
{
  "preference_id": "123456-abc123",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
}
```

2. **Redirigir al Cliente**

```javascript
// Frontend
window.location.href = response.init_point;
```

3. **Webhook Automático**

MercadoPago enviará notificaciones a `/api/payments/webhook` cuando el pago se procese.

#### Opción B: Pago con Stripe

1. **Crear Payment Intent**

**Endpoint**: `POST /api/payments/stripe/create-payment-intent`

```json
{
  "order_id": "order-uuid",
  "payment_method_type": "card"
}
```

**Respuesta**:
```json
{
  "payment_intent_id": "pi_xxxxx",
  "client_secret": "pi_xxxxx_secret_xxxxx",
  "amount": 1500.00,
  "currency": "ars"
}
```

2. **Completar Pago en Frontend**

```javascript
// Frontend con Stripe.js
const stripe = Stripe('pk_test_xxxxx'); // STRIPE_PUBLISHABLE_KEY

const { error } = await stripe.confirmCardPayment(client_secret, {
  payment_method: {
    card: cardElement,
    billing_details: {
      name: 'Juan Pérez',
      email: 'juan@example.com'
    }
  }
});
```

3. **Webhook Automático**

Stripe enviará eventos a `/api/payments/stripe/webhook` cuando el pago se complete.

#### Opción C: Transferencia Bancaria

1. **Iniciar Transferencia**

**Endpoint**: `POST /api/payments/bank-transfer/initiate`

```json
{
  "order_id": "order-uuid"
}
```

**Respuesta**:
```json
{
  "order_id": "order-uuid",
  "amount": 1500.00,
  "bank_details": {
    "bank_name": "Banco Ejemplo",
    "account_holder": "Morelatto Lanas",
    "cbu": "0000003100010000000001",
    "alias": "MORELATTO.LANAS",
    "reference": "Pedido 12345678"
  },
  "instructions": "Realiza la transferencia..."
}
```

2. **Cliente Sube Comprobante**

**Endpoint**: `POST /api/payments/bank-transfer/upload-proof?order_id=order-uuid`

```bash
curl -X POST \
  "http://localhost:8000/api/payments/bank-transfer/upload-proof?order_id=order-uuid" \
  -F "proof_file=@comprobante.pdf"
```

3. **Admin Verifica Pago** (Manual)

**Endpoint**: `POST /api/payments/bank-transfer/verify/{order_id}`

```json
{
  "message": "Transferencia verificada y pago confirmado"
}
```

---

## 3. Gestión de Envíos

### 3.1. Crear Envío

Una vez que el pago está confirmado, crear el envío:

**Endpoint**: `POST /api/shipping/shipments` (Admin)

```json
{
  "order_id": "order-uuid",
  "carrier": "andreani",  // andreani, oca, correo_argentino, manual
  "weight": 0.5,  // kg
  "length": 30,   // cm
  "width": 20,
  "height": 10,
  "notes": "Frágil"
}
```

**Respuesta**:
```json
{
  "id": "shipment-uuid",
  "order_id": "order-uuid",
  "carrier": "andreani",
  "tracking_number": "AND123456789",
  "label_url": "https://etiquetas.andreani.com/...",
  "status": "label_created",
  "shipping_cost": 850.00
}
```

### 3.2. Consultar Tracking

#### Por Número de Tracking (Público)

**Endpoint**: `GET /api/shipping/tracking/{tracking_number}`

```json
{
  "tracking_number": "AND123456789",
  "carrier": "andreani",
  "status": "in_transit",
  "estimated_delivery": "2025-01-05T00:00:00",
  "events": [
    {
      "status": "Despachado",
      "description": "El envío salió del centro de distribución",
      "date": "2025-01-02T10:30:00",
      "location": "Centro CABA"
    },
    {
      "status": "En tránsito",
      "description": "El envío está en camino",
      "date": "2025-01-03T08:15:00",
      "location": "Sucursal Palermo"
    }
  ]
}
```

#### Por Order ID

**Endpoint**: `GET /api/shipping/shipments/order/{order_id}`

### 3.3. Actualizar Tracking (Manual)

**Endpoint**: `POST /api/shipping/shipments/{shipment_id}/refresh-tracking` (Admin)

Actualiza automáticamente el tracking desde el carrier.

### 3.4. Actualizar Envío Manualmente

**Endpoint**: `PUT /api/shipping/shipments/{shipment_id}` (Admin)

```json
{
  "tracking_number": "CA987654321",
  "status": "delivered",
  "actual_delivery_date": "2025-01-05T14:30:00"
}
```

---

## 4. Webhooks

### 4.1. Configurar Webhook de MercadoPago

1. Ir a https://www.mercadopago.com.ar/developers
2. Seleccionar tu aplicación
3. Ir a "Webhooks"
4. Agregar URL: `https://tu-dominio.com/api/payments/webhook`
5. Seleccionar eventos: "Pagos" y "Merchant Orders"

### 4.2. Configurar Webhook de Stripe

1. Ir a https://dashboard.stripe.com/webhooks
2. Agregar endpoint: `https://tu-dominio.com/api/payments/stripe/webhook`
3. Seleccionar eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copiar el "Signing Secret" y agregarlo a `.env` como `STRIPE_WEBHOOK_SECRET`

### 4.3. Probar Webhooks Localmente

Usa `ngrok` para exponer tu localhost:

```bash
# Instalar ngrok
brew install ngrok  # Mac
# o descargar de https://ngrok.com

# Exponer puerto 8000
ngrok http 8000

# Usar la URL generada (ej: https://abc123.ngrok.io)
# Configurar en MercadoPago/Stripe:
# https://abc123.ngrok.io/api/payments/webhook
```

---

## 5. Estados de Orden y Pago

### Estados de Pago (PaymentStatus)
- `pending`: Pago pendiente
- `approved`: Pago aprobado
- `paid`: Pago confirmado y procesado
- `failed`: Pago fallido
- `rejected`: Pago rechazado
- `refunded`: Pago reembolsado

### Estados de Orden (OrderStatus)
- `pending`: Orden creada
- `pending_payment`: Esperando pago
- `paid`: Pagada
- `payment_failed`: Pago fallido
- `confirmed`: Confirmada
- `processing`: En proceso
- `shipped`: Enviada
- `delivered`: Entregada
- `cancelled`: Cancelada

### Estados de Envío (ShipmentStatus)
- `pending`: Pendiente de despacho
- `label_created`: Etiqueta creada
- `in_transit`: En tránsito
- `out_for_delivery`: En reparto
- `delivered`: Entregado
- `failed`: Fallo en entrega
- `returned`: Devuelto

---

## 6. Endpoints Disponibles

### Pagos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/payments/config` | Config pública de MercadoPago |
| GET | `/api/payments/stripe/config` | Config pública de Stripe |
| POST | `/api/payments/preference` | Crear preferencia MercadoPago |
| POST | `/api/payments/stripe/create-payment-intent` | Crear PaymentIntent Stripe |
| POST | `/api/payments/webhook` | Webhook MercadoPago |
| POST | `/api/payments/stripe/webhook` | Webhook Stripe |
| POST | `/api/payments/bank-transfer/initiate` | Iniciar transferencia |
| POST | `/api/payments/bank-transfer/upload-proof` | Subir comprobante |
| POST | `/api/payments/bank-transfer/verify/{order_id}` | Verificar transferencia (Admin) |
| GET | `/api/payments/order/{order_id}/payment-status` | Estado de pago de orden |

### Envíos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/shipping/shipments` | Crear envío (Admin) |
| GET | `/api/shipping/shipments` | Listar envíos (Admin) |
| GET | `/api/shipping/shipments/{id}` | Obtener envío |
| GET | `/api/shipping/shipments/order/{order_id}` | Envío por orden |
| PUT | `/api/shipping/shipments/{id}` | Actualizar envío (Admin) |
| POST | `/api/shipping/shipments/{id}/refresh-tracking` | Refrescar tracking (Admin) |
| GET | `/api/shipping/tracking/{tracking_number}` | Tracking público |
| POST | `/api/shipping/calculate` | Calcular costo de envío |

### Órdenes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/orders` | Listar órdenes (Admin) |
| GET | `/api/orders/{id}` | Obtener orden |
| POST | `/api/orders` | Crear orden |
| PATCH | `/api/orders/{id}/status` | Actualizar estado (Admin) |
| POST | `/api/orders/{id}/confirm-payment` | Confirmar pago manual (Admin) |

---

## 7. Testing

### 7.1. Tarjetas de Prueba MercadoPago

```
APROBADA:
- Número: 5031 7557 3453 0604
- CVV: 123
- Fecha: 11/25

RECHAZADA:
- Número: 5031 4332 1540 6351
- CVV: 123
- Fecha: 11/25
```

### 7.2. Tarjetas de Prueba Stripe

```
APROBADA:
- Número: 4242 4242 4242 4242
- CVV: Cualquiera
- Fecha: Cualquier fecha futura

RECHAZADA (fondos insuficientes):
- Número: 4000 0000 0000 9995

REQUIERE AUTENTICACIÓN 3D:
- Número: 4000 0025 0000 3155
```

---

## 8. Próximos Pasos

### Configuración Recomendada

1. **Configurar Credenciales Reales**
   - Completar `.env` con tus keys de producción
   - Configurar webhooks en los paneles de MP y Stripe

2. **Configurar Carriers**
   - Contratar servicio con Andreani/OCA/Correo Argentino
   - Obtener credenciales API
   - Probar integración con envíos reales

3. **Personalizar Datos Bancarios**
   - Actualizar en `/api/payments/bank-transfer/initiate`
   - Agregar tus datos reales de CBU/Alias

4. **Emails de Notificación** (Opcional)
   - Implementar envío de emails al confirmar pago
   - Enviar tracking number por email

5. **Panel de Administración**
   - Crear interfaz para verificar transferencias
   - Dashboard de órdenes y envíos
   - Visualización de tracking

### Seguridad

- ✅ Los webhooks de Stripe verifican la firma automáticamente
- ✅ Las keys secretas nunca se exponen al frontend
- ⚠️ Configura HTTPS en producción
- ⚠️ Actualiza `allow_origins` en CORS para producción
- ⚠️ Habilita autenticación Admin en endpoints sensibles

---

## 9. Soporte

### Documentación Oficial

- **MercadoPago**: https://www.mercadopago.com.ar/developers/es/docs
- **Stripe**: https://stripe.com/docs
- **Andreani**: https://developers.andreani.com
- **OCA**: Contactar soporte comercial
- **Correo Argentino PAQ.AR**: Contactar soporte comercial para credenciales API

### Errores Comunes

**Error: "MercadoPago no está configurado"**
- Verificar que `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_PUBLIC_KEY` están en `.env`

**Error: "Invalid signature" (Stripe)**
- Verificar que `STRIPE_WEBHOOK_SECRET` es correcto
- Verificar que estás enviando el header `stripe-signature`

**Error al crear envío con Andreani**
- Verificar credenciales `ANDREANI_API_KEY` y `ANDREANI_CONTRACT`
- Verificar que la dirección de destino es válida
- Revisar logs del servidor para detalles

**Error al crear envío con PAQ.AR (Correo Argentino)**
- Verificar credenciales `PAQAR_API_KEY` y `PAQAR_AGREEMENT_ID`
- Verificar que `PAQAR_PRODUCTION` está en `False` para testing
- Verificar que los datos de dirección estén completos (calle, número, CP, ciudad, provincia)
- Revisar logs del servidor para detalles de la respuesta de la API

---

## 10. PAQ.AR - Correo Argentino API v2.0

### Características

La integración con PAQ.AR de Correo Argentino incluye:

- ✅ Creación automática de órdenes de envío
- ✅ Generación de etiquetas en PDF (base64)
- ✅ Tracking en tiempo real con eventos
- ✅ Cancelación de órdenes
- ✅ Búsqueda de sucursales/agencias cercanas

### Endpoints PAQ.AR

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/shipping/paqar/agencies` | Buscar sucursales de Correo Argentino (público) |
| POST | `/api/shipping/paqar/shipments/{id}/label` | Obtener etiqueta PDF (Admin) |
| POST | `/api/shipping/paqar/shipments/{id}/cancel` | Cancelar envío (Admin) |

### Ejemplo: Buscar Sucursales

```bash
# Por código postal
GET /api/shipping/paqar/agencies?postal_code=1425

# Por provincia
GET /api/shipping/paqar/agencies?province=Buenos%20Aires

# Por ciudad
GET /api/shipping/paqar/agencies?city=CABA
```

**Respuesta**:
```json
{
  "success": true,
  "total": 15,
  "agencies": [
    {
      "code": "SUC001",
      "name": "Correo Central",
      "address": "Av. Corrientes 1234",
      "city": "CABA",
      "province": "Buenos Aires",
      "postal_code": "1425",
      "phone": "011-4000-5000",
      "schedule": "Lun-Vie 9-18hs",
      "latitude": -34.603722,
      "longitude": -58.381592
    }
  ]
}
```

### Ejemplo: Obtener Etiqueta PDF

```bash
POST /api/shipping/paqar/shipments/{shipment_id}/label
Authorization: Bearer {admin_token}
```

**Respuesta**:
```json
{
  "success": true,
  "tracking_number": "CA123456789AR",
  "pdf_base64": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL..."
}
```

Para usar el PDF:
```javascript
// En el frontend
const pdfData = atob(response.pdf_base64);
const blob = new Blob([pdfData], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
window.open(url); // Abrir en nueva ventana
```

### Ejemplo: Cancelar Envío

```bash
POST /api/shipping/paqar/shipments/{shipment_id}/cancel
Authorization: Bearer {admin_token}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "Envío cancelado exitosamente",
  "tracking_number": "CA123456789AR"
}
```

### Productos y Modalidades PAQ.AR

**Productos disponibles**:
- `CP` - Clásico Prioritario (default)
- `CE` - Clásico Económico
- `EX` - Express

**Modalidades**:
- `P` - Puerta a puerta (default)
- `S` - Sucursal a sucursal
- `D` - Domicilio a sucursal

### Configuración PAQ.AR

Agregar al archivo `.env`:

```bash
# PAQ.AR - Correo Argentino
PAQAR_API_KEY=tu_api_key_aqui
PAQAR_AGREEMENT_ID=tu_agreement_id
PAQAR_PRODUCTION=False  # True para producción

# URLs automáticas según PAQAR_PRODUCTION:
# TEST: https://apitest.correoargentino.com.ar/paqar/v1/
# PROD: https://api.correoargentino.com.ar/paqar/v1/
```

---

## 11. Changelog

### v1.0.0 (2025-12-28)
- ✅ Integración completa con MercadoPago y Stripe
- ✅ Sistema de transferencias bancarias con comprobantes
- ✅ Tracking de envíos con Andreani, OCA, Correo Argentino
- ✅ Webhooks para ambas pasarelas
- ✅ Estados de orden y seguimiento completo
- ✅ Endpoints públicos y privados
- ✅ Documentación completa

### v1.1.0 (2025-12-28)
- ✅ Integración completa con PAQ.AR API v2.0 de Correo Argentino
- ✅ Creación automática de órdenes de envío con PAQ.AR
- ✅ Generación y descarga de etiquetas en PDF (base64)
- ✅ Tracking en tiempo real con eventos de PAQ.AR
- ✅ Cancelación de órdenes de envío
- ✅ Búsqueda de sucursales/agencias cercanas
- ✅ Endpoints específicos para PAQ.AR
- ✅ Soporte para múltiples productos (CP, CE, EX)
- ✅ Soporte para múltiples modalidades (Puerta-Puerta, Sucursal, etc.)
- ✅ Configuración de ambientes TEST y PRODUCCIÓN


