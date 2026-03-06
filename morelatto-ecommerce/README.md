# Morelatto Ecommerce (EverShop)

Tienda online de Morelatto Lanas usando EverShop como plataforma.

## Inicio Rapido

### 1. Levantar con Docker

```bash
docker compose up -d
```

### 2. Acceder

- **Tienda**: http://localhost:3002
- **Admin Panel**: http://localhost:3002/admin

### 3. Primer uso

Al iniciar por primera vez, debes crear un usuario administrador.
Accede a http://localhost:3002/admin y sigue el wizard de configuracion.

## Arquitectura

```
Sistema Morelatto:
├── Backend Python (Puerto 8000) - Sistema Admin interno
├── Sistema Admin Next.js (Puerto 3001) - Panel de gestion
└── EverShop (Puerto 3002) - Tienda online
    ├── Storefront (tienda publica)
    └── Admin EverShop (gestion de ecommerce)
```

## Estructura

```
morelatto-ecommerce/
├── docker-compose.yml    # Configuracion Docker
├── themes/               # Temas personalizados
├── extensions/           # Extensiones custom
└── README.md
```

## Personalizacion

### Tema

Para crear un tema personalizado para Morelatto:

1. Crear carpeta en `themes/morelatto`
2. Personalizar colores, logo, etc.
3. Activar tema desde el Admin

### Extensiones

Para agregar funcionalidad:

1. Crear extension en `extensions/`
2. Seguir documentacion de EverShop

## Sincronizacion con Sistema Admin

Los productos se pueden gestionar desde:

1. **Sistema Admin (Python)**: Para inventario interno y ventas locales
2. **EverShop Admin**: Para la tienda online

Para sincronizar, se puede usar la API de EverShop o crear una extension.

## Comandos Utiles

```bash
# Ver logs
docker compose logs -f

# Reiniciar
docker compose restart

# Parar
docker compose down

# Parar y eliminar datos
docker compose down -v
```

## Soporte

- Documentacion EverShop: https://evershop.io/docs
- Demo: https://demo.evershop.io
