# 🔗 Integración Frontend-Backend

Guía rápida para integrar tu frontend (E-commerce y Panel Admin) con el backend.

---

## 📋 Información General

### URLs del Backend

**Local** (desarrollo):
```
API: http://localhost:8000
Docs: http://localhost:8000/docs
Health: http://localhost:8000/health
```

**Producción**:
```
API: https://api.morelattolanas.com
Docs: https://api.morelattolanas.com/docs
Health: https://api.morelattolanas.com/health
```

### CORS

El backend ya acepta requests desde:
- `http://localhost:5173` (Panel/Sistema)
- `http://localhost:5174` (E-commerce)
- En producción: tus dominios configurados en `.env`

---

## 🛒 E-commerce Frontend

### 1. Listar Productos

```typescript
// GET /api/products
interface Product {
  id: string;
  name: string;
  description: string;
  code: string;
  price: number;
  stock: number;
  image_url: string;
  slug: string;
  category_id: string | null;
  is_active: boolean;
  is_featured: boolean;
  weight: number;
  images: ProductImage[];
  variants: ProductVariant[];
}

// Ejemplo de uso
const fetchProducts = async () => {
  const response = await fetch('http://localhost:8000/api/products');
  const products: Product[] = await response.json();
  return products;
};
```

### 2. Carrito de Compras

```typescript
// Headers necesarios
const headers = {
  'Content-Type': 'application/json',
  'X-Session-ID': sessionStorage.getItem('session_id') || generateUUID()
};

// Agregar al carrito
// POST /api/orders/cart
const addToCart = async (productId: string, quantity: number, variantId?: string) => {
  const response = await fetch('http://localhost:8000/api/orders/cart', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      product_id: productId,
      quantity,
      variant_id: variantId
    })
  });
  return await response.json();
};

// Ver carrito
// GET /api/orders/cart
const getCart = async () => {
  const response = await fetch('http://localhost:8000/api/orders/cart', {
    headers
  });
  return await response.json();
};

// Actualizar cantidad
// PUT /api/orders/cart/{item_id}
const updateCartItem = async (itemId: string, quantity: number) => {
  const response = await fetch(`http://localhost:8000/api/orders/cart/${itemId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ quantity })
  });
  return await response.json();
};

// Eliminar item
// DELETE /api/orders/cart/{item_id}
const removeFromCart = async (itemId: string) => {
  await fetch(`http://localhost:8000/api/orders/cart/${itemId}`, {
    method: 'DELETE',
    headers
  });
};
```

### 3. Calcular Envío

```typescript
// POST /api/shipping/calculate
interface ShippingCalculation {
  city: string;
  postal_code?: string;
  weight: number;
}

const calculateShipping = async (data: ShippingCalculation) => {
  const response = await fetch('http://localhost:8000/api/shipping/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json();
  // {
  //   zone: "CABA",
  //   base_cost: 1500.00,
  //   weight_cost: 150.00,
  //   total_cost: 1650.00,
  //   is_free: false
  // }
  return result;
};
```

### 4. Crear Orden

```typescript
// POST /api/orders
interface OrderCreate {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  payment_method: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    variant_id?: string;
  }>;
}

const createOrder = async (orderData: OrderCreate) => {
  const response = await fetch('http://localhost:8000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionStorage.getItem('session_id')
    },
    body: JSON.stringify(orderData)
  });

  const order = await response.json();
  // {
  //   id: "uuid",
  //   status: "pending",
  //   payment_status: "pending",
  //   total_amount: 3000.00,
  //   ...
  // }
  return order;
};
```

### 5. Pagar con MercadoPago

```typescript
// Paso 1: Obtener configuración pública de MercadoPago
// GET /api/payments/config
const getMPConfig = async () => {
  const response = await fetch('http://localhost:8000/api/payments/config');
  const config = await response.json();
  // { public_key: "APP_USR-..." }
  return config;
};

// Paso 2: Crear preferencia de pago
// POST /api/payments/preference
const createMPPreference = async (orderId: string, items: any[], payer: any) => {
  const response = await fetch('http://localhost:8000/api/payments/preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: orderId,
      items: items.map(item => ({
        title: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: "ARS"
      })),
      payer: {
        name: payer.name,
        surname: payer.surname,
        email: payer.email
      }
    })
  });

  const preference = await response.json();
  // {
  //   preference_id: "123456-abc123",
  //   init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
  // }

  // Redirigir al usuario
  window.location.href = preference.init_point;
};
```

### 6. Pagar con Stripe

```typescript
// Paso 1: Cargar Stripe.js en tu HTML
// <script src="https://js.stripe.com/v3/"></script>

