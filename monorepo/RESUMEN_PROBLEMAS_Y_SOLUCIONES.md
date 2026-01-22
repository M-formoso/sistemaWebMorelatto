# Problemas Actuales y Soluciones

## 1. Detalle de Producto No Funciona

### Problema
El ProductPage usa `usePublicProduct(id)` que llama a `/api/products/public/{id}`

### Estado
- Hook implementado correctamente ✅
- Endpoint del backend existe ✅
- Necesita verificar si el endpoint devuelve todos los campos necesarios

### Solución
Verificar que el backend devuelva:
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "price": 123.45,
  "image_url": "string",
  "stock_quantity": 10,
  "category": {
    "name": "string"
  },
  "product_variants": [
    {
      "id": "uuid",
      "color_name": "string",
      "color_code": "#hex",
      "image_url": "string",
      "stock_quantity": 5
    }
  ],
  "images": [
    {
      "id": "uuid",
      "image_url": "string",
      "is_primary": true,
      "display_order": 0,
      "alt_text": "string"
    }
  ]
}
```

---

## 2. Confirmación de Compra No Funciona

### Problema
`CheckoutForm.tsx` crea la orden y luego intenta crear preferencia de MercadoPago

### Estado Actual
- `useCreateOrder` hook implementado ✅
- `api.createOrder()` implementado ✅
- `api.createPaymentPreference()` necesita verificación ⚠️
- MercadoPago credentials configuradas ✅

### Flujo Actual en CheckoutForm.tsx:
```typescript
1. Validar formulario
2. Crear orden → POST /api/orders
3. Si método de pago es MercadoPago:
   - Crear preferencia → POST /api/payments/preference
   - Redirigir a preference.init_point
4. Sino:
   - Limpiar carrito
   - Mostrar confirmación
```

### Verificar
- Que el endpoint `/api/orders` esté funcionando
- Que el endpoint `/api/payments/preference` esté funcionando
- Que las credenciales de MercadoPago sean válidas

---

## 3. Manejo de Pedidos en Panel Admin No Funciona

### Problema
OrdersManager en el panel de ecommerce admin muestra pedidos pero no puede actualizarlos

### Estado Actual
- `useAdminOrders()` implementado ✅
- `useUpdateOrderStatus()` implementado ✅
- `api.getOrders()` implementado ✅
- `api.updateOrderStatus(id, status)` implementado ✅
- Método HTTP correcto (PATCH) ✅
- Puerto correcto (8000) ✅

### Archivo
`/apps/ecommerce/src/components/admin/OrdersManager.tsx`

### Verificar en el Backend
El endpoint debe ser:
```
PATCH /api/orders/{id}/status
Body: { "status": "processing" | "shipped" | "delivered" | "cancelled" }
```

---

## 4. Problemas con el Shared API Client

El API client está en un paquete compartido:
- Ubicación: `/packages/api-client/src/client.ts`
- Usado por: `apps/sistema` y `apps/ecommerce`

### Configuración Actual
- Puerto: 8000 ✅
- Método updateOrderStatus: PATCH ✅

### Archivos .env Necesarios

**`/apps/sistema/.env`:**
```bash
VITE_API_URL=http://localhost:8000/api
```

**`/apps/ecommerce/.env`:**
```bash
VITE_API_URL=http://localhost:8000/api
```

**`/backend/.env`:**
```bash
DATABASE_URL=postgresql://morelatto:morelatto_password@localhost:5432/morelatto
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-7875135435888656-122819-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-ad367137-6d71-46a5-827b-...
MERCADOPAGO_WEBHOOK_SECRET=tu_webhook_secret_aqui

