# 📦 Configuración de Correo Argentino (PAQ.AR)

## Estado Actual

✅ **Código Implementado**: La integración con PAQ.AR API v2.0 está completamente implementada en el backend.

⚠️ **Credenciales Pendientes**: Necesitas obtener API Key y Agreement ID de Correo Argentino.

---

## 🎯 Qué está Implementado

### Funcionalidades Disponibles

- ✅ Creación automática de órdenes de envío
- ✅ Generación de etiquetas en PDF (base64)
- ✅ Tracking en tiempo real con eventos
- ✅ Cancelación de órdenes
- ✅ Búsqueda de sucursales/agencias cercanas
- ✅ Soporte para múltiples productos (CP, CE, EX)
- ✅ Soporte para múltiples modalidades (Puerta-Puerta, Sucursal, etc.)
- ✅ Configuración de ambientes TEST y PRODUCCIÓN

### Archivos Implementados

- `app/services/paqar_service.py` - Servicio completo de integración
- `app/api/routes/shipping.py` - Endpoints de envíos
- Variables de entorno en `.env.production`

---

## 📋 Cómo Obtener Credenciales

### Paso 1: Contactar a Correo Argentino

**Opciones de Contacto**:

1. **Email Comercial**:
   - comercioelectronico@correoargentino.com.ar
   - ventasdigitales@correoargentino.com.ar

2. **Teléfono**:
   - 0810-444-4020 (línea comercial)
   - Horario: Lunes a Viernes de 8:00 a 18:00 hs

3. **Sitio Web**:
   - https://www.correoargentino.com.ar
   - Buscar sección "Soluciones para tu negocio" o "E-commerce"

### Paso 2: Información a Solicitar

Cuando contactes, menciona que necesitas:

```
Hola, necesito integrar PAQ.AR API v2.0 para mi e-commerce.
Requiero:
- API Key de producción
- Agreement ID (ID de Acuerdo)
- Documentación de la API v2.0
- Acceso a ambiente de testing (opcional pero recomendado)
```

### Paso 3: Información que te Pedirán

Prepara estos datos:

- **Razón Social**: Morelatto Lanas (o tu nombre legal)
- **CUIT**: Tu CUIT
- **Dirección de Origen**: Desde donde envías los productos
- **Volumen Estimado**: Cantidad aproximada de envíos mensuales
- **Tipo de Productos**: Lanas, hilados, productos textiles
- **URL del E-commerce**: morelattolanas.com

### Paso 4: Documentación a Solicitar

Pide específicamente:

- ✅ Manual de integración PAQ.AR API v2.0
- ✅ Credenciales de TEST (ambiente sandbox)
- ✅ Credenciales de PRODUCCIÓN
- ✅ Ejemplos de requests/responses
- ✅ Códigos de error y su significado
- ✅ Lista de provincias y códigos postales válidos

---

## ⚙️ Configuración en el Sistema

### Una vez que tengas las credenciales:

#### 1. Actualizar `.env`

```bash
# Editar archivo .env (o .env.production)
nano .env

# Agregar o actualizar:
PAQAR_API_KEY=tu_api_key_aqui
PAQAR_AGREEMENT_ID=tu_agreement_id_aqui
PAQAR_PRODUCTION=False  # False para testing, True para producción
```

#### 2. Reiniciar el Servidor

```bash
# Si estás en local
# Reinicia uvicorn (Ctrl+C y volver a ejecutar)

# Si estás en producción con Docker
docker-compose -f docker-compose.production.yml restart api
```

#### 3. Verificar Configuración

```bash
# Probar endpoint de búsqueda de sucursales (no requiere autenticación especial)
curl http://localhost:8000/api/shipping/paqar/agencies?postal_code=1425
```

**Respuesta esperada**:
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
      ...
    }
  ]
}
```

---

## 🧪 Testing

### Ambiente de Testing

Si Correo Argentino te da credenciales de testing:

```bash
PAQAR_API_KEY=TEST-key-here
PAQAR_AGREEMENT_ID=TEST-agreement-id
PAQAR_PRODUCTION=False
```

### Crear Envío de Prueba

```bash
curl -X POST http://localhost:8000/api/shipping/shipments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "order_id": "ORDER_UUID",
    "carrier": "correo_argentino",
    "weight": 0.5,
    "length": 30,
    "width": 20,
    "height": 10,
    "notes": "Prueba de envío"
  }'