// Paso 2: Obtener configuración pública
// GET /api/payments/stripe/config
const getStripeConfig = async () => {
  const response = await fetch('http://localhost:8000/api/payments/stripe/config');
  const config = await response.json();
  // { publishable_key: "pk_live_..." }
  return config;
};

// Paso 3: Crear Payment Intent
// POST /api/payments/stripe/create-payment-intent
const createPaymentIntent = async (orderId: string) => {
  const response = await fetch('http://localhost:8000/api/payments/stripe/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: orderId,
      payment_method_type: "card"
    })
  });

  const { client_secret } = await response.json();

  // Paso 4: Confirmar pago con Stripe.js
  const stripe = Stripe('pk_live_...');
  const { error } = await stripe.confirmCardPayment(client_secret, {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: 'Cliente',
        email: 'cliente@example.com'
      }
    }
  });

  if (error) {
    console.error(error);
  } else {
    // Pago exitoso
    window.location.href = '/checkout/success';
  }
};
```

### 7. Métodos de Pago Disponibles

```typescript
// GET /api/shipping/payment-methods
const getPaymentMethods = async () => {
  const response = await fetch('http://localhost:8000/api/shipping/payment-methods');
  const methods = await response.json();
  // [
  //   {
  //     id: "uuid",
  //     name: "MercadoPago",
  //     type: "mercadopago",
  //     description: "Paga con tarjeta...",
  //     is_active: true,
  //     ...
  //   }
  // ]
  return methods.filter(m => m.is_active);
};
```

### 8. Tracking de Envío

```typescript
// GET /api/shipping/tracking/{tracking_number}
const getTracking = async (trackingNumber: string) => {
  const response = await fetch(`http://localhost:8000/api/shipping/tracking/${trackingNumber}`);
  const tracking = await response.json();
  // {
  //   tracking_number: "AND123456789",
  //   carrier: "andreani",
  //   status: "in_transit",
  //   estimated_delivery: "2025-01-05",
  //   events: [...]
  // }
  return tracking;
};
```

---

## 🔐 Panel de Administración

### 1. Autenticación

```typescript
// POST /api/auth/login
const login = async (email: string, password: string) => {
  const response = await fetch('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  // {
  //   access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  //   token_type: "bearer",
  //   user: { id, email, name, role }
  // }

  // Guardar token
  localStorage.setItem('access_token', data.access_token);
  return data;
};

// Usar token en requests
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json'
};
```

### 2. Listar Órdenes (Admin)

```typescript
// GET /api/orders?page=1&page_size=20
const getOrders = async (page = 1, pageSize = 20, status?: string) => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...(status && { order_status: status })
  });

  const response = await fetch(`http://localhost:8000/api/orders?${params}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });

  return await response.json();
};
```

### 3. Ver Detalle de Orden

```typescript
// GET /api/orders/{order_id}
const getOrder = async (orderId: string) => {
  const response = await fetch(`http://localhost:8000/api/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });
  return await response.json();
};
```

### 4. Actualizar Estado de Orden

```typescript
// PATCH /api/orders/{order_id}/status
const updateOrderStatus = async (orderId: string, newStatus: string) => {
  const response = await fetch(`http://localhost:8000/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ new_status: newStatus })
  });
  return await response.json();
};

// Estados disponibles:
// "pending", "pending_payment", "paid", "confirmed", "processing", "shipped", "delivered", "cancelled"
```

### 5. Confirmar Pago Manual

```typescript
// POST /api/orders/{order_id}/confirm-payment
// Para transferencias bancarias u otros pagos manuales
const confirmPayment = async (orderId: string) => {
  const response = await fetch(`http://localhost:8000/api/orders/${orderId}/confirm-payment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });
  return await response.json();
};
```

### 6. Verificar Transferencia Bancaria

```typescript
// POST /api/payments/bank-transfer/verify/{order_id}
const verifyBankTransfer = async (orderId: string) => {
  const response = await fetch(`http://localhost:8000/api/payments/bank-transfer/verify/${orderId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });
  return await response.json();
};
```

### 7. Crear Envío

```typescript
// POST /api/shipping/shipments
const createShipment = async (orderId: string, shipmentData: any) => {
  const response = await fetch('http://localhost:8000/api/shipping/shipments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      order_id: orderId,
      carrier: "andreani", // o "oca", "correo_argentino", "manual"
      weight: 0.5,
      length: 30,
      width: 20,
      height: 10,
      notes: "Frágil"
    })
  });
  return await response.json();
};
```

### 8. Crear/Editar Producto

```typescript
// POST /api/products
const createProduct = async (productData: any) => {
  const response = await fetch('http://localhost:8000/api/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(productData)
  });
  return await response.json();
};

// PUT /api/products/{product_id}
const updateProduct = async (productId: string, productData: any) => {
  const response = await fetch(`http://localhost:8000/api/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(productData)
  });
  return await response.json();
};
```

---

## 🔧 Configuración en Frontend

### Variables de Entorno

Crea un archivo `.env` en tu frontend:

```bash
# Desarrollo
VITE_API_URL=http://localhost:8000
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-ad367137-6d71-46a5-827b-35cf8da6a5b4

