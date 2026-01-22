# Configuración de Webhooks - Morelatto Lanas

## Resumen

Los webhooks permiten que las pasarelas de pago (MercadoPago y Stripe) notifiquen a tu servidor cuando ocurren eventos importantes, como pagos completados, fallidos o reembolsados.

---

## 1. MercadoPago - Configuración de Webhooks

### 1.1. Información de tu Aplicación

**Credenciales de Producción**:
- **Access Token**: `TU_ACCESS_TOKEN_AQUI`
- **Public Key**: `TU_PUBLIC_KEY_AQUI`
- **Clave de Webhook**: `TU_CLAVE_WEBHOOK_AQUI`

### 1.2. Pasos para Configurar

1. **Acceder al Panel de Desarrolladores**
   - Ir a: https://www.mercadopago.com.ar/developers/panel/app
   - Iniciar sesión con tu cuenta de MercadoPago

2. **Seleccionar tu Aplicación**
   - En el listado, selecciona tu aplicación
   - Si no tienes una, créala primero

3. **Ir a Webhooks**
   - En el menú lateral, clic en "Webhooks"
   - Clic en "Configurar notificaciones"

4. **Configurar URL de Producción**
   - **URL**: `https://api.morelattolanas.com/api/payments/webhook`
   - **Modo**: Producción
   - **Eventos a notificar**:
     - ✓ Pagos (`payment`)
     - ✓ Órdenes de Comercio (`merchant_orders`)
     - ✓ Devoluciones (`chargebacks`)

5. **Guardar Configuración**
   - Clic en "Guardar"
   - MercadoPago enviará una notificación de prueba

### 1.3. URL del Webhook

```
https://api.morelattolanas.com/api/payments/webhook
```

### 1.4. Eventos que Recibirás

El webhook recibirá notificaciones en el siguiente formato:

```json
{
  "id": 12345,
  "live_mode": true,
  "type": "payment",
  "date_created": "2025-01-07T15:00:00Z",
  "application_id": "3094669171",
  "user_id": "123456789",
  "version": 1,
  "api_version": "v1",
  "action": "payment.created",
  "data": {
    "id": "1234567890"
  }
}
```

### 1.5. Cómo Funciona el Webhook en tu Backend

Cuando MercadoPago envía una notificación:

1. Tu backend recibe el POST en `/api/payments/webhook`
2. Extrae el `data.id` del pago
3. Hace una petición a la API de MercadoPago para obtener los detalles completos del pago
4. Actualiza el estado de la orden según el estado del pago:
   - `approved` → Orden pagada
   - `rejected` → Pago rechazado
   - `pending` → Pago pendiente
5. Guarda la información en la base de datos

### 1.6. Probar el Webhook Localmente (Desarrollo)

Si quieres probar el webhook en tu máquina local:

```bash
# Instalar ngrok
brew install ngrok  # Mac
# O descargar de https://ngrok.com

# Exponer puerto 8000
ngrok http 8000

# Copiar la URL generada (ej: https://abc123.ngrok.io)
# Configurar en MercadoPago: https://abc123.ngrok.io/api/payments/webhook
```

### 1.7. Verificar que el Webhook Funciona

```bash
# Ver logs del webhook en tiempo real
docker compose -f docker-compose.production.yml logs -f api | grep webhook

# Realizar una compra de prueba
# Deberías ver logs como:
# INFO: Webhook recibido de MercadoPago - Tipo: payment, ID: 1234567890
# INFO: Pago procesado - Order ID: abc-123, Status: approved
```

---

## 2. Stripe - Configuración de Webhooks

### 2.1. Credenciales de Stripe

**IMPORTANTE**: Necesitas configurar tus credenciales de Stripe en `.env`:

```bash
STRIPE_SECRET_KEY=TU_STRIPE_SECRET_KEY_AQUI
STRIPE_PUBLISHABLE_KEY=TU_STRIPE_PUBLISHABLE_KEY_AQUI
STRIPE_WEBHOOK_SECRET=TU_WEBHOOK_SECRET_AQUI
```

### 2.2. Pasos para Configurar

1. **Acceder al Dashboard de Stripe**
   - Ir a: https://dashboard.stripe.com/webhooks
   - Iniciar sesión

2. **Agregar Endpoint**
   - Clic en "+ Add endpoint"
   - **URL del endpoint**: `https://api.morelattolanas.com/api/payments/stripe/webhook`
   - **Descripción**: Morelatto Lanas - Notificaciones de Pago

3. **Seleccionar Eventos**
   - Clic en "Select events"
   - Buscar y seleccionar:
     - ✓ `payment_intent.succeeded` (pago exitoso)
     - ✓ `payment_intent.payment_failed` (pago fallido)
     - ✓ `payment_intent.canceled` (pago cancelado)
     - ✓ `charge.refunded` (reembolso)
     - ✓ `charge.dispute.created` (disputa iniciada)

