# Morelatto Backend API

Backend unificado para el Sistema de Gestión y Ecommerce de Morelatto Lanas.

## Tecnologías

- **FastAPI** - Framework web moderno y rápido
- **PostgreSQL** - Base de datos relacional
- **SQLAlchemy** - ORM
- **Alembic** - Migraciones de base de datos
- **Docker** - Containerización

## Estructura del Proyecto

```
backend/
├── app/
│   ├── api/
│   │   └── routes/          # Endpoints de la API
│   ├── core/                # Configuración y seguridad
│   ├── db/                  # Configuración de base de datos
│   ├── models/              # Modelos SQLAlchemy
│   ├── schemas/             # Schemas Pydantic
│   ├── services/            # Lógica de negocio
│   └── main.py              # Punto de entrada
├── alembic/                 # Migraciones
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env
```

## Inicio Rápido con Docker

### 1. Levantar los servicios

```bash
cd backend
docker-compose up -d
```

Esto levantará:
- PostgreSQL en puerto 5432
- API en puerto 8000

### 2. Ver logs

```bash
docker-compose logs -f api
```

### 3. Acceder a la documentación

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Desarrollo Local (sin Docker)

### 1. Crear entorno virtual

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
.\venv\Scripts\activate  # Windows
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores
```

### 4. Levantar solo PostgreSQL con Docker

```bash
docker-compose up -d db
```

### 5. Ejecutar migraciones

```bash
alembic upgrade head
```

### 6. Iniciar el servidor

```bash
uvicorn app.main:app --reload
```

## Crear Usuario Admin Inicial

```bash
curl -X POST "http://localhost:8000/api/auth/create-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@morelatto.com",
    "password": "tu_password_seguro",
    "full_name": "Administrador"
  }'
```

## Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/create-admin` - Crear admin inicial

### Productos
- `GET /api/products` - Listar productos (admin)
- `GET /api/products/public` - Productos públicos (ecommerce)
- `GET /api/products/{id}` - Obtener producto
- `POST /api/products` - Crear producto
- `PUT /api/products/{id}` - Actualizar producto
- `DELETE /api/products/{id}` - Eliminar producto

### Ventas (Sistema)
- `GET /api/sales` - Listar ventas
- `POST /api/sales` - Crear venta
- `GET /api/sales/{id}` - Obtener venta

### Pedidos (Ecommerce)
- `GET /api/orders` - Listar pedidos
- `POST /api/orders` - Crear pedido
- `GET /api/orders/cart` - Ver carrito
- `POST /api/orders/cart` - Agregar al carrito

### Talleres
- `GET /api/workshops` - Listar talleres
- `GET /api/workshops/public` - Talleres públicos
- `POST /api/workshops` - Crear taller

### Dashboard
- `GET /api/dashboard/summary` - Resumen general
- `GET /api/dashboard/sales-by-period` - Ventas por periodo
- `GET /api/dashboard/top-products` - Productos más vendidos

## Migraciones

### Crear nueva migración

```bash
alembic revision --autogenerate -m "descripcion del cambio"
```

### Aplicar migraciones

```bash
alembic upgrade head
```

### Revertir última migración

```bash
alembic downgrade -1
```

## Configuración de los Frontends

Actualizar los archivos `.env` de ambos frontends para apuntar al nuevo backend:

```env
VITE_API_URL=http://localhost:8000/api
```

## Licencia

Privado - Morelatto Lanas