# Producción
VITE_API_URL=https://api.morelattolanas.com
VITE_MERCADOPAGO_PUBLIC_KEY=TU_PUBLIC_KEY_AQUI
```

### Cliente API (Axios/Fetch)

```typescript
// api/client.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = {
  async get(endpoint: string, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    return await response.json();
  },

  async post(endpoint: string, data: any, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  // ... put, patch, delete
};
```

---

## 📊 Estados y Flujos

### Estado de una Orden

```
pending → pending_payment → paid → confirmed → processing → shipped → delivered
                              ↓
                           payment_failed
                              ↓
                           cancelled
```

### Estado de Pago

```
pending → approved → paid
           ↓
        rejected/failed
           ↓
        refunded
```

### Estado de Envío

```
pending → label_created → in_transit → out_for_delivery → delivered
                              ↓
                           failed
                              ↓
                           returned
```

---

## 🎯 Ejemplos de Flujos Completos

### Flujo de Compra E-commerce

```typescript
// 1. Usuario ve productos
const products = await fetch('/api/products').then(r => r.json());

// 2. Agrega al carrito
await addToCart(productId, quantity);

// 3. Ve el carrito
const cart = await getCart();

// 4. Calcula envío
const shipping = await calculateShipping({
  city: "CABA",
  weight: cart.reduce((sum, item) => sum + item.product.weight * item.quantity, 0)
});

// 5. Crea la orden
const order = await createOrder({
  customer_name: "Juan Pérez",
  customer_email: "juan@example.com",
  customer_phone: "+5491112345678",
  shipping_address: "Av. Corrientes 1234",
  shipping_city: "CABA",
  shipping_postal_code: "1043",
  payment_method: "mercadopago",
  items: cart.map(item => ({
    product_id: item.product_id,
    quantity: item.quantity,
    variant_id: item.variant_id
  }))
});

// 6. Crea preferencia de MercadoPago
const preference = await createMPPreference(order.id, order.items, {
  name: "Juan",
  surname: "Pérez",
  email: "juan@example.com"
});

// 7. Redirige a MercadoPago
window.location.href = preference.init_point;

// 8. MercadoPago procesa y envía webhook automáticamente
// 9. Usuario es redirigido a success_url
// 10. Frontend muestra confirmación
```

### Flujo de Gestión de Orden (Admin)

```typescript
// 1. Admin ve la lista de órdenes
const orders = await getOrders(1, 20, "paid");

// 2. Selecciona una orden
const order = await getOrder(orderId);

// 3. Si es transferencia bancaria, verifica el comprobante
if (order.payment_method === "bank_transfer") {
  await verifyBankTransfer(orderId);
}

// 4. Actualiza estado a "confirmed"
await updateOrderStatus(orderId, "confirmed");

// 5. Crea el envío
const shipment = await createShipment(orderId, {
  carrier: "andreani",
  weight: 0.5,
  length: 30,
  width: 20,
  height: 10
});

// 6. Actualiza estado a "shipped"
await updateOrderStatus(orderId, "shipped");

// 7. Cliente puede hacer tracking con el número
```

---

## 🐛 Manejo de Errores

```typescript
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error en la API');
  }
  return response.json();
};

// Uso
try {
  const order = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  }).then(handleApiError);

  console.log('Orden creada:', order);
} catch (error) {
  console.error('Error al crear orden:', error.message);
  // Mostrar mensaje al usuario
}
```

---

## ✅ Checklist de Integración

- [ ] Configurar variables de entorno (API_URL)
- [ ] Implementar cliente API (fetch/axios)
- [ ] Implementar sistema de carrito
- [ ] Implementar creación de órdenes
- [ ] Integrar MercadoPago (SDK + backend)
- [ ] Integrar Stripe (opcional)
- [ ] Implementar cálculo de envío
- [ ] Implementar tracking
- [ ] Implementar autenticación (panel admin)
- [ ] Implementar gestión de órdenes (admin)
- [ ] Implementar gestión de productos (admin)
- [ ] Manejar errores correctamente
- [ ] Probar flujo completo

---

**¿Dudas?** Consulta la documentación interactiva en `/docs` de tu API.
