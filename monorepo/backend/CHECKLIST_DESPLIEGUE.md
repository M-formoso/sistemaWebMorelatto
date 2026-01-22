# ✅ Checklist de Despliegue - Morelatto Lanas

Usa esta checklist para asegurarte de que todo esté configurado correctamente.

---

## 📋 Pre-Despliegue

### Información Básica
- [x] **IP del servidor**: 137.184.91.207
- [x] **Dominio**: morelattolanas.com
- [x] **Contraseña root**: contraServidor2025morelatto
- [x] **Sistema**: Ubuntu 24.04.3 LTS

### Credenciales Disponibles
- [x] **MercadoPago Access Token**: Configurado
- [x] **MercadoPago Public Key**: Configurado
- [ ] **Stripe Keys**: Pendiente (opcional)
- [ ] **PAQ.AR API Key**: Pendiente (opcional)
- [ ] **Andreani API Key**: Pendiente (opcional)

---

## 🔧 Fase 1: Preparación del Servidor (10 min)

### 1.1. Conexión al Servidor
```bash
ssh root@137.184.91.207
```
- [ ] Conectado exitosamente
- [ ] Sistema actualizado (`apt update && apt upgrade -y`)

### 1.2. Instalación de Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose-plugin
```
- [ ] Docker instalado (`docker --version`)
- [ ] Docker Compose instalado (`docker compose version`)
- [ ] Docker habilitado al inicio (`systemctl enable docker`)

### 1.3. Configuración de Firewall
```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```
- [ ] UFW instalado
- [ ] Puerto 22 (SSH) permitido
- [ ] Puerto 80 (HTTP) permitido
- [ ] Puerto 443 (HTTPS) permitido
- [ ] Firewall habilitado (`ufw status`)

---

## 📦 Fase 2: Subir Código al Servidor (5 min)

### 2.1. Desde tu Máquina Local
```bash
cd /Users/mateoformoso/TRABAJO/FREELANCER/morelatto\ lanas/
rsync -avz --progress ./monorepo/backend/ root@137.184.91.207:/opt/apps/morelatto/
```
- [ ] Código subido exitosamente
- [ ] Archivos verificados en el servidor

### 2.2. Verificar en el Servidor
```bash
ssh root@137.184.91.207
cd /opt/apps/morelatto
ls -la
```
- [ ] Directorio `/opt/apps/morelatto` existe
- [ ] Archivos presentes: `app/`, `scripts/`, `.env.production`, etc.

---

## ⚙️ Fase 3: Configuración (10 min)

### 3.1. Variables de Entorno
```bash
cd /opt/apps/morelatto
cp .env.production .env
nano .env
```

**Verificar/Cambiar estos valores**:

- [ ] `SECRET_KEY` → Generado con `openssl rand -hex 32`
- [ ] `POSTGRES_PASSWORD` → Password seguro único
- [ ] `DEBUG=False` → Confirmado
- [ ] `FRONTEND_ECOMMERCE_URL=https://morelattolanas.com`
- [ ] `MERCADOPAGO_WEBHOOK_URL=https://api.morelattolanas.com/api/payments/webhook`
- [ ] `MERCADOPAGO_SUCCESS_URL=https://morelattolanas.com/checkout/success`
- [ ] `MERCADOPAGO_FAILURE_URL=https://morelattolanas.com/checkout/failure`
- [ ] `MERCADOPAGO_PENDING_URL=https://morelattolanas.com/checkout/pending`
- [ ] MercadoPago Access Token y Public Key verificados
- [ ] Stripe keys configuradas (si aplica)
- [ ] Carrier keys configuradas (si aplica)

### 3.2. Crear Directorios
```bash
mkdir -p backups uploads certs certbot/conf certbot/www
chmod 755 backups uploads
```
- [ ] Directorios creados
- [ ] Permisos configurados

### 3.3. Permisos de Scripts
```bash
chmod +x scripts/*.sh
```
- [ ] Scripts ejecutables

---

## 🌐 Fase 4: DNS (5 min)

En tu proveedor de DNS (donde compraste morelattolanas.com):

### Registros DNS a Crear

- [ ] **Registro A**: `@` → `137.184.91.207` (TTL: 3600)
- [ ] **Registro A**: `api` → `137.184.91.207` (TTL: 3600)
- [ ] **Registro A**: `www` → `137.184.91.207` (TTL: 3600)
- [ ] **Registro CNAME** (opcional): `*` → `morelattolanas.com` (TTL: 3600)

### Verificación DNS
```bash
dig morelattolanas.com
dig api.morelattolanas.com
```
- [ ] DNS propagado (puede tomar 5-30 minutos)
- [ ] `morelattolanas.com` apunta a 137.184.91.207
- [ ] `api.morelattolanas.com` apunta a 137.184.91.207

---

## 🚀 Fase 5: Despliegue Inicial (5 min)

### 5.1. Ejecutar Despliegue
```bash
cd /opt/apps/morelatto
./scripts/deploy.sh
```
- [ ] Script ejecutado sin errores
- [ ] Contenedores creados
- [ ] Servicios iniciados

