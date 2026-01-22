# Quick Start - Despliegue Rápido a Producción

## Resumen de 5 minutos

Esta guía es un resumen rápido para desplegar Morelatto Lanas a producción. Para más detalles, consulta `GUIA_DESPLIEGUE_PRODUCCION.md`.

---

## Información del Servidor

```
IP: 137.184.91.207
Usuario: root
Contraseña: contraServidor2025morelatto
Dominio: morelattolanas.com
SO: Ubuntu 24.04.3 LTS
```

---

## Pasos Rápidos

### 1. Conectarse al Servidor

```bash
ssh root@137.184.91.207
# Contraseña: contraServidor2025morelatto
```

### 2. Instalar Dependencias

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# Instalar Docker Compose
apt install -y docker-compose-plugin

# Configurar firewall
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 3. Subir el Código

**Opción A: Desde tu máquina local**

```bash
# En tu máquina local
cd /Users/mateoformoso/TRABAJO/FREELANCER/morelatto\ lanas/

# Subir backend al servidor
rsync -avz --progress ./monorepo/backend/ root@137.184.91.207:/opt/apps/morelatto/
```

**Opción B: Clonar repositorio (si tienes Git)**

```bash
# En el servidor
mkdir -p /opt/apps
cd /opt/apps
git clone https://github.com/TU_USUARIO/TU_REPO.git morelatto
```

### 4. Configurar Variables de Entorno

```bash
# En el servidor
cd /opt/apps/morelatto

# Copiar y editar .env
cp .env.production .env
nano .env
```

**Cambiar estos valores obligatoriamente**:

```bash
# Generar secret key
SECRET_KEY=$(openssl rand -hex 32)  # Copiar resultado

# Cambiar password de PostgreSQL
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO

# Configurar dominios
FRONTEND_ECOMMERCE_URL=https://morelattolanas.com
MERCADOPAGO_WEBHOOK_URL=https://api.morelattolanas.com/api/payments/webhook
MERCADOPAGO_SUCCESS_URL=https://morelattolanas.com/checkout/success
MERCADOPAGO_FAILURE_URL=https://morelattolanas.com/checkout/failure

# DEBUG debe ser False
DEBUG=False
```

Guardar: `Ctrl+O`, `Enter`, `Ctrl+X`

### 5. Desplegar

```bash
# Dar permisos a scripts
chmod +x scripts/*.sh

# Desplegar
./scripts/deploy.sh
```

### 6. Configurar DNS

En tu proveedor de DNS:

```
Tipo    Nombre    Valor              TTL
A       @         137.184.91.207     3600
A       api       137.184.91.207     3600
A       www       137.184.91.207     3600
```

Esperar 5-10 minutos para propagación.

### 7. Configurar SSL

```bash
# Editar email
nano scripts/setup-ssl.sh
# Cambiar: EMAIL="tu-email@ejemplo.com"
# Guardar: Ctrl+O, Enter, Ctrl+X

# Ejecutar
./scripts/setup-ssl.sh
```

### 8. Configurar Webhooks

#### MercadoPago
1. Ir a: https://www.mercadopago.com.ar/developers/panel/app
2. Webhooks → Agregar URL: `https://api.morelattolanas.com/api/payments/webhook`
3. Eventos: Pagos + Merchant Orders
4. Guardar

#### Stripe (Opcional)
1. Ir a: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://api.morelattolanas.com/api/payments/stripe/webhook`
3. Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copiar "Signing Secret"
5. Agregar a `.env`: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`
6. Reiniciar: `docker compose -f docker-compose.production.yml restart api`

### 9. Verificar

```bash
# Health check
curl https://api.morelattolanas.com/health
# Debería retornar: {"status":"healthy"}

# Ver logs
./scripts/logs.sh
```

---

## Comandos Útiles

```bash
# Ver estado de servicios
docker compose -f docker-compose.production.yml ps

# Ver logs
./scripts/logs.sh

# Hacer backup
./scripts/backup-db.sh

# Reiniciar servicios
docker compose -f docker-compose.production.yml restart

