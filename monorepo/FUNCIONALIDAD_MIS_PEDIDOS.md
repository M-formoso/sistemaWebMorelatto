# Funcionalidad "Mis Pedidos" - Documentación

## Resumen
Se ha configurado exitosamente la funcionalidad de **"Mis Pedidos"** en la sección "Mi Cuenta" del frontend. Los usuarios ahora pueden ver todos sus pedidos con información detallada sobre el estado de pago y envío.

## Cambios Implementados

### 1. Backend (API)

#### Nuevo Endpoint: `GET /api/orders/my-orders`
- **Ubicación**: `monorepo/backend/app/api/routes/orders.py:163-239`
- **Funcionalidad**: Retorna todos los pedidos del usuario basándose en el `session_id`
- **Headers requeridos**: `X-Session-ID` (se genera automáticamente en el navegador)

**Características del endpoint**:
- Obtiene pedidos asociados al `session_id` del usuario
- Incluye información detallada de cada producto en los items
- Enriquece la respuesta con:
  - **payment_info**: Información del método de pago, gateway, estados
  - **shipment_info**: Información del envío, número de tracking, transportista, estado, fecha estimada de entrega
- Ordena los pedidos por fecha de creación (más recientes primero)

### 2. Frontend (Cliente API)

#### Actualización del Cliente API
- **Archivo**: `monorepo/packages/api-client/src/client.ts:493-500`
- **Método actualizado**: `getMyOrders()`
- Ahora envía automáticamente el header `X-Session-ID` para identificar al usuario

### 3. Frontend (Interfaz de Usuario)

#### Página de Perfil Mejorada
- **Archivo**: `monorepo/apps/ecommerce/src/pages/Profile.tsx`
- **Ruta**: `/perfil`

**Mejoras implementadas**:

1. **Estados de Pedidos Completos** (líneas 111-125):
   - Pendiente
   - Esperando Pago
   - Pagado
   - Pago Fallido
   - Confirmado
   - Procesando
   - Enviado
   - Entregado
   - Cancelado

2. **Estados de Pago** (líneas 127-138):
   - Pendiente
   - Aprobado
   - Pagado
   - Fallido
   - Rechazado
   - Reembolsado

3. **Estados de Envío** (líneas 140-151):
   - Pendiente de Despacho
   - Etiqueta Creada
   - En Tránsito
   - En Reparto
   - Entregado
   - Fallo en Entrega
   - Devuelto

4. **Información mostrada por pedido**:
   - Número de pedido (ID acortado)
   - Fecha de creación
   - Estado del pago con badge de color
   - Estado del envío con número de tracking (si disponible)
   - Estado general del pedido
   - Monto total
   - Lista de productos con cantidades y precios
   - Dirección de envío
   - Información detallada de seguimiento (carrier, estado, fecha estimada)

## Cómo Funciona

### Para los Usuarios

1. **Acceder a "Mi Cuenta"**:
   - Ir a `/perfil` o hacer clic en "Mi Cuenta" en el menú
   - Se requiere iniciar sesión

2. **Ver Pedidos**:
   - Hacer clic en la pestaña "Mis Pedidos"
   - Se mostrarán todos los pedidos realizados desde ese navegador (por session_id)
   - Los pedidos aparecen ordenados del más reciente al más antiguo

3. **Información Disponible**:
   - **Estado del pedido**: Badge de color indicando el estado actual
   - **Estado del pago**: Información sobre si el pago fue procesado
   - **Estado del envío**: Si el pedido fue despachado, se muestra el estado del envío
   - **Número de tracking**: Cuando el administrador configura el envío, se mostrará el número de seguimiento
   - **Transportista**: El servicio de envío utilizado (Correo Argentino, Andreani, OCA, etc.)
   - **Fecha estimada de entrega**: Cuando esté disponible

### Para el Administrador

#### Actualizar Estado de Pago
El administrador puede actualizar el estado de pago desde el panel de admin usando:
```
PATCH /api/orders/{order_id}/payment?new_payment_status={status}
```

Estados disponibles: `pending`, `approved`, `paid`, `failed`, `rejected`, `refunded`

#### Crear/Actualizar Información de Envío
El administrador puede crear y actualizar información de envío desde el panel de admin:
```
PUT /api/shipping/shipments/{shipment_id}
```

Con datos como:
- `tracking_number`: Número de seguimiento del envío
- `carrier`: Transportista (andreani, oca, correo_argentino, manual)
- `status`: Estado del envío (pending, in_transit, delivered, etc.)
- `estimated_delivery_date`: Fecha estimada de entrega

**Importante**: Cuando el admin actualiza esta información en el panel, los cambios se reflejan automáticamente en "Mis Pedidos" del usuario.

## Flujo Completo

```
1. Usuario realiza un pedido
   └─> Se crea Order con session_id

2. Admin recibe notificación del pedido

3. Admin actualiza el estado de pago
   └─> Endpoint: PATCH /orders/{id}/payment
   └─> El usuario ve el cambio en "Mis Pedidos"

4. Admin crea el envío y obtiene tracking
   └─> Endpoint: POST/PUT /shipping/shipments
   └─> Se asocia el Shipment al Order
   └─> El usuario ve:
       - Número de tracking
       - Transportista
       - Estado del envío
       - Fecha estimada de entrega

5. El carrier actualiza el estado del envío
   └─> Admin actualiza en el sistema
   └─> El usuario ve las actualizaciones en tiempo real
```

## Modelos de Datos

### Order (Pedido)
- `id`: ID único del pedido
- `session_id`: ID de sesión del usuario
- `status`: Estado del pedido (OrderStatus)
- `payment_status`: Estado del pago (PaymentStatus)
- `total_amount`: Monto total
- `items`: Lista de productos del pedido
- `created_at`: Fecha de creación

### Shipment (Envío)
- `order_id`: Referencia al pedido
- `carrier`: Transportista
- `tracking_number`: Número de seguimiento
- `status`: Estado del envío (ShipmentStatus)
- `estimated_delivery_date`: Fecha estimada de entrega
- `label_url`: URL de la etiqueta de envío

## Próximos Pasos Sugeridos

1. **Notificaciones por Email**:
   - Enviar email cuando cambia el estado del pedido
   - Enviar email con número de tracking cuando se despacha

2. **Integración Automática con Carriers**:
   - Actualización automática del estado del envío desde Correo Argentino, Andreani, OCA
   - Webhooks para recibir actualizaciones en tiempo real

3. **Autenticación de Usuarios**:
   - Vincular pedidos con `user_id` en lugar de solo `session_id`
   - Permitir ver pedidos desde cualquier dispositivo

4. **Historial de Cambios**:
   - Mostrar timeline con todos los cambios de estado
   - Incluir fechas y horas de cada actualización

## Archivos Modificados

### Backend
- `monorepo/backend/app/api/routes/orders.py` - Nuevo endpoint `GET /orders/my-orders`

### Frontend
- `monorepo/packages/api-client/src/client.ts` - Actualizado método `getMyOrders()`
- `monorepo/apps/ecommerce/src/pages/Profile.tsx` - Mejorado mapeo de estados y visualización

## Pruebas Recomendadas

1. Crear un pedido de prueba en el ecommerce
2. Verificar que aparece en "Mis Pedidos"
3. Desde el panel admin, actualizar el estado de pago
4. Verificar que se actualiza en "Mis Pedidos"
5. Crear un envío con número de tracking
6. Verificar que se muestra la información del envío
7. Actualizar el estado del envío
8. Verificar que se refleja en "Mis Pedidos"

---

**Fecha de implementación**: 16 de Enero de 2026
**Estado**: ✅ Completado y listo para usar
