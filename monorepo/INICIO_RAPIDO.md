# 🚀 Inicio Rápido - Sistema Morelatto

## ⚠️ Problemas Comunes y Soluciones

### 1. Error al actualizar estado de pedidos

**Error:** `PUT http://localhost:8001/api/orders/.../status 405 (Method Not Allowed)`

**Solución:** ✅ Ya corregido
- Puerto actualizado de 8001 a 8000
- Método cambiado de PUT a PATCH

---

### 2. MercadoPago no funciona

**Causa:** No hay métodos de pago en la base de datos

**Solución:** Ejecutar el script de inicialización

---

### 3. No puedo crear pedidos

**Causa:** Falta inicializar zonas de envío y métodos de pago

**Solución:** Ver sección "Inicialización" abajo

---

## 🎯 Inicialización del Sistema (HACER PRIMERO)

### Paso 1: Iniciar Base de Datos

```bash
cd /Users/mateoformoso/TRABAJO/FREELANCER/morelatto\ lanas\ /monorepo/backend

# Iniciar PostgreSQL
docker-compose up -d db

# Esperar 5 segundos
sleep 5
```

### Paso 2: Ejecutar Script de Inicialización

```bash
# Instalar dependencias si no lo hiciste
pip install -r requirements.txt

# Ejecutar script de inicialización COMPLETA
python init_complete_system.py
```

**Este script crea:**
- ✅ Todas las tablas necesarias
- ✅ Usuario admin (admin@morelatto.com / admin123)
- ✅ 3 métodos de pago (MercadoPago, Stripe, Transferencia)
- ✅ 4 zonas de envío con tarifas
- ✅ Configuración de envío gratis por zona

### Paso 3: Iniciar Backend

```bash
# En el puerto correcto (8000)
uvicorn app.main:app --reload --port 8000
```

Verifica que funcione:
```bash
curl http://localhost:8000/health
# Debe responder: {"status":"healthy"}

curl http://localhost:8000/api/payments/config
# Debe devolver la config de MercadoPago
```

---

## 🖥️ Iniciar Aplicaciones Frontend

### Panel de Administración

```bash
cd /Users/mateoformoso/TRABAJO/FREELANCER/morelatto\ lanas\ /monorepo/apps/sistema

# Instalar dependencias (solo primera vez)
npm install

# Iniciar en desarrollo
npm run dev
```

**URL:** http://localhost:5173

**Login:**
- Email: `admin@morelatto.com`
- Contraseña: `admin123`

---

### E-commerce (Tienda Online)

```bash
cd /Users/mateoformoso/TRABAJO/FREELANCER/morelatto\ lanas\ /monorepo/apps/ecommerce

# Instalar dependencias (solo primera vez)
npm install

# Iniciar en desarrollo
npm run dev
```

**URL:** http://localhost:5174

---

## ✅ Verificación del Sistema

### 1. Verificar Métodos de Pago

```bash
curl http://localhost:8000/api/shipping/payment-methods
```

**Debe devolver:**
```json
[
  {
    "id": "...",
    "name": "MercadoPago",
    "type": "mercadopago",
    "is_active": true
  },
  {
    "id": "...",
    "name": "Transferencia Bancaria",
    "type": "bank_transfer",
    "is_active": true
  }
]
```

### 2. Verificar Zonas de Envío

```bash
curl http://localhost:8000/api/shipping/zones
```

**Debe devolver 4 zonas:** CABA, GBA, Buenos Aires Interior, Resto del País

### 3. Verificar MercadoPago

```bash
curl http://localhost:8000/api/payments/config
```

**Debe devolver:**
```json
{
  "public_key": "APP_USR-ad367137-6d71-46a5-827b-...",
  "configured": true
}
```

---

## 🛒 Probar Flujo de Compra Completo

### Paso 1: Crear un Producto

1. Ir al panel admin: http://localhost:5173
2. Login con admin@morelatto.com / admin123
3. Ir a "Inventario" → "Agregar Producto"
4. Completar:
   - Nombre: "Lana Merino 100g"
   - Código: "LM100"
   - Precio: $5000
   - Stock: 50
   - Peso: 0.1 kg
5. Guardar

### Paso 2: Publicar en la Web

1. En el listado de productos, buscar el producto
2. Click en "Publicar en Web"
3. Seleccionar categoría
4. Confirmar

### Paso 3: Hacer una Compra de Prueba

1. Ir al e-commerce: http://localhost:5174
2. Ir a "Tienda"
3. Agregar el producto al carrito
4. Ir al carrito
5. Click en "Finalizar Compra"
6. Completar formulario:
   - Nombre: Juan Pérez
   - Email: juan@example.com
   - Teléfono: 11-1234-5678
   - Dirección: Av. Corrientes 1234
   - Ciudad: **CABA** (importante para calcular envío)
   - Código Postal: 1043
7. Seleccionar método de pago: **MercadoPago**
8. Click en "Confirmar Pedido"

### Paso 4: Completar Pago en MercadoPago

- Serás redirigido a la página de pago de MercadoPago
- En **modo sandbox/test**, usa tarjetas de prueba:

  **Tarjeta aprobada:**
  - Número: `4509 9535 6623 3704`
  - Vencimiento: `11/25`
  - CVV: `123`
  - Nombre: APRO
  - DNI: 12345678