# Detener servicios
docker compose -f docker-compose.production.yml down

# Actualizar código y redesplegar
git pull origin main  # Si usas Git
./scripts/deploy.sh
```

---

## Estructura de Archivos

```
/opt/apps/morelatto/
├── app/                              # Código fuente de la API
├── backups/                          # Backups de base de datos
├── certs/                            # Certificados AFIP (opcional)
├── certbot/                          # Certificados SSL Let's Encrypt
├── nginx/                            # Configuración Nginx
├── scripts/                          # Scripts de utilidad
│   ├── deploy.sh                    # Desplegar aplicación
│   ├── setup-ssl.sh                 # Configurar SSL
│   ├── backup-db.sh                 # Backup de base de datos
│   ├── restore-db.sh                # Restaurar backup
│   └── logs.sh                      # Ver logs
├── .env                              # Variables de entorno (PRODUCCIÓN)
├── docker-compose.production.yml    # Docker Compose para producción
├── GUIA_DESPLIEGUE_PRODUCCION.md   # Guía completa
├── CONFIGURACION_WEBHOOKS.md        # Guía de webhooks
└── QUICK_START.md                   # Esta guía
```

---

## URLs Importantes

### Tu Aplicación
- **API**: https://api.morelattolanas.com
- **Health**: https://api.morelattolanas.com/health
- **Docs**: https://api.morelattolanas.com/docs

### Paneles
- **MercadoPago**: https://www.mercadopago.com.ar/developers
- **Stripe**: https://dashboard.stripe.com

---

## Credenciales de MercadoPago

Ya configuradas en tu `.env`:

```
Access Token: TU_ACCESS_TOKEN_AQUI
Public Key: TU_PUBLIC_KEY_AQUI
Webhook Secret: TU_CLAVE_WEBHOOK_AQUI
```

---

## Solución Rápida de Problemas

### No puedo conectarme al servidor
```bash
# Verificar conexión
ping 137.184.91.207

# Verificar SSH
ssh -v root@137.184.91.207
```

### Los servicios no inician
```bash
# Ver logs
docker compose -f docker-compose.production.yml logs

# Verificar .env
cat .env | grep -v "^#" | grep -v "^$"

# Reintentar
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

### SSL no funciona
```bash
# Verificar DNS
dig api.morelattolanas.com

# Verificar Nginx
docker compose -f docker-compose.production.yml exec nginx nginx -t

# Reintentar SSL
./scripts/setup-ssl.sh
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

## Checklist Final

Antes de considerar el despliegue completo:

- [ ] Servidor actualizado
- [ ] Docker instalado
- [ ] Código subido a `/opt/apps/morelatto`
- [ ] `.env` configurado con valores de producción
- [ ] Servicios corriendo (Docker Compose)
- [ ] DNS configurado
- [ ] SSL/HTTPS funcionando
- [ ] Webhooks de MercadoPago configurados
- [ ] Health check respondiendo OK
- [ ] Compra de prueba completada exitosamente

---

## Próximos Pasos

1. **Configurar backups automáticos**
   ```bash
   crontab -e
   # Agregar: 0 3 * * * cd /opt/apps/morelatto && ./scripts/backup-db.sh
   ```

2. **Monitorear logs regularmente**
   ```bash
   ./scripts/logs.sh
   ```

3. **Configurar dominio del frontend**
   - Apuntar `morelattolanas.com` a tu servidor frontend
   - O servir frontend desde el mismo servidor

4. **Probar flujo completo de compra**
   - Crear producto
   - Hacer compra
   - Verificar webhook
   - Crear envío

---

## Soporte

- **Documentación completa**: Ver `GUIA_DESPLIEGUE_PRODUCCION.md`
- **Webhooks**: Ver `CONFIGURACION_WEBHOOKS.md`
- **Pagos y envíos**: Ver `PAGOS_Y_ENVIOS.md`

---

**¡Tu aplicación debería estar en producción en menos de 30 minutos!**

Para cualquier problema, consulta las guías detalladas o revisa los logs.