# URLs Frontend (para CORS)
FRONTEND_URL=http://localhost:5173
ECOMMERCE_URL=http://localhost:5174
```

---

## 5. Endpoints del Backend que Necesitan Atención

### Problema con Serialización UUID
Algunos endpoints aún tienen problemas con la serialización de UUIDs cuando usan `response_model`.

### Solución Aplicada
En lugar de usar `response_model`, devolver manualmente diccionarios con UUIDs convertidos a string.

### Ejemplo (ya aplicado en shipping.py):
```python
@router.get("/zones")
def get_shipping_zones(
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    zones = db.query(ShippingZone).filter(ShippingZone.is_active == is_active).all()

    # Convertir manualmente a dict
    return [
        {
            "id": str(zone.id),
            "name": zone.name,
            # ...
        }
        for zone in zones
    ]
```

---

## 6. Checklist de Verificación

### Backend
- [ ] Backend corriendo en puerto 8000
- [ ] Base de datos inicializada (`init_complete_system.py`)
- [ ] MercadoPago configurado
- [ ] Endpoint `/api/products/public/{id}` funciona
- [ ] Endpoint `/api/orders` (POST) funciona
- [ ] Endpoint `/api/orders/{id}/status` (PATCH) funciona
- [ ] Endpoint `/api/payments/preference` (POST) funciona
- [ ] CORS permite requests desde localhost:5173 y localhost:5174

### Frontend Ecommerce
- [ ] App corriendo en puerto 5174
- [ ] `.env` configurado con API_URL correcto
- [ ] Puede cargar productos públicos
- [ ] Puede ver detalle de producto
- [ ] Puede agregar al carrito
- [ ] Puede crear orden en checkout
- [ ] MercadoPago redirige correctamente
- [ ] Panel admin puede ver órdenes
- [ ] Panel admin puede actualizar estado de órdenes

### Frontend Sistema (Panel Admin)
- [ ] App corriendo en puerto 5173
- [ ] `.env` configurado con API_URL correcto
- [ ] Login funciona
- [ ] Dashboard muestra stats
- [ ] Puede gestionar productos
- [ ] Puede gestionar ventas

---

## 7. Comandos para Iniciar el Sistema

### 1. Backend
```bash
cd "/Users/mateoformoso/TRABAJO/FREELANCER/morelatto lanas /monorepo/backend"

# Iniciar PostgreSQL
docker-compose up -d db

# Esperar 5 segundos
sleep 5

# Inicializar sistema (primera vez)
python3 init_complete_system.py

# Iniciar backend
python3 -m uvicorn app.main:app --reload --port 8000
```

### 2. Panel Admin (Sistema)
```bash
cd "/Users/mateoformoso/TRABAJO/FREELANCER/morelatto lanas /monorepo/apps/sistema"
npm run dev
```

### 3. Ecommerce
```bash
cd "/Users/mateoformoso/TRABAJO/FREELANCER/morelatto lanas /monorepo/apps/ecommerce"
npm run dev
```

---

## 8. URLs del Sistema

- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Panel Admin (Sistema): http://localhost:5173
- Ecommerce: http://localhost:5174

---

## 9. Próximos Pasos para Debugging

### Para Detalle de Producto:
```bash
# Probar el endpoint directamente
curl http://localhost:8000/api/products/public/{product-id}
```

### Para Creación de Orden:
```bash
# Probar crear orden
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test",
    "customer_email": "test@test.com",
    "customer_phone": "123456789",
    "shipping_address": "Test 123",
    "shipping_city": "CABA",
    "shipping_province": "Buenos Aires",
    "shipping_postal_code": "1000"
  }'
```

### Para Actualizar Estado de Orden:
```bash
# Probar actualizar estado (necesita token admin)
curl -X PATCH http://localhost:8000/api/orders/{order-id}/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"status": "processing"}'
```

### Para Verificar MercadoPago:
```bash
curl http://localhost:8000/api/payments/config
```

---

## 10. Logs a Revisar

Cuando algo no funciona, revisar:

1. **Backend logs**: Ver la consola donde corre `uvicorn`
2. **Frontend logs**: Abrir DevTools (F12) → Console
3. **Network requests**: DevTools → Network tab

Buscar:
- Errores 404 (endpoint no encontrado)
- Errores 500 (error del servidor)
- Errores 422 (validación fallida)
- Errores CORS
- Errores de autenticación (401, 403)
