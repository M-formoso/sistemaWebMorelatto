# Guía de Despliegue a Producción - Morelatto Lanas

## Información del Servidor

- **IP del servidor**: 137.184.91.207
- **Sistema operativo**: Ubuntu 24.04.3 LTS
- **Usuario**: root
- **Dominio**: morelattolanas.com

---

## Índice

1. [Preparación del Servidor](#1-preparación-del-servidor)
2. [Configuración de DNS](#2-configuración-de-dns)
3. [Instalación de Dependencias](#3-instalación-de-dependencias)
4. [Configuración del Proyecto](#4-configuración-del-proyecto)
5. [Configuración de Variables de Entorno](#5-configuración-de-variables-de-entorno)
6. [Despliegue Inicial](#6-despliegue-inicial)
7. [Configuración de SSL/HTTPS](#7-configuración-de-sslhttps)
8. [Configuración de Webhooks](#8-configuración-de-webhooks)
9. [Verificación y Pruebas](#9-verificación-y-pruebas)
10. [Mantenimiento y Monitoreo](#10-mantenimiento-y-monitoreo)

---

## 1. Preparación del Servidor

### 1.1. Conectarse al Servidor

```bash
ssh root@137.184.91.207
# Contraseña: contraServidor2025morelatto
```

### 1.2. Actualizar el Sistema

```bash
# Actualizar paquetes
apt update && apt upgrade -y

# Reiniciar si es necesario
reboot
```

### 1.3. Instalar Dependencias Básicas

```bash
# Instalar utilidades esenciales
apt install -y curl wget git vim ufw fail2ban htop

# Configurar firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 2. Configuración de DNS

### 2.1. Configurar Registros DNS

En tu proveedor de DNS (donde compraste el dominio), crea los siguientes registros:

```
Tipo    Nombre                  Valor                  TTL
A       @                       137.184.91.207         3600
A       www                     137.184.91.207         3600
A       api                     137.184.91.207         3600
CNAME   *.morelattolanas.com    morelattolanas.com     3600
```

### 2.2. Verificar DNS

```bash
# Espera unos minutos para que se propague el DNS
# Luego verifica:
dig morelattolanas.com
dig api.morelattolanas.com
```

---

## 3. Instalación de Dependencias

### 3.1. Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verificar instalación
docker --version

# Habilitar Docker al iniciar
systemctl enable docker
systemctl start docker
```

### 3.2. Instalar Docker Compose

```bash
# Instalar Docker Compose
apt install -y docker-compose-plugin

# Verificar instalación
docker compose version
```

### 3.3. Instalar Git (si no está instalado)

```bash
apt install -y git
git --version
```

---

## 4. Configuración del Proyecto

### 4.1. Clonar el Repositorio

```bash
# Crear directorio para proyectos
mkdir -p /opt/apps
cd /opt/apps

# Clonar tu repositorio
git clone https://github.com/TU_USUARIO/TU_REPO.git morelatto
# O si ya tienes el código, súbelo con rsync:
# rsync -avz --progress ./monorepo/backend/ root@137.184.91.207:/opt/apps/morelatto/
```

### 4.2. Navegar al Directorio del Backend

```bash
cd /opt/apps/morelatto/backend
```

### 4.3. Crear Directorios Necesarios

```bash
# Crear directorios para datos persistentes
mkdir -p backups
mkdir -p uploads
mkdir -p certs
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p nginx/conf.d

# Dar permisos
chmod 755 backups uploads
```

---

## 5. Configuración de Variables de Entorno

### 5.1. Copiar y Editar .env.production

```bash
# Copiar template
cp .env.production .env

# Editar con tu editor favorito
nano .env
```

### 5.2. Configurar Variables Críticas

Edita el archivo `.env` y configura lo siguiente:

```bash
# ==========================================================
# CAMBIAR ESTOS VALORES OBLIGATORIAMENTE
# ==========================================================

# 1. GENERAR SECRET_KEY SEGURO
SECRET_KEY=$(openssl rand -hex 32)
# Copia el resultado y pégalo en .env

# 2. CAMBIAR PASSWORD DE BASE DE DATOS
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO_AQUI

# 3. CONFIGURAR DOMINIOS
FRONTEND_SISTEMA_URL=https://admin.morelattolanas.com
FRONTEND_ECOMMERCE_URL=https://morelattolanas.com

# 4. URLS DE MERCADOPAGO (ya tienes las credenciales)
MERCADOPAGO_SUCCESS_URL=https://morelattolanas.com/checkout/success
MERCADOPAGO_FAILURE_URL=https://morelattolanas.com/checkout/failure
MERCADOPAGO_PENDING_URL=https://morelattolanas.com/checkout/pending
MERCADOPAGO_WEBHOOK_URL=https://api.morelattolanas.com/api/payments/webhook

# 5. CONFIGURAR STRIPE (si lo vas a usar)
STRIPE_SECRET_KEY=sk_live_XXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXX

# 6. CONFIGURAR CARRIERS (si tienes las credenciales)
PAQAR_API_KEY=tu_api_key
PAQAR_AGREEMENT_ID=tu_agreement_id
PAQAR_PRODUCTION=True

ANDREANI_API_KEY=tu_api_key
ANDREANI_CONTRACT=tu_contrato

# 7. DEBUG = False en producción
DEBUG=False
```

### 5.3. Verificar Configuración

```bash
# Verificar que el archivo .env esté configurado
cat .env | grep -v "^#" | grep -v "^$"
```

---

## 6. Despliegue Inicial

### 6.1. Dar Permisos a los Scripts

```bash
chmod +x scripts/*.sh
```

### 6.2. Realizar Primer Despliegue

```bash
# Ejecutar script de despliegue
./scripts/deploy.sh
```

Este script hará:
- ✓ Detener contenedores existentes
- ✓ Construir imágenes Docker
- ✓ Iniciar servicios (PostgreSQL, API, Nginx, Certbot)
- ✓ Verificar estado

### 6.3. Verificar que los Servicios Estén Corriendo

```bash
# Ver estado de contenedores
docker compose -f docker-compose.production.yml ps

# Ver logs
docker compose -f docker-compose.production.yml logs -f

# O usar el script de logs
./scripts/logs.sh
```

---

## 7. Configuración de SSL/HTTPS

### 7.1. Configurar Email para Let's Encrypt

```bash
# Editar el script setup-ssl.sh
nano scripts/setup-ssl.sh

# Cambiar esta línea:
EMAIL="tu-email@ejemplo.com"  # Por tu email real
```

### 7.2. Obtener Certificado SSL

```bash
# Ejecutar script de SSL
./scripts/setup-ssl.sh
```

Este script hará:
- ✓ Verificar que Nginx esté corriendo
- ✓ Obtener certificado SSL de Let's Encrypt
- ✓ Configurar HTTPS
- ✓ Redirigir HTTP a HTTPS
- ✓ Recargar Nginx

### 7.3. Verificar SSL

```bash
# Probar acceso HTTPS
curl https://api.morelattolanas.com/health

# Verificar certificado
openssl s_client -connect api.morelattolanas.com:443 -servername api.morelattolanas.com
```

### 7.4. Renovación Automática

El contenedor `certbot` renovará automáticamente el certificado cada 12 horas. No necesitas hacer nada.

---

## 8. Configuración de Webhooks

### 8.1. Webhook de MercadoPago

1. Ir a: https://www.mercadopago.com.ar/developers/panel/app
2. Seleccionar tu aplicación
3. Ir a "Webhooks"
4. Agregar URL: `https://api.morelattolanas.com/api/payments/webhook`
5. Seleccionar eventos:
   - ✓ Pagos
   - ✓ Merchant Orders
6. Guardar

**Clave de webhook** (para verificar en logs):
```
TU_CLAVE_WEBHOOK_AQUI
```

### 8.2. Webhook de Stripe

1. Ir a: https://dashboard.stripe.com/webhooks
2. Agregar endpoint: `https://api.morelattolanas.com/api/payments/stripe/webhook`
3. Seleccionar eventos:
   - ✓ `payment_intent.succeeded`
   - ✓ `payment_intent.payment_failed`
   - ✓ `charge.refunded`
4. Copiar el "Signing Secret"
5. Actualizar `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXX
   ```
6. Reiniciar servicios:
   ```bash
   docker compose -f docker-compose.production.yml restart api
   ```

### 8.3. Probar Webhooks

```bash
# Ver logs de webhooks en tiempo real
docker compose -f docker-compose.production.yml logs -f api | grep webhook

# Realizar una compra de prueba y verificar que llegue el webhook
```

---

## 9. Verificación y Pruebas

### 9.1. Health Check

```bash
# Verificar que la API responda
curl https://api.morelattolanas.com/health

# Debería retornar:
# {"status": "healthy"}
```

### 9.2. Probar Endpoints Principales

```bash
# Listar productos
curl https://api.morelattolanas.com/api/products

# Obtener configuración de MercadoPago (pública)
curl https://api.morelattolanas.com/api/payments/config

# Obtener configuración de Stripe (pública)
curl https://api.morelattolanas.com/api/payments/stripe/config
```

### 9.3. Probar Flujo de Compra Completo

1. **Crear una orden** (desde tu frontend o con cURL)
2. **Iniciar pago** con MercadoPago o Stripe
3. **Verificar webhook** en los logs
4. **Confirmar estado** de la orden

### 9.4. Verificar Base de Datos

```bash
# Acceder a PostgreSQL
docker compose -f docker-compose.production.yml exec db psql -U morelatto -d morelatto_db

# Verificar tablas
\dt

# Ver órdenes
SELECT id, status, payment_status, total_amount FROM orders LIMIT 5;

# Salir
\q
```

---

## 10. Mantenimiento y Monitoreo

### 10.1. Scripts de Mantenimiento

```bash
# Ver logs
./scripts/logs.sh

# Hacer backup de base de datos
./scripts/backup-db.sh

# Restaurar backup
./scripts/restore-db.sh

# Redesplegar (actualizar código)
./scripts/deploy.sh
```

### 10.2. Monitoreo de Logs

```bash
# Ver logs en tiempo real
docker compose -f docker-compose.production.yml logs -f

# Ver solo errores
docker compose -f docker-compose.production.yml logs -f api | grep ERROR

# Ver webhooks
docker compose -f docker-compose.production.yml logs -f api | grep webhook
```

### 10.3. Backups Automáticos

Configura un cron job para backups diarios:

```bash
# Editar crontab
crontab -e

# Agregar (backup diario a las 3 AM)
0 3 * * * cd /opt/apps/morelatto/backend && ./scripts/backup-db.sh >> /var/log/morelatto-backup.log 2>&1
```

### 10.4. Actualizar la Aplicación

```bash
# Hacer backup antes de actualizar
./scripts/backup-db.sh

# Descargar cambios
git pull origin main

# Redesplegar
./scripts/deploy.sh
```

### 10.5. Monitoreo de Recursos

```bash
# Ver uso de CPU/RAM
htop

# Ver uso de disco
df -h

# Ver uso de Docker
docker stats

# Ver tamaño de volúmenes
docker system df -v
```

---

## 11. Solución de Problemas

### Error: No se puede conectar a la base de datos

```bash
# Verificar que el contenedor de DB esté corriendo
docker compose -f docker-compose.production.yml ps db

# Ver logs de la base de datos
docker compose -f docker-compose.production.yml logs db

# Reiniciar base de datos
docker compose -f docker-compose.production.yml restart db
```

### Error: Nginx no inicia

```bash
# Verificar configuración de Nginx
docker compose -f docker-compose.production.yml exec nginx nginx -t

# Ver logs de Nginx
docker compose -f docker-compose.production.yml logs nginx

# Reiniciar Nginx
docker compose -f docker-compose.production.yml restart nginx
```

### Error: Webhooks no llegan

```bash
# Verificar logs de API
docker compose -f docker-compose.production.yml logs -f api | grep webhook

# Verificar que el webhook esté configurado correctamente en MP/Stripe
# Verificar que el firewall permita conexiones en puerto 443
ufw status

# Probar manualmente el webhook
curl -X POST https://api.morelattolanas.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Error: Certificado SSL expirado

```bash
# Renovar manualmente
docker compose -f docker-compose.production.yml run --rm certbot renew

# Recargar Nginx
docker compose -f docker-compose.production.yml exec nginx nginx -s reload
```

---

## 12. Checklist Final

Antes de considerar el despliegue completo, verifica:

- [ ] ✓ Servidor actualizado y configurado
- [ ] ✓ DNS configurado y propagado
- [ ] ✓ Docker y Docker Compose instalados
- [ ] ✓ Proyecto clonado en `/opt/apps/morelatto`
- [ ] ✓ Variables de entorno configuradas en `.env`
- [ ] ✓ Servicios desplegados y corriendo
- [ ] ✓ SSL/HTTPS configurado y funcionando
- [ ] ✓ Webhooks de MercadoPago configurados
- [ ] ✓ Webhooks de Stripe configurados (si aplica)
- [ ] ✓ Health check respondiendo correctamente
- [ ] ✓ Endpoints principales funcionando
- [ ] ✓ Flujo de compra completo probado
- [ ] ✓ Backups automáticos configurados
- [ ] ✓ Firewall configurado (puertos 80, 443, 22)

---

## 13. URLs Importantes

### Aplicación
- **API**: https://api.morelattolanas.com
- **Health Check**: https://api.morelattolanas.com/health
- **Docs API**: https://api.morelattolanas.com/docs

### Paneles de Administración
- **MercadoPago**: https://www.mercadopago.com.ar/developers
- **Stripe**: https://dashboard.stripe.com
- **Servidor**: ssh root@137.184.91.207

---

## 14. Contactos de Soporte

- **MercadoPago**: https://www.mercadopago.com.ar/developers/es/support
- **Stripe**: https://support.stripe.com
- **Digital Ocean**: https://www.digitalocean.com/support

---

## 15. Notas Adicionales

### Seguridad

- Cambiar contraseña de root después del despliegue
- Crear usuario no-root para operaciones diarias
- Configurar fail2ban para protección contra ataques
- Revisar logs regularmente

### Performance

- Configurar cache en Nginx si es necesario
- Monitorear uso de recursos con `htop`
- Considerar CDN para archivos estáticos

### Escalabilidad

- Si el tráfico crece, considerar:
  - Aumentar workers de Uvicorn (en docker-compose)
  - Usar Redis para cache
  - Separar base de datos a servidor dedicado
  - Usar load balancer

---

**¡Listo! Tu aplicación debería estar corriendo en producción.**

Para cualquier duda, consulta la documentación en `PAGOS_Y_ENVIOS.md` o los logs del sistema.