### 5.2. Verificar Servicios
```bash
docker compose -f docker-compose.production.yml ps
```
- [ ] Contenedor `morelatto_db_prod` → Estado: Up (healthy)
- [ ] Contenedor `morelatto_api_prod` → Estado: Up
- [ ] Contenedor `morelatto_nginx` → Estado: Up
- [ ] Contenedor `morelatto_certbot` → Estado: Up

### 5.3. Verificar Logs
```bash
./scripts/logs.sh
# Seleccionar opción 1 (Todos los servicios)
```
- [ ] No hay errores críticos
- [ ] API iniciada correctamente
- [ ] Base de datos conectada

### 5.4. Health Check Inicial
```bash
curl http://localhost:8000/health
```
- [ ] Respuesta: `{"status":"healthy"}`

---

## 🔒 Fase 6: SSL/HTTPS (10 min)

### 6.1. Configurar Email en Script
```bash
nano scripts/setup-ssl.sh
# Cambiar: EMAIL="tu-email@ejemplo.com"
```
- [ ] Email real configurado

### 6.2. Obtener Certificado SSL
```bash
./scripts/setup-ssl.sh
```
- [ ] Certificado obtenido exitosamente
- [ ] Configuración HTTPS activada
- [ ] Nginx recargado

### 6.3. Verificar HTTPS
```bash
curl https://api.morelattolanas.com/health
```
- [ ] Respuesta: `{"status":"healthy"}`
- [ ] Sin errores de certificado

### 6.4. Verificar Redirección HTTP → HTTPS
```bash
curl -I http://api.morelattolanas.com
```
- [ ] Respuesta: `301 Moved Permanently`
- [ ] Location: `https://api.morelattolanas.com/...`

---

## 🔔 Fase 7: Configurar Webhooks (10 min)

### 7.1. MercadoPago

1. **Acceder al Panel**
   - [ ] Ir a: https://www.mercadopago.com.ar/developers/panel/app
   - [ ] Iniciar sesión

2. **Configurar Webhook**
   - [ ] Ir a "Webhooks"
   - [ ] Agregar URL: `https://api.morelattolanas.com/api/payments/webhook`
   - [ ] Seleccionar eventos: "Pagos" + "Merchant Orders"
   - [ ] Modo: **Producción**
   - [ ] Guardar

3. **Verificar**
   - [ ] Notificación de prueba recibida
   - [ ] Sin errores en panel de MercadoPago

### 7.2. Stripe (Opcional)

1. **Acceder al Panel**
   - [ ] Ir a: https://dashboard.stripe.com/webhooks
   - [ ] Iniciar sesión

2. **Agregar Endpoint**
   - [ ] Clic en "+ Add endpoint"
   - [ ] URL: `https://api.morelattolanas.com/api/payments/stripe/webhook`
   - [ ] Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - [ ] Guardar

3. **Configurar Signing Secret**
   - [ ] Copiar "Signing secret" (`whsec_xxxxx`)
   - [ ] Editar `.env`: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`
   - [ ] Reiniciar API: `docker compose -f docker-compose.production.yml restart api`

---

## ✅ Fase 8: Verificación Final (10 min)

### 8.1. Health Checks

```bash
# Health check interno
curl http://localhost:8000/health

# Health check externo
curl https://api.morelattolanas.com/health
```
- [ ] Ambos responden `{"status":"healthy"}`

### 8.2. Endpoints Públicos

```bash
# Documentación API
curl https://api.morelattolanas.com/docs

# Configuración MercadoPago (pública)
curl https://api.morelattolanas.com/api/payments/config

# Listar productos
curl https://api.morelattolanas.com/api/products
```
- [ ] Todos los endpoints responden correctamente

### 8.3. Base de Datos

```bash
docker compose -f docker-compose.production.yml exec db psql -U morelatto -d morelatto_db
\dt
\q
```
- [ ] Conexión exitosa
- [ ] Tablas creadas (orders, products, shipments, etc.)

### 8.4. Logs sin Errores

```bash
./scripts/logs.sh
```
- [ ] Sin errores críticos en API
- [ ] Sin errores en Nginx
- [ ] Sin errores en base de datos

### 8.5. SSL Válido

Visitar en navegador:
- [ ] https://api.morelattolanas.com (candado verde)
- [ ] https://api.morelattolanas.com/docs (sin advertencias)

---

## 🧪 Fase 9: Prueba de Flujo Completo (15 min)

### 9.1. Crear Producto de Prueba (Admin)

Usa Postman/cURL o el panel admin:
```bash
curl -X POST https://api.morelattolanas.com/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Producto de prueba",
    "price": 100.00,
    "stock": 10
  }'
```
- [ ] Producto creado

### 9.2. Crear Orden de Prueba

```bash
curl -X POST https://api.morelattolanas.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test User",
    "customer_email": "test@test.com",
    "customer_phone": "+5491112345678",
    "shipping_address": "Calle Falsa 123",
    "shipping_city": "Buenos Aires",
    "shipping_postal_code": "1000",
    "items": [{"product_id": "...", "quantity": 1}]
  }'
