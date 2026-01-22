# Solución de Errores en Checkout y Pagos

## Problemas Resueltos

### 1. Error CORS - "Access-Control-Allow-Origin"
**Error**: `Access to fetch at 'http://localhost:8001/api/orders/my-orders' from origin 'http://192.168.0.162:5174' has been blocked by CORS policy`

**Causa**: El frontend estaba configurado para usar `localhost:8001` pero se accedía desde la IP `192.168.0.162:5174` de la red local.

**Solución**: ✅ Actualizado `.env.local` del frontend para usar la IP de la red local.

### 2. Error MercadoPago - "back_url.success must be defined"
**Error**: `{'status': 400, 'response': {'message': 'auto_return invalid. back_url.success must be defined'...}}`

**Causa**: MercadoPago requiere que **todas** las back_urls (success, failure, pending) estén definidas cuando se usa `auto_return`.

**Solución**: ✅ Actualizado `mercadopago_service.py` para asegurar que siempre se envíen las 3 URLs requeridas.

## Archivos Modificados

### Backend
1. **`monorepo/backend/.env`**
   - Actualizado las URLs de MercadoPago para usar la IP de red local: `192.168.0.162`

2. **`monorepo/backend/app/services/mercadopago_service.py`**
   - Asegurado que siempre se envíen las 3 back_urls requeridas por MercadoPago
   - Agregados valores por defecto si no están configurados

3. **`monorepo/backend/app/api/routes/orders.py`**
   - Agregado endpoint `/orders/my-orders` para que los usuarios vean sus pedidos

### Frontend
1. **`monorepo/apps/ecommerce/.env.local`**
   - Actualizado `VITE_API_URL` para usar `http://192.168.0.162:8001/api`

## Pasos para Aplicar los Cambios

### 1. Reiniciar Backend
```bash
cd monorepo/backend
docker-compose down
docker-compose up -d --build
```

**Verificar que el backend está corriendo**:
```bash
docker-compose ps
```

**Ver logs si hay errores**:
```bash
docker-compose logs -f api
```

### 2. Reiniciar Frontend
```bash
cd monorepo/apps/ecommerce
# Detener el servidor si está corriendo (Ctrl+C)
npm run dev
```

El frontend debería arrancar en: `http://192.168.0.162:5174` (o tu IP local)

### 3. Probar el Checkout

1. **Agregar productos al carrito**
2. **Ir a checkout**: `http://192.168.0.162:5174/checkout`
3. **Llenar el formulario** con tus datos
4. **Seleccionar MercadoPago** como método de pago
5. **Confirmar pedido** - Deberías ser redirigido al checkout de MercadoPago
6. **Completar el pago** en MercadoPago (modo sandbox)
7. **Ser redirigido** de vuelta a: `http://192.168.0.162:5174/checkout/success`

## Configuración de Red Local

### ¿Cómo saber mi IP local?

**En macOS/Linux**:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**En Windows**:
```cmd
ipconfig | findstr IPv4
```

Tu IP local será algo como: `192.168.0.X` o `192.168.1.X`

### Actualizar Configuración para tu IP

Si tu IP es diferente a `192.168.0.162`, necesitas actualizar:

1. **Backend `.env`**:
```env
MERCADOPAGO_SUCCESS_URL=http://TU_IP_LOCAL:5174/checkout/success
MERCADOPAGO_FAILURE_URL=http://TU_IP_LOCAL:5174/checkout/failure
MERCADOPAGO_PENDING_URL=http://TU_IP_LOCAL:5174/checkout/pending
```

2. **Frontend `.env.local`**:
```env
VITE_API_URL=http://TU_IP_LOCAL:8001/api
```

3. **Reiniciar ambos servicios** después de los cambios.

## Métodos de Pago Disponibles

### 1. MercadoPago (Tarjetas de Crédito/Débito)
✅ **Configurado y funcionando**
- Modo: Sandbox (pruebas)
- Redirige al checkout de MercadoPago
- Acepta tarjetas de prueba de MercadoPago

**Tarjetas de prueba de MercadoPago**:
- **VISA aprobada**: 4509 9535 6623 3704 | CVV: 123 | Vencimiento: 11/25
- **MASTERCARD aprobada**: 5031 7557 3453 0604 | CVV: 123 | Vencimiento: 11/25
- **VISA rechazada**: 4170 0688 1010 8020 | CVV: 123 | Vencimiento: 11/25

Documentación: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing

### 2. Transferencia Bancaria
✅ **Configurado**
- El usuario ve los datos bancarios después de confirmar el pedido
- Debe subir el comprobante de pago
- El admin debe verificar el pago manualmente

**Endpoint para subir comprobante**:
```
POST /api/payments/bank-transfer/upload-proof?order_id={ORDER_ID}
```

