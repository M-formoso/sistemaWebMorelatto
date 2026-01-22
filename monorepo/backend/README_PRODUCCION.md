# Morelatto Lanas - Backend en Producción

## Descripción

Sistema completo de e-commerce para Morelatto Lanas con:
- ✅ Gestión de productos y pedidos
- ✅ Pagos con MercadoPago y Stripe
- ✅ Sistema de envíos (PAQ.AR, Andreani, OCA)
- ✅ Facturación electrónica AFIP (opcional)
- ✅ API REST completa con FastAPI
- ✅ Base de datos PostgreSQL
- ✅ Despliegue con Docker

---

## Documentación

### 📚 Guías Disponibles

| Documento | Descripción |
|-----------|-------------|
| **[QUICK_START.md](./QUICK_START.md)** | ⚡ Despliegue rápido en 30 minutos |
| **[GUIA_DESPLIEGUE_PRODUCCION.md](./GUIA_DESPLIEGUE_PRODUCCION.md)** | 📖 Guía completa paso a paso |
| **[CONFIGURACION_WEBHOOKS.md](./CONFIGURACION_WEBHOOKS.md)** | 🔔 Configurar webhooks de pagos |
| **[PAGOS_Y_ENVIOS.md](./PAGOS_Y_ENVIOS.md)** | 💳 Sistema de pagos y envíos |

---

## Información del Servidor

```yaml
IP: 137.184.91.207
Sistema: Ubuntu 24.04.3 LTS
Usuario: root
Dominio: morelattolanas.com
API: https://api.morelattolanas.com
```

---

## Stack Tecnológico

- **Backend**: FastAPI (Python 3.12)
- **Base de datos**: PostgreSQL 16
- **Servidor web**: Nginx
- **Contenedores**: Docker + Docker Compose
- **SSL**: Let's Encrypt (Certbot)
- **Pagos**: MercadoPago + Stripe
- **Envíos**: PAQ.AR + Andreani + OCA

---

## Arquitectura

```
Internet
   │
   ├─> Nginx (Puerto 80/443)
   │     │
   │     ├─> SSL/HTTPS (Let's Encrypt)
   │     └─> Reverse Proxy
   │           │
   │           ├─> FastAPI API (Puerto 8000)
   │           │     │
   │           │     ├─> PostgreSQL (Puerto 5432)
   │           │     ├─> MercadoPago API
   │           │     ├─> Stripe API
   │           │     └─> PAQ.AR API
   │           │
   │           └─> Static Files
```

---

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **Nginx** | 80, 443 | Servidor web + SSL |
| **API** | 8000 | Backend FastAPI (interno) |
| **PostgreSQL** | 5432 | Base de datos (interno) |
| **Certbot** | - | Renovación automática SSL |

---

## Comandos Rápidos

### Despliegue

```bash
# Conectarse al servidor
ssh root@137.184.91.207

# Navegar al proyecto
cd /opt/apps/morelatto

# Desplegar/Actualizar
./scripts/deploy.sh
```

### Logs

```bash
# Todos los servicios
./scripts/logs.sh

# Solo API
docker compose -f docker-compose.production.yml logs -f api

# Solo errores
docker compose -f docker-compose.production.yml logs api | grep ERROR
```

### Backup

```bash
# Hacer backup
./scripts/backup-db.sh

# Restaurar backup
./scripts/restore-db.sh
```

### Mantenimiento

```bash
# Estado de servicios
docker compose -f docker-compose.production.yml ps

# Reiniciar servicio
docker compose -f docker-compose.production.yml restart api

# Reiniciar todo
docker compose -f docker-compose.production.yml restart

# Detener todo
docker compose -f docker-compose.production.yml down

# Ver uso de recursos
docker stats
htop
```

---

## Estructura del Proyecto

