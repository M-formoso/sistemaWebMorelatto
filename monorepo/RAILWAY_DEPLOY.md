# Deploy en Railway - Morelatto Lanas

## Estructura del Proyecto

El proyecto tiene 3 servicios que deben deployarse en Railway:

1. **Backend (FastAPI)** - `monorepo/backend/`
2. **Ecommerce (Next.js)** - `monorepo/apps/ecommerce/`
3. **Sistema Admin (Next.js)** - `monorepo/apps/sistema/`

## Paso 1: Crear Proyecto en Railway

1. Ir a [railway.app](https://railway.app)
2. Crear nuevo proyecto
3. Conectar con tu repositorio de GitHub

## Paso 2: Configurar Base de Datos PostgreSQL

1. En tu proyecto de Railway, click "New Service" > "Database" > "PostgreSQL"
2. Copiar la variable `DATABASE_URL` que Railway genera automáticamente

## Paso 3: Deploy del Backend

### 3.1 Crear servicio
1. Click "New Service" > "GitHub Repo"
2. Seleccionar tu repositorio
3. En "Root Directory" poner: `monorepo/backend`

### 3.2 Variables de entorno (Settings > Variables)
```env
# Base de datos (copiar de PostgreSQL)
DATABASE_URL=postgresql://...

# Seguridad
SECRET_KEY=tu_clave_secreta_muy_larga_y_segura_123456789
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# App
APP_NAME=Morelatto API
DEBUG=False

# CORS - URLs de los frontends en Railway
FRONTEND_SISTEMA_URL=https://tu-sistema.up.railway.app
FRONTEND_ECOMMERCE_URL=https://tu-ecommerce.up.railway.app

# MercadoPago (producción)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxx
MERCADOPAGO_WEBHOOK_URL=https://tu-backend.up.railway.app/api/payments/webhook
MERCADOPAGO_SUCCESS_URL=https://tu-ecommerce.up.railway.app/checkout/confirmacion
MERCADOPAGO_FAILURE_URL=https://tu-ecommerce.up.railway.app/checkout/error
MERCADOPAGO_PENDING_URL=https://tu-ecommerce.up.railway.app/checkout/pendiente

# AFIP (opcional - para facturación electrónica)
AFIP_CUIT=20123456789
AFIP_PRODUCTION=False
AFIP_PUNTO_VENTA=1
```

### 3.3 Generar dominio
1. Settings > Networking > Generate Domain
2. Copiar la URL (ej: `morelatto-backend.up.railway.app`)

## Paso 4: Deploy del Ecommerce

### 4.1 Crear servicio
1. Click "New Service" > "GitHub Repo"
2. Seleccionar tu repositorio
3. En "Root Directory" poner: `monorepo/apps/ecommerce`

### 4.2 Variables de entorno
```env
NEXT_PUBLIC_API_URL=https://tu-backend.up.railway.app/api
NEXT_PUBLIC_SITE_URL=https://tu-ecommerce.up.railway.app
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxxxx
```

### 4.3 Generar dominio
1. Settings > Networking > Generate Domain
2. O configurar dominio personalizado (ej: `morelattolanas.com`)

## Paso 5: Deploy del Sistema Admin

### 5.1 Crear servicio
1. Click "New Service" > "GitHub Repo"
2. Seleccionar tu repositorio
3. En "Root Directory" poner: `monorepo/apps/sistema`

### 5.2 Variables de entorno
```env
NEXT_PUBLIC_API_URL=https://tu-backend.up.railway.app/api
NEXT_PUBLIC_SITE_URL=https://tu-sistema.up.railway.app
```

### 5.3 Generar dominio
1. Settings > Networking > Generate Domain
2. O configurar dominio personalizado (ej: `admin.morelattolanas.com`)

## Paso 6: Actualizar CORS en Backend

Una vez que tengas las URLs finales de los frontends, actualiza las variables del backend:

```env
FRONTEND_SISTEMA_URL=https://admin.morelattolanas.com
FRONTEND_ECOMMERCE_URL=https://morelattolanas.com
```

## Paso 7: Crear Usuario Admin

1. Ir a `https://tu-ecommerce.up.railway.app/api/docs`
2. Usar el endpoint `/auth/create-admin` para crear el primer admin
3. O ejecutar en Railway Console del backend:
```bash
python -c "
from app.db.session import get_db
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy.orm import Session
import uuid

# Conectar a la DB
db = next(get_db())

# Crear admin
admin = User(
    id=str(uuid.uuid4()),
    email='admin@morelattolanas.com',
    hashed_password=get_password_hash('tu_password_seguro'),
    full_name='Administrador',
    role='admin',
    is_active=True
)
db.add(admin)
db.commit()
print('Admin creado!')
"
```

## Dominios Personalizados (Opcional)

Para usar dominios propios:

1. En Railway, ir a Settings > Networking > Custom Domains
2. Agregar el dominio (ej: `morelattolanas.com`)
3. En tu proveedor de DNS, agregar registro CNAME:
   - Nombre: `@` o `www`
   - Valor: `tu-servicio.up.railway.app`

## Verificar Deploy

1. **Backend**: `https://tu-backend.up.railway.app/health` debe retornar `{"status": "healthy"}`
2. **Ecommerce**: `https://tu-ecommerce.up.railway.app` debe cargar la tienda
3. **Sistema**: `https://tu-sistema.up.railway.app/login` debe mostrar login

## Troubleshooting

### Error de conexión a DB
- Verificar que `DATABASE_URL` esté correctamente copiada
- El formato debe ser: `postgresql://user:pass@host:port/dbname`

### Error de CORS
- Verificar que `FRONTEND_SISTEMA_URL` y `FRONTEND_ECOMMERCE_URL` tengan las URLs correctas
- No incluir `/` al final de las URLs

### Build falla
- Revisar logs en Railway
- Verificar que el `Root Directory` esté bien configurado

### Migraciones no corren
- El comando de start ya incluye `alembic upgrade head`
- Si falla, revisar los logs del backend