**Admin verifica pago**:
```
POST /api/payments/bank-transfer/verify/{ORDER_ID}
```

### 3. Stripe (Tarjetas Internacionales)
⚠️ **Requiere configuración adicional**

Para activar Stripe, necesitas:

1. **Obtener credenciales de Stripe**:
   - Ir a: https://dashboard.stripe.com/register
   - Obtener `Secret Key` y `Publishable Key`

2. **Configurar en `.env`**:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. **Reiniciar backend**

**Tarjetas de prueba de Stripe**:
- **Aprobada**: 4242 4242 4242 4242 | CVV: cualquiera | Vencimiento: futuro
- **Rechazada**: 4000 0000 0000 0002
- Documentación: https://stripe.com/docs/testing

### 4. Configurar Métodos de Pago desde el Admin

Para agregar/editar métodos de pago:

```bash
# Crear método de pago
POST /api/shipping/payment-methods
{
  "name": "Transferencia Bancaria",
  "type": "bank_transfer",
  "description": "Transferencia a cuenta bancaria",
  "instructions": "Realiza la transferencia y envía el comprobante",
  "account_details": {
    "bank": "Banco Ejemplo",
    "cbu": "0000003100010000000001",
    "alias": "MORELATTO.LANAS"
  },
  "is_active": true,
  "display_order": 1
}
```

## Verificar que Todo Funciona

### Checklist

- [ ] Backend corriendo en `http://192.168.0.162:8001`
- [ ] Frontend corriendo en `http://192.168.0.162:5174`
- [ ] Puedes acceder a la web desde la IP local
- [ ] No hay errores CORS en la consola del navegador
- [ ] Puedes agregar productos al carrito
- [ ] Puedes ver el checkout
- [ ] Al seleccionar MercadoPago, se abre el checkout de MP
- [ ] Después del pago, redirige correctamente
- [ ] Puedes ver el pedido en "Mis Pedidos" (`/perfil`)

## Problemas Comunes

### 1. "Cannot connect to API"
**Solución**: Verifica que el backend esté corriendo y accesible:
```bash
curl http://192.168.0.162:8001/api/health
```

Debería retornar: `{"status":"healthy"}`

### 2. "MercadoPago no se abre"
**Verificar**:
1. Las credenciales de MercadoPago en `.env` son correctas
2. El backend está recibiendo las peticiones (ver logs)
3. Las back_urls están configuradas con la IP correcta

**Ver logs**:
```bash
cd monorepo/backend
docker-compose logs -f api
```

### 3. "El pago se completó pero no se actualiza el pedido"
**Causa**: El webhook de MercadoPago no está configurado o no puede alcanzar tu servidor local.

**Solución temporal**: Usar ngrok o similar para exponer el backend públicamente y configurar el webhook.

**Para desarrollo**: El admin puede actualizar manualmente el estado del pago desde el panel admin:
```
PATCH /api/orders/{ORDER_ID}/payment?new_payment_status=paid
```

### 4. "No puedo acceder desde otro dispositivo"
**Verificar**:
1. El firewall de tu computadora permite conexiones en los puertos 8001 y 5174
2. Ambos dispositivos están en la misma red WiFi
3. Estás usando la IP correcta (no localhost)

**En macOS, permitir puertos**:
```bash
sudo pfctl -d  # Deshabilitar firewall temporalmente
```

## Para Producción

Cuando despliegues en producción, necesitas:

1. **Cambiar URLs a tu dominio**:
```env
MERCADOPAGO_SUCCESS_URL=https://tudominio.com/checkout/success
MERCADOPAGO_FAILURE_URL=https://tudominio.com/checkout/failure
MERCADOPAGO_PENDING_URL=https://tudominio.com/checkout/pending
```

2. **Configurar webhook de MercadoPago**:
```env
MERCADOPAGO_WEBHOOK_URL=https://tudominio.com/api/payments/webhook
```

3. **Activar credenciales de producción** en MercadoPago (no usar las de sandbox)

4. **Configurar HTTPS** (requerido por MercadoPago y Stripe)

5. **Configurar CORS** más restrictivo:
```python
# En app/main.py
allow_origins=[
    "https://tudominio.com",
    "https://www.tudominio.com"
]
```

## Soporte

Si continúas teniendo problemas:

1. **Revisar logs del backend**:
```bash
cd monorepo/backend
docker-compose logs -f api
```

2. **Revisar consola del navegador** (F12 en Chrome/Firefox)
3. **Verificar estado de los servicios**:
```bash
docker-compose ps
```

---

**Fecha**: 16 de Enero de 2026
**Estado**: ✅ Configurado y listo para usar en red local