```
/opt/apps/morelatto/
│
├── app/                                # Código fuente
│   ├── api/                           # Endpoints
│   │   └── routes/                    # Rutas de la API
│   ├── core/                          # Configuración
│   ├── models/                        # Modelos de base de datos
│   ├── schemas/                       # Schemas Pydantic
│   └── services/                      # Servicios externos
│       ├── mercadopago_service.py     # MercadoPago
│       ├── stripe_service.py          # Stripe
│       ├── paqar_service.py           # PAQ.AR
│       └── shipping_service.py        # Envíos
│
├── scripts/                            # Scripts de utilidad
│   ├── deploy.sh                      # Desplegar
│   ├── setup-ssl.sh                   # Configurar SSL
│   ├── backup-db.sh                   # Backup
│   ├── restore-db.sh                  # Restaurar
│   └── logs.sh                        # Ver logs
│
├── nginx/                              # Configuración Nginx
│   ├── nginx.conf                     # Config principal
│   └── conf.d/                        # Sites
│       ├── morelatto.conf             # HTTP (inicial)
│       └── morelatto-ssl.conf         # HTTPS (producción)
│
├── backups/                            # Backups automáticos
├── uploads/                            # Archivos subidos
├── certs/                              # Certificados AFIP
├── certbot/                            # Certificados SSL
│
├── .env                                # Variables de entorno (PRODUCCIÓN)
├── docker-compose.production.yml      # Docker Compose
├── Dockerfile                          # Imagen Docker
├── requirements.txt                    # Dependencias Python
│
└── Documentación
    ├── QUICK_START.md                 # Guía rápida
    ├── GUIA_DESPLIEGUE_PRODUCCION.md  # Guía completa
    ├── CONFIGURACION_WEBHOOKS.md      # Webhooks
    └── PAGOS_Y_ENVIOS.md              # Pagos y envíos
```

---

## Endpoints Principales

### API Base
- **Health**: `GET /health`
- **Docs**: `GET /docs`

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/{id}` - Obtener producto
- `POST /api/products` - Crear producto (Admin)

### Órdenes
- `GET /api/orders` - Listar órdenes (Admin)
- `GET /api/orders/{id}` - Obtener orden
- `POST /api/orders` - Crear orden

### Pagos
- `POST /api/payments/preference` - Crear pago MercadoPago
- `POST /api/payments/stripe/create-payment-intent` - Crear pago Stripe
- `POST /api/payments/webhook` - Webhook MercadoPago
- `POST /api/payments/stripe/webhook` - Webhook Stripe
- `POST /api/payments/bank-transfer/initiate` - Transferencia bancaria

### Envíos
- `POST /api/shipping/shipments` - Crear envío (Admin)
- `GET /api/shipping/tracking/{tracking_number}` - Tracking público
- `GET /api/shipping/paqar/agencies` - Buscar sucursales

---

## Variables de Entorno

### Críticas (Cambiar obligatoriamente)

```bash
SECRET_KEY=...                    # Generar con: openssl rand -hex 32
POSTGRES_PASSWORD=...             # Password seguro
DEBUG=False                       # Siempre False en producción
```

### Dominios

```bash
FRONTEND_ECOMMERCE_URL=https://morelattolanas.com
MERCADOPAGO_WEBHOOK_URL=https://api.morelattolanas.com/api/payments/webhook
```

### MercadoPago (Ya configuradas)

```bash
MERCADOPAGO_ACCESS_TOKEN=TU_ACCESS_TOKEN_AQUI
MERCADOPAGO_PUBLIC_KEY=TU_PUBLIC_KEY_AQUI
```

### Stripe (Configurar si usas)

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Carriers (Configurar si usas)

```bash
PAQAR_API_KEY=...
PAQAR_AGREEMENT_ID=...
PAQAR_PRODUCTION=True

ANDREANI_API_KEY=...
ANDREANI_CONTRACT=...
```

---

## Webhooks

### MercadoPago
- **URL**: `https://api.morelattolanas.com/api/payments/webhook`
- **Panel**: https://www.mercadopago.com.ar/developers/panel/app
- **Eventos**: Pagos + Merchant Orders

### Stripe
- **URL**: `https://api.morelattolanas.com/api/payments/stripe/webhook`
- **Panel**: https://dashboard.stripe.com/webhooks
- **Eventos**: payment_intent.succeeded, payment_intent.payment_failed

---

## SSL/HTTPS

El certificado SSL se renueva automáticamente cada 12 horas con Certbot.

### Renovación Manual

```bash
docker compose -f docker-compose.production.yml run --rm certbot renew
docker compose -f docker-compose.production.yml exec nginx nginx -s reload
```

---

## Backups

### Automático

Configura un cron job:

```bash
crontab -e

# Agregar (backup diario a las 3 AM):
0 3 * * * cd /opt/apps/morelatto && ./scripts/backup-db.sh
```

### Manual

```bash
# Crear backup
./scripts/backup-db.sh

# Los backups se guardan en: ./backups/
# Formato: morelatto_db_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## Monitoreo

### Logs

```bash
# Logs interactivos
./scripts/logs.sh

