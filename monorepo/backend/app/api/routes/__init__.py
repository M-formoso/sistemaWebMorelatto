from fastapi import APIRouter

from app.api.routes import (
    auth, products, sales, orders, workshops, clients,
    categories, dashboard, shipping, payment_methods, news,
    payments, invoices, users, images
)

api_router = APIRouter()

# Auth
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticacion"])

# Sistema
api_router.include_router(products.router, prefix="/products", tags=["Productos"])
api_router.include_router(sales.router, prefix="/sales", tags=["Ventas"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clientes"])
api_router.include_router(workshops.router, prefix="/workshops", tags=["Talleres"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(invoices.router)
api_router.include_router(users.router)

# Ecommerce
api_router.include_router(categories.router, prefix="/categories", tags=["Categorias"])
api_router.include_router(orders.router, prefix="/orders", tags=["Pedidos"])
api_router.include_router(shipping.router)
api_router.include_router(payment_methods.router)
api_router.include_router(news.router)
api_router.include_router(payments.router)

# Images
api_router.include_router(images.router, prefix="/images", tags=["Imagenes"])
