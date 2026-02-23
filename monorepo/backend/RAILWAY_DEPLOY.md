# Deployment en Railway - Morelatto API

## Prerequisitos

- Cuenta en [Railway](https://railway.app)
- Repositorio en GitHub conectado a Railway

## Pasos para el Deployment

### 1. Crear Proyecto en Railway

1. Ve a [Railway Dashboard](https://railway.app/dashboard)
2. Click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Conecta tu cuenta de GitHub si no lo has hecho
5. Selecciona el repositorio **morelatto-lanas** (o como se llame)

### 2. Configurar el Root Directory

Como el backend está en una subcarpeta del monorepo:

1. En el servicio creado, ve a **Settings**
2. En **"Root Directory"** ingresa: `monorepo/backend`
3. Railway detectará automáticamente que es un proyecto Python

### 3. Agregar PostgreSQL

1. En tu proyecto, click en **"+ New"**
2. Selecciona **"Database"** → **"Add PostgreSQL"**
3. Railway creará la base de datos y agregará automáticamente la variable `DATABASE_URL`

### 4. Configurar Variables de Entorno

Ve a tu servicio → **Variables** y agrega las siguientes:

#### Variables Obligatorias:

```env
SECRET_KEY=<genera con: openssl rand -hex 32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
APP_NAME=Morelatto API
DEBUG=False
FRONTEND_SISTEMA_URL=https://tu-sistema.railway.app
FRONTEND_ECOMMERCE_URL=https://tu-ecommerce.railway.app
```

#### Variables de MercadoPago (Pagos):

```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxx
MERCADOPAGO_WEBHOOK_URL=https://<tu-app>.railway.app/api/payments/webhook
MERCADOPAGO_SUCCESS_URL=https://tu-ecommerce.railway.app/checkout/success
MERCADOPAGO_FAILURE_URL=https://tu-ecommerce.railway.app/checkout/failure
MERCADOPAGO_PENDING_URL=https://tu-ecommerce.railway.app/checkout/pending
```

> Ver archivo `.env.railway` para la lista completa de variables

### 5. Deploy

Una vez configurado, Railway desplegará automáticamente:

1. Instalará dependencias de Python
2. Ejecutará migraciones de Alembic (`alembic upgrade head`)
3. Iniciará el servidor Uvicorn

### 6. Verificar el Deployment

Una vez desplegado:

1. Railway generará una URL pública (ej: `https://morelatto-api.railway.app`)
2. Visita `https://tu-url.railway.app/health` - debe retornar `{"status": "healthy"}`
3. Visita `https://tu-url.railway.app/docs` para ver la documentación de la API

### 7. Crear Usuario Admin Inicial

Después del primer deploy, crea el usuario admin:

```bash
# Opción 1: Usar el endpoint de la API
curl -X POST https://tu-url.railway.app/api/auth/create-first-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@morelatto.com", "password": "tu_password_seguro"}'

# Opción 2: Railway CLI
railway run python -c "
from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
admin = User(
    email='admin@morelatto.com',
    hashed_password=get_password_hash('tu_password_seguro'),
    full_name='Admin',
    role='admin',
    is_active=True
)
db.add(admin)
db.commit()
print('Admin creado!')
"
```

## Estructura de Archivos para Railway

```
monorepo/backend/
├── railway.json       # Configuración de Railway
├── Procfile           # Comando de inicio
├── nixpacks.toml      # Configuración de Nixpacks
├── runtime.txt        # Versión de Python
├── requirements.txt   # Dependencias
├── alembic/           # Migraciones de BD
└── app/               # Código de la aplicación
```

## Comandos Útiles de Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Conectar proyecto local
railway link

# Ver logs
railway logs

# Ejecutar comando en el servidor
railway run <comando>

# Variables de entorno
railway variables
```

## Dominio Personalizado

1. Ve a tu servicio → **Settings** → **Networking**
2. En "Public Networking", click en **"Generate Domain"** o agrega un dominio custom
3. Para dominio custom:
   - Agrega un registro CNAME apuntando a Railway
   - Railway generará SSL automáticamente

## Troubleshooting

### Error: "No module named 'app'"
- Verifica que el **Root Directory** esté configurado como `monorepo/backend`

### Error: "Connection refused" en PostgreSQL
- Espera unos segundos después del deploy para que la BD esté lista
- Verifica que la variable `DATABASE_URL` exista

### Error en migraciones de Alembic
- Asegúrate de que `alembic/versions/` tenga los archivos de migración
- Verifica la conexión a la BD

### Logs vacíos o error 500
- Revisa los logs en Railway Dashboard
- Agrega `DEBUG=True` temporalmente para ver errores detallados

## Costos Estimados

Railway tiene un modelo de pago por uso:
- **Free Tier**: $5/mes de créditos gratis
- **Hobby Plan**: $5/mes base + uso
- **PostgreSQL**: ~$5-10/mes para uso básico

Para más info: https://railway.app/pricing