# Ver webhooks
docker compose -f docker-compose.production.yml logs -f api | grep webhook

# Ver errores
docker compose -f docker-compose.production.yml logs api | grep ERROR
```

### Recursos

```bash
# Ver uso de recursos
htop

# Ver uso Docker
docker stats

# Ver disco
df -h

# Ver tamaño de volúmenes
docker system df -v
```

### Health Check

```bash
# Desde el servidor
curl http://localhost:8000/health

# Desde fuera
curl https://api.morelattolanas.com/health
```

---

## Solución de Problemas

### Servicios no inician

```bash
# Ver logs
docker compose -f docker-compose.production.yml logs

# Verificar .env
cat .env

# Reiniciar
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

### Error de base de datos

```bash
# Ver logs de DB
docker compose -f docker-compose.production.yml logs db

# Reiniciar DB
docker compose -f docker-compose.production.yml restart db

# Verificar conexión
docker compose -f docker-compose.production.yml exec db psql -U morelatto -d morelatto_db
```

### Webhooks no llegan

```bash
# Ver logs
docker compose -f docker-compose.production.yml logs -f api | grep webhook

# Verificar firewall
ufw status

# Probar manualmente
curl -X POST https://api.morelattolanas.com/api/payments/webhook
```

---

## Seguridad

### Checklist

- [x] Firewall configurado (ufw)
- [x] SSL/HTTPS activo
- [x] Variables sensibles en .env (no en Git)
- [x] DEBUG=False en producción
- [x] Webhooks con verificación de firma (Stripe)
- [x] Base de datos no expuesta públicamente
- [ ] Cambiar contraseña de root después del despliegue
- [ ] Configurar fail2ban
- [ ] Crear usuario no-root para operaciones

### Recomendaciones

1. **Cambiar contraseña de root**
   ```bash
   passwd root
   ```

2. **Crear usuario no-root**
   ```bash
   adduser morelatto
   usermod -aG sudo morelatto
   usermod -aG docker morelatto
   ```

3. **Configurar fail2ban**
   ```bash
   apt install -y fail2ban
   systemctl enable fail2ban
   systemctl start fail2ban
   ```

---

## Actualizaciones

### Proceso de Actualización

```bash
# 1. Hacer backup
./scripts/backup-db.sh

# 2. Descargar cambios
git pull origin main
# O subir con rsync desde tu máquina

# 3. Actualizar .env si hay cambios
nano .env

# 4. Redesplegar
./scripts/deploy.sh

# 5. Verificar
curl https://api.morelattolanas.com/health
docker compose -f docker-compose.production.yml logs -f
```

---

## Testing en Producción

### Flujo de Compra Completo

1. **Crear producto** (Admin panel o API)
2. **Crear orden**
   ```bash
   curl -X POST https://api.morelattolanas.com/api/orders \
     -H "Content-Type: application/json" \
     -d '{...}'
   ```
3. **Iniciar pago** (MercadoPago o Stripe)
4. **Verificar webhook** en logs
5. **Verificar estado** de la orden
6. **Crear envío**
7. **Verificar tracking**

---

## Soporte

### Documentación

- **Guía rápida**: [QUICK_START.md](./QUICK_START.md)
- **Guía completa**: [GUIA_DESPLIEGUE_PRODUCCION.md](./GUIA_DESPLIEGUE_PRODUCCION.md)
- **Webhooks**: [CONFIGURACION_WEBHOOKS.md](./CONFIGURACION_WEBHOOKS.md)
- **Pagos**: [PAGOS_Y_ENVIOS.md](./PAGOS_Y_ENVIOS.md)

### Paneles

- **MercadoPago**: https://www.mercadopago.com.ar/developers
- **Stripe**: https://dashboard.stripe.com
- **Servidor**: ssh root@137.184.91.207

### Logs

En caso de problemas, siempre revisa los logs:

```bash
./scripts/logs.sh
```

---

## Próximos Pasos

1. [ ] Configurar frontend en `morelattolanas.com`
2. [ ] Configurar backups automáticos
3. [ ] Probar flujo completo de compra
4. [ ] Configurar monitoreo (Uptime Robot, etc.)
5. [ ] Configurar alertas por email
6. [ ] Agregar productos reales
7. [ ] Configurar carriers de envío
8. [ ] Lanzar sitio

---

**Estado**: ✅ Listo para producción

**Última actualización**: 2026-01-07

**Versión**: 1.0.0