```

**Respuesta esperada**:
```json
{
  "id": "shipment-uuid",
  "order_id": "order-uuid",
  "carrier": "correo_argentino",
  "tracking_number": "CA123456789AR",
  "label_url": "base64_pdf_string",
  "status": "label_created",
  "shipping_cost": 850.00
}
```

---

## 📊 Productos y Modalidades PAQ.AR

### Productos Disponibles

Ya implementados en el código:

```python
# Productos
"CP"  # Clásico Prioritario (default) - 3-5 días
"CE"  # Clásico Económico - 7-10 días
"EX"  # Express - 1-2 días
```

### Modalidades

```python
# Modalidades
"P"  # Puerta a puerta (default)
"S"  # Sucursal a sucursal
"D"  # Domicilio a sucursal
```

### Configurar Producto/Modalidad

Actualmente usa valores por defecto. Para cambiar, edita en `app/services/paqar_service.py`:

```python
# Línea ~80
"producto": "CP",  # Cambiar a "CE" o "EX"
"modalidad": "P",  # Cambiar a "S" o "D"
```

---

## 🔍 Endpoints Disponibles

### 1. Buscar Sucursales

```bash
GET /api/shipping/paqar/agencies?postal_code=1425
GET /api/shipping/paqar/agencies?province=Buenos%20Aires
GET /api/shipping/paqar/agencies?city=CABA
```

### 2. Crear Envío

```bash
POST /api/shipping/shipments
Body:
{
  "order_id": "uuid",
  "carrier": "correo_argentino",
  "weight": 0.5,
  "length": 30,
  "width": 20,
  "height": 10
}
```

### 3. Obtener Etiqueta PDF

```bash
POST /api/shipping/paqar/shipments/{shipment_id}/label
Authorization: Bearer {admin_token}
```

### 4. Tracking

```bash
GET /api/shipping/tracking/{tracking_number}
```

### 5. Cancelar Envío

```bash
POST /api/shipping/paqar/shipments/{shipment_id}/cancel
Authorization: Bearer {admin_token}
```

---

## 🚨 Solución de Problemas

### Error: "PAQ.AR no está configurado"

**Causa**: Falta API Key o Agreement ID

**Solución**:
```bash
# Verificar que las variables estén en .env
cat .env | grep PAQAR

# Deben aparecer:
PAQAR_API_KEY=...
PAQAR_AGREEMENT_ID=...
PAQAR_PRODUCTION=False
```

### Error: "Invalid credentials"

**Causa**: Credenciales incorrectas o de ambiente equivocado

**Solución**:
1. Verificar que las credenciales sean correctas
2. Si usas producción, asegurar `PAQAR_PRODUCTION=True`
3. Si usas test, asegurar `PAQAR_PRODUCTION=False`

### Error: "Address not valid"

**Causa**: Dirección incompleta o formato incorrecto

**Solución**:
- Verificar que la orden tenga todos los campos:
  - `shipping_address` (calle y número)
  - `shipping_city`
  - `shipping_postal_code`
  - Opcional: `shipping_province`

### Error al obtener etiqueta

**Causa**: El envío aún no fue procesado por PAQ.AR

**Solución**:
- Esperar unos minutos
- Verificar el estado del envío
- Intentar nuevamente

---

## 📞 Contacto con Soporte PAQ.AR

Si tienes problemas técnicos después de obtener credenciales:

**Email Técnico**:
- soportepaqar@correoargentino.com.ar
- integraciones@correoargentino.com.ar

**Teléfono Soporte**:
- 0810-444-4020 (opción soporte técnico)

**Horario**:
- Lunes a Viernes de 8:00 a 18:00 hs

---

## ✅ Checklist de Configuración

- [ ] Contacté a Correo Argentino
- [ ] Solicité credenciales de API
- [ ] Recibí API Key
- [ ] Recibí Agreement ID
- [ ] Recibí documentación de la API
- [ ] Configuré credenciales en `.env`
- [ ] Reinicié el servidor
- [ ] Probé búsqueda de sucursales
- [ ] Creé un envío de prueba
- [ ] Obtuve etiqueta PDF
- [ ] Verifiqué tracking
- [ ] Todo funciona correctamente

---

## 📄 Documentación Oficial

Una vez que tengas acceso, solicita:

- Manual de integración PAQ.AR API v2.0
- Especificación de endpoints
- Códigos de error
- Ejemplos de implementación
- Guía de testing

---

## 💡 Mientras Tanto...

Si aún no tienes credenciales de PAQ.AR, puedes usar:

### Opción 1: Modo Manual

```bash
# En el frontend, al crear envío seleccionar carrier: "manual"
# El admin ingresa manualmente el tracking number después
```

### Opción 2: Otros Carriers

El sistema también soporta:
- **Andreani** (requiere credenciales)
- **OCA** (requiere credenciales)
- **Manual** (sin integración, 100% manual)

---

## 🔄 Próximos Pasos

1. **Hoy**: Contactar a Correo Argentino
2. **Esta semana**: Recibir credenciales y documentación
3. **Configurar**: Agregar credenciales a `.env`
4. **Probar**: Crear envíos de prueba
5. **Producción**: Activar en producción

---

**Estado**: ⚠️ Implementado - Pendiente de credenciales

**Tiempo estimado para obtener credenciales**: 3-5 días hábiles

**Alternativas mientras tanto**: Usar carrier "manual" o configurar Andreani/OCA