- Completa el pago
- Serás redirigido de vuelta a tu tienda

### Paso 5: Verificar en el Panel Admin

1. Ir al panel admin
2. Ver la orden en "Pedidos" (sección de e-commerce)
3. El estado de pago debe ser "approved" o "paid"
4. Puedes actualizar el estado del pedido a "processing", "shipped", etc.

---

## 🔧 Configuración de MercadoPago

### Credenciales Actuales (TEST)

En `/monorepo/backend/.env`:

```bash
# MercadoPago (TEST MODE)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-7875135435888656-122819-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-ad367137-6d71-46a5-827b-...
MERCADOPAGO_WEBHOOK_SECRET=tu_webhook_secret_aqui
```

### Configurar Webhook

1. Ir a https://www.mercadopago.com.ar/developers/panel/app
2. Seleccionar tu aplicación
3. Ir a "Webhooks"
4. Agregar webhook URL: `https://tu-dominio.com/api/payments/webhook`
5. Copiar el "Webhook Secret" y agregarlo al `.env`

---

## 📋 Endpoints Disponibles

### Públicos (sin autenticación)

```bash
GET  /api/products/public          # Listar productos públicos
GET  /api/products/public/{id}     # Ver producto
GET  /api/categories               # Listar categorías
GET  /api/shipping/zones           # Zonas de envío
POST /api/shipping/calculate       # Calcular costo de envío
GET  /api/shipping/payment-methods # Métodos de pago
POST /api/orders                   # Crear orden
POST /api/payments/preference      # Crear pago MercadoPago
```

### Admin (requiere autenticación)

```bash
POST   /api/auth/login             # Login
GET    /api/auth/me                # Usuario actual
GET    /api/products               # Listar productos
POST   /api/products               # Crear producto
PUT    /api/products/{id}          # Actualizar producto
DELETE /api/products/{id}          # Eliminar producto
GET    /api/orders                 # Listar órdenes
PATCH  /api/orders/{id}/status     # Actualizar estado
```

---

## 🐛 Troubleshooting

### Error: "Connection refused" en puerto 8000

```bash
# Verificar que el backend esté corriendo
curl http://localhost:8000/health

# Si no responde, iniciarlo:
cd backend
uvicorn app.main:app --reload --port 8000
```

### Error: "No payment methods available"

```bash
# Ejecutar el script de inicialización
python init_complete_system.py
```

### Error: "Zone not found for shipping"

```bash
# Verificar que las zonas existan
curl http://localhost:8000/api/shipping/zones

# Si no hay zonas, ejecutar:
python init_complete_system.py
```

### Frontend muestra error de CORS

**Solución:** Verificar que en `backend/app/main.py` esté configurado CORS:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### MercadoPago no redirige correctamente

**Verificar:**
1. Que las credenciales sean correctas
2. Que el backend esté accesible desde internet (para webhooks)
3. Ver logs del backend para errores

---

## 📊 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
├──────────────────────┬──────────────────────────┤
│  Panel Admin (5173)  │  E-commerce (5174)       │
│  - Productos         │  - Tienda                │
│  - Ventas            │  - Carrito               │
│  - Pedidos           │  - Checkout              │
│  - Talleres          │  - Talleres              │
└──────────┬───────────┴──────────┬───────────────┘
           │                      │
           └──────────┬───────────┘
                      │ HTTP/REST
                      ▼
           ┌──────────────────────┐
           │   API Backend (8000) │
           │   FastAPI + Python   │
           └──────────┬───────────┘
                      │
           ┌──────────┴───────────┐
           │                      │
           ▼                      ▼
    ┌─────────────┐      ┌──────────────┐
    │ PostgreSQL  │      │ MercadoPago  │
    │   (5432)    │      │   Payments   │
    └─────────────┘      └──────────────┘
```

---

## ✅ Checklist de Verificación

Antes de dar el sistema por funcional, verifica:

- [ ] ✅ Backend corre en puerto 8000
- [ ] ✅ Base de datos PostgreSQL está activa
- [ ] ✅ Script `init_complete_system.py` ejecutado
- [ ] ✅ Usuario admin creado y puede hacer login
- [ ] ✅ Métodos de pago creados (MercadoPago + Transferencia)
- [ ] ✅ Zonas de envío creadas (4 zonas)
- [ ] ✅ Panel admin corre en puerto 5173
- [ ] ✅ E-commerce corre en puerto 5174
- [ ] ✅ Puedes crear un producto
- [ ] ✅ El producto aparece en la tienda
- [ ] ✅ Puedes agregar al carrito
- [ ] ✅ El checkout calcula el envío correctamente
- [ ] ✅ MercadoPago está configurado
- [ ] ✅ Puedes completar una compra de prueba
- [ ] ✅ La orden aparece en el panel admin
- [ ] ✅ Puedes actualizar el estado del pedido

---

## 📞 Ayuda Adicional

Si algo no funciona:

1. **Revisa los logs del backend** en la consola donde ejecutas `uvicorn`
2. **Revisa la consola del navegador** (F12) para errores de frontend
3. **Verifica la base de datos**:
   ```bash
   docker-compose exec db psql -U morelatto -d morelatto
   \dt  # Ver tablas
   SELECT * FROM payment_methods;
   SELECT * FROM shipping_zones;
   ```

---

**¡Listo! Tu sistema debería estar completamente funcional** 🎉