```
- [ ] Orden creada
- [ ] Status: `pending`

### 9.3. Iniciar Pago con MercadoPago

```bash
curl -X POST https://api.morelattolanas.com/api/payments/preference \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "orden-creada-id",
    "items": [{
      "title": "Producto de prueba",
      "quantity": 1,
      "unit_price": 100.00,
      "currency_id": "ARS"
    }],
    "payer": {
      "name": "Test",
      "surname": "User",
      "email": "test@test.com"
    }
  }'
```
- [ ] Preferencia creada
- [ ] `init_point` recibido

### 9.4. Simular Pago

- [ ] Abrir `init_point` en navegador
- [ ] Usar tarjeta de prueba: 5031 7557 3453 0604
- [ ] Completar pago

### 9.5. Verificar Webhook

```bash
docker compose -f docker-compose.production.yml logs -f api | grep webhook
```
- [ ] Webhook recibido de MercadoPago
- [ ] Pago procesado correctamente
- [ ] Orden actualizada a `paid`

### 9.6. Verificar Estado Final

```bash
curl https://api.morelattolanas.com/api/orders/{order_id}
```
- [ ] Status: `paid`
- [ ] Payment info guardada

---

## 🔄 Fase 10: Configuración de Mantenimiento (5 min)

### 10.1. Backups Automáticos

```bash
crontab -e

# Agregar esta línea:
0 3 * * * cd /opt/apps/morelatto && ./scripts/backup-db.sh >> /var/log/morelatto-backup.log 2>&1
```
- [ ] Cron job configurado
- [ ] Backup de prueba exitoso: `./scripts/backup-db.sh`

### 10.2. Monitoreo

- [ ] Uptime Robot configurado (opcional)
- [ ] Alertas por email configuradas (opcional)
- [ ] Panel de monitoreo accesible

---

## 🎉 Checklist Final

### Servidor
- [ ] ✅ Servidor actualizado
- [ ] ✅ Docker instalado y funcionando
- [ ] ✅ Firewall configurado
- [ ] ✅ DNS propagado

### Aplicación
- [ ] ✅ Código desplegado en `/opt/apps/morelatto`
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Servicios Docker corriendo
- [ ] ✅ Base de datos funcionando

### SSL/Seguridad
- [ ] ✅ Certificado SSL obtenido
- [ ] ✅ HTTPS funcionando
- [ ] ✅ HTTP redirige a HTTPS
- [ ] ✅ DEBUG=False

### Pagos
- [ ] ✅ MercadoPago configurado
- [ ] ✅ Webhook de MercadoPago funcionando
- [ ] ✅ Stripe configurado (si aplica)
- [ ] ✅ Webhook de Stripe funcionando (si aplica)

### Verificación
- [ ] ✅ Health check responde OK
- [ ] ✅ Endpoints públicos funcionan
- [ ] ✅ Flujo de compra completo probado
- [ ] ✅ Webhooks probados y funcionando
- [ ] ✅ Logs sin errores críticos

### Mantenimiento
- [ ] ✅ Backups automáticos configurados
- [ ] ✅ Scripts de mantenimiento probados
- [ ] ✅ Documentación revisada

---

## 📱 URLs para Guardar

### Aplicación
- **API**: https://api.morelattolanas.com
- **Health**: https://api.morelattolanas.com/health
- **Docs**: https://api.morelattolanas.com/docs

### Paneles
- **MercadoPago**: https://www.mercadopago.com.ar/developers
- **Stripe**: https://dashboard.stripe.com

### Servidor
- **SSH**: `ssh root@137.184.91.207`
- **IP**: 137.184.91.207

---

## 🚨 Comandos de Emergencia

```bash
# Ver logs en tiempo real
./scripts/logs.sh

# Reiniciar todos los servicios
docker compose -f docker-compose.production.yml restart

# Detener todo
docker compose -f docker-compose.production.yml down

# Reiniciar desde cero
./scripts/deploy.sh

# Ver uso de recursos
htop

# Verificar espacio en disco
df -h

# Hacer backup manual
./scripts/backup-db.sh
```

---

## 📞 Siguiente Paso

Una vez completada esta checklist:

1. [ ] Configurar frontend en `morelattolanas.com`
2. [ ] Agregar productos reales
3. [ ] Probar con clientes reales
4. [ ] Monitorear durante 24-48 horas
5. [ ] Lanzamiento oficial 🚀

---

**Estado del Despliegue**: ⬜ Pendiente | ⏳ En Progreso | ✅ Completado

**Fecha de inicio**: ___________

**Fecha de finalización**: ___________

**Tiempo estimado total**: 90 minutos

**Responsable**: ___________

---

¿Algún problema? Consulta:
- `QUICK_START.md` - Guía rápida
- `GUIA_DESPLIEGUE_PRODUCCION.md` - Guía completa
- `CONFIGURACION_WEBHOOKS.md` - Configuración de webhooks
- Logs del servidor: `./scripts/logs.sh`