4. **Obtener Signing Secret**
   - Después de crear el endpoint, copia el "Signing secret"
   - Debería verse así: `whsec_xxxxxxxxxxxxxxxxxxxxx`

5. **Actualizar .env en el Servidor**
   ```bash
   # Conectarse al servidor
   ssh root@137.184.91.207

   # Editar .env
   cd /opt/apps/morelatto/backend
   nano .env

   # Agregar el signing secret
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

   # Guardar (Ctrl+O, Enter, Ctrl+X)

   # Reiniciar servicios
   docker compose -f docker-compose.production.yml restart api
   ```

### 2.3. URL del Webhook

```
https://api.morelattolanas.com/api/payments/stripe/webhook
```

### 2.4. Eventos que Recibirás

Stripe enviará eventos en este formato:

```json
{
  "id": "evt_xxxxxxxxxxxxx",
  "object": "event",
  "api_version": "2023-10-16",
  "created": 1673037843,
  "data": {
    "object": {
      "id": "pi_xxxxxxxxxxxxx",
      "object": "payment_intent",
      "amount": 150000,
      "currency": "ars",
      "status": "succeeded"
    }
  },
  "type": "payment_intent.succeeded"
}
```

### 2.5. Cómo Funciona el Webhook en tu Backend

Cuando Stripe envía una notificación:

1. Tu backend recibe el POST en `/api/payments/stripe/webhook`
2. **Verifica la firma** del webhook usando `STRIPE_WEBHOOK_SECRET` (seguridad)
3. Extrae el evento y el `payment_intent`
4. Busca la orden asociada al `payment_intent`
5. Actualiza el estado de la orden:
   - `succeeded` → Orden pagada
   - `payment_failed` → Pago fallido
   - `canceled` → Pago cancelado
   - `refunded` → Reembolso procesado
6. Guarda en la base de datos

### 2.6. Probar el Webhook

Stripe te permite enviar eventos de prueba:

1. En https://dashboard.stripe.com/webhooks
2. Clic en tu endpoint
3. Clic en "Send test webhook"
4. Seleccionar evento: `payment_intent.succeeded`
5. Clic en "Send test webhook"
6. Verificar logs en el servidor

```bash
# Ver logs
docker compose -f docker-compose.production.yml logs -f api | grep stripe
```

---

## 3. Seguridad de Webhooks

### 3.1. MercadoPago

MercadoPago no envía firma en los webhooks, por eso:
- Tu backend hace una segunda petición a la API de MercadoPago para verificar el pago
- Usa el `Access Token` para autenticarse
- Solo confía en los datos obtenidos directamente de la API

### 3.2. Stripe

Stripe envía una firma en el header `stripe-signature`:
- Tu backend **verifica la firma** antes de procesar el evento
- Si la firma no coincide, rechaza el webhook
- Esto previene que alguien envíe webhooks falsos

**IMPORTANTE**: Nunca compartas tu `STRIPE_WEBHOOK_SECRET`

---

## 4. Monitoreo de Webhooks

### 4.1. Ver Logs de Webhooks

```bash
# Logs de MercadoPago
docker compose -f docker-compose.production.yml logs -f api | grep "mercadopago\|webhook"

# Logs de Stripe
docker compose -f docker-compose.production.yml logs -f api | grep "stripe"

# Todos los webhooks
docker compose -f docker-compose.production.yml logs -f api | grep webhook
```

### 4.2. Verificar en los Paneles

**MercadoPago**:
- Ir a: https://www.mercadopago.com.ar/developers/panel/webhooks
- Ver historial de notificaciones enviadas
- Ver respuestas de tu servidor

**Stripe**:
- Ir a: https://dashboard.stripe.com/webhooks
- Clic en tu endpoint
- Ver "Recent events" para ver qué eventos se enviaron
- Ver respuestas y errores

### 4.3. Debugging

Si los webhooks no llegan:

```bash
# 1. Verificar que el servicio esté corriendo
docker compose -f docker-compose.production.yml ps

# 2. Verificar logs de Nginx
docker compose -f docker-compose.production.yml logs nginx | grep webhook

# 3. Verificar firewall
ufw status

# 4. Probar endpoint manualmente
curl -X POST https://api.morelattolanas.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 5. Ver respuesta
# Debería retornar: {"status": "received"}
```

---

## 5. Flujo Completo de Pago con Webhooks

### Ejemplo: Pago con MercadoPago

```
1. Cliente crea orden
   POST /api/orders
   → Backend crea orden con status: "pending"

2. Cliente inicia pago
   POST /api/payments/preference
   → Backend crea preferencia de MercadoPago
   → Retorna init_point

3. Cliente es redirigido a MercadoPago
   → Cliente paga con tarjeta/efectivo/etc

4. MercadoPago procesa el pago
   → Cliente es redirigido a success_url

5. MercadoPago envía webhook
   POST https://api.morelattolanas.com/api/payments/webhook
   → Backend recibe notificación
   → Busca orden
   → Actualiza estado a "paid"
   → Guarda información del pago

6. Cliente ve confirmación
   → Frontend muestra orden pagada
```

### Ejemplo: Pago con Stripe

```
1. Cliente crea orden
   POST /api/orders
   → Backend crea orden con status: "pending"

2. Cliente inicia pago
   POST /api/payments/stripe/create-payment-intent
   → Backend crea PaymentIntent
   → Retorna client_secret

3. Frontend procesa pago
   → Stripe.js confirma el pago con tarjeta
   → Cliente ve confirmación en el frontend

4. Stripe envía webhook
   POST https://api.morelattolanas.com/api/payments/stripe/webhook
   → Backend recibe evento "payment_intent.succeeded"
   → Verifica firma del webhook
   → Busca orden
   → Actualiza estado a "paid"
   → Guarda información del pago

5. Orden actualizada
   → Sistema puede procesar el envío
```

---

## 6. Testing de Webhooks

### 6.1. Probar MercadoPago

```bash
# Realizar compra de prueba
curl -X POST https://api.morelattolanas.com/api/payments/preference \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "test-order-123",
    "items": [{
      "title": "Producto de prueba",
      "quantity": 1,
      "unit_price": 100.00,
      "currency_id": "ARS"
    }],
    "payer": {
      "name": "Test",
      "surname": "User",
      "email": "test@example.com"
    }
  }'

# Usar tarjeta de prueba:
# Número: 5031 7557 3453 0604
# CVV: 123
# Fecha: 11/25
```

### 6.2. Probar Stripe

Stripe te permite enviar eventos de prueba directamente desde el dashboard:

1. Ir a: https://dashboard.stripe.com/webhooks
2. Clic en tu endpoint
3. Clic en "Send test webhook"
4. Seleccionar evento de prueba
5. Ver respuesta del servidor

---

## 7. Troubleshooting

### Problema: MercadoPago no envía webhooks

**Soluciones**:
1. Verificar que la URL esté configurada correctamente en el panel
2. Verificar que el webhook esté en modo "Producción"
3. Verificar logs del servidor: `docker compose logs -f api`
4. Verificar que el puerto 443 esté abierto: `ufw status`
5. Probar manualmente con cURL

### Problema: Stripe webhook falla con "Invalid signature"

**Soluciones**:
1. Verificar que `STRIPE_WEBHOOK_SECRET` esté configurado en `.env`
2. Verificar que sea el secret correcto del endpoint
3. Reiniciar servicios después de cambiar `.env`
4. Ver logs: `docker compose logs -f api | grep stripe`

### Problema: El webhook llega pero no actualiza la orden

**Soluciones**:
1. Ver logs para encontrar el error específico
2. Verificar que la orden exista en la base de datos
3. Verificar que el `order_id` esté asociado al pago
4. Verificar conexión a la base de datos

---

## 8. Variables de Entorno Necesarias

### En .env.production:

```bash
# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=TU_ACCESS_TOKEN_AQUI
MERCADOPAGO_PUBLIC_KEY=TU_PUBLIC_KEY_AQUI
MERCADOPAGO_WEBHOOK_URL=https://api.morelattolanas.com/api/payments/webhook
MERCADOPAGO_SUCCESS_URL=https://morelattolanas.com/checkout/success
MERCADOPAGO_FAILURE_URL=https://morelattolanas.com/checkout/failure
MERCADOPAGO_PENDING_URL=https://morelattolanas.com/checkout/pending

# Stripe
STRIPE_SECRET_KEY=TU_STRIPE_SECRET_KEY_AQUI
STRIPE_PUBLISHABLE_KEY=TU_STRIPE_PUBLISHABLE_KEY_AQUI
STRIPE_WEBHOOK_SECRET=TU_WEBHOOK_SECRET_AQUI
```

---

## 9. Checklist de Configuración

Antes de considerar los webhooks completamente configurados:

- [ ] ✓ URLs de webhook configuradas en MercadoPago
- [ ] ✓ URLs de webhook configuradas en Stripe
- [ ] ✓ Variables de entorno configuradas en `.env`
- [ ] ✓ Certificado SSL activo y funcionando
- [ ] ✓ Puerto 443 abierto en firewall
- [ ] ✓ Webhook de MercadoPago probado con compra real/test
- [ ] ✓ Webhook de Stripe probado con evento de prueba
- [ ] ✓ Logs monitoreados y funcionando correctamente
- [ ] ✓ Órdenes se actualizan correctamente al recibir webhooks

---

**¡Listo! Tus webhooks deberían estar completamente configurados y funcionando.**

Si tienes problemas, revisa los logs y la sección de troubleshooting.
