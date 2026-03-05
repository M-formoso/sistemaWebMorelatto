"""
Endpoints para importar/exportar productos en masa
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import csv
import io
from decimal import Decimal, InvalidOperation

from app.db.session import get_db
from app.models.product import Product, Category
from app.core.security import get_current_admin

router = APIRouter()


def generate_slug(name: str, existing_slugs: set) -> str:
    """Genera un slug unico"""
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    base_slug = slug
    counter = 1
    while slug in existing_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


@router.get("/products/template")
async def download_product_template(
    _: dict = Depends(get_current_admin)
):
    """Descargar plantilla CSV para importar productos"""
    output = io.StringIO()
    writer = csv.writer(output)

    # Encabezados
    headers = [
        "codigo",  # Requerido, unico
        "nombre",  # Requerido
        "descripcion",
        "precio",  # Requerido
        "costo",
        "stock",
        "stock_minimo",
        "peso_gramos",
        "color",
        "categoria",  # Nombre de categoria existente
        "activo",  # Si/No
        "destacado",  # Si/No
        "mostrar_decoracion"  # Si/No
    ]
    writer.writerow(headers)

    # Fila de ejemplo
    example = [
        "LANA-001",
        "Lana Merino Azul",
        "Lana merino premium de alta calidad",
        "1500.00",
        "800.00",
        "50",
        "5",
        "100",
        "Azul",
        "Lanas",
        "Si",
        "No",
        "No"
    ]
    writer.writerow(example)

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=plantilla_productos.csv"
        }
    )


@router.post("/products/import")
async def import_products(
    file: UploadFile = File(...),
    update_existing: bool = False,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """
    Importar productos desde archivo CSV

    Args:
        file: Archivo CSV
        update_existing: Si es True, actualiza productos existentes (por codigo)

    Returns:
        Resumen de la importacion
    """
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser CSV")

    # Leer contenido
    try:
        content = await file.read()
        # Intentar decodificar como UTF-8, si falla usar latin-1
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer archivo: {str(e)}")

    # Parsear CSV
    reader = csv.DictReader(io.StringIO(text))

    # Obtener categorias existentes
    categories = {c.name.lower(): c for c in db.query(Category).all()}

    # Obtener productos existentes por codigo
    existing_products = {p.code: p for p in db.query(Product).all()}

    # Obtener slugs existentes
    existing_slugs = {p.slug for p in db.query(Product).filter(Product.slug.isnot(None)).all()}

    results = {
        "total": 0,
        "created": 0,
        "updated": 0,
        "skipped": 0,
        "errors": []
    }

    for row_num, row in enumerate(reader, start=2):  # Empieza en 2 (despues del header)
        results["total"] += 1

        try:
            # Validar campos requeridos
            codigo = row.get("codigo", "").strip()
            nombre = row.get("nombre", "").strip()
            precio_str = row.get("precio", "").strip()

            if not codigo:
                results["errors"].append(f"Fila {row_num}: codigo es requerido")
                results["skipped"] += 1
                continue

            if not nombre:
                results["errors"].append(f"Fila {row_num}: nombre es requerido")
                results["skipped"] += 1
                continue

            if not precio_str:
                results["errors"].append(f"Fila {row_num}: precio es requerido")
                results["skipped"] += 1
                continue

            # Parsear precio
            try:
                precio = Decimal(precio_str.replace(",", "."))
            except InvalidOperation:
                results["errors"].append(f"Fila {row_num}: precio invalido '{precio_str}'")
                results["skipped"] += 1
                continue

            # Parsear otros campos numericos
            costo = None
            if row.get("costo", "").strip():
                try:
                    costo = Decimal(row["costo"].strip().replace(",", "."))
                except InvalidOperation:
                    pass

            stock = 0
            if row.get("stock", "").strip():
                try:
                    stock = int(row["stock"].strip())
                except ValueError:
                    pass

            stock_min = 5
            if row.get("stock_minimo", "").strip():
                try:
                    stock_min = int(row["stock_minimo"].strip())
                except ValueError:
                    pass

            peso = None
            if row.get("peso_gramos", "").strip():
                try:
                    peso = Decimal(row["peso_gramos"].strip().replace(",", "."))
                except InvalidOperation:
                    pass

            # Buscar categoria
            category_id = None
            categoria_nombre = row.get("categoria", "").strip().lower()
            if categoria_nombre and categoria_nombre in categories:
                category_id = categories[categoria_nombre].id

            # Parsear booleanos
            def parse_bool(value: str) -> bool:
                return value.strip().lower() in ("si", "sí", "yes", "true", "1")

            is_active = parse_bool(row.get("activo", "si"))
            is_featured = parse_bool(row.get("destacado", "no"))
            show_in_decoration = parse_bool(row.get("mostrar_decoracion", "no"))

            # Crear o actualizar producto
            if codigo in existing_products:
                if update_existing:
                    product = existing_products[codigo]
                    product.name = nombre
                    product.description = row.get("descripcion", "").strip() or None
                    product.price = precio
                    product.cost = costo
                    product.stock = stock
                    product.stock_min = stock_min
                    product.weight = peso
                    product.color = row.get("color", "").strip() or None
                    product.category_id = category_id
                    product.is_active = is_active
                    product.is_featured = is_featured
                    product.show_in_decoration = show_in_decoration
                    results["updated"] += 1
                else:
                    results["errors"].append(f"Fila {row_num}: codigo '{codigo}' ya existe")
                    results["skipped"] += 1
                    continue
            else:
                # Generar slug
                slug = generate_slug(nombre, existing_slugs)
                existing_slugs.add(slug)

                product = Product(
                    code=codigo,
                    name=nombre,
                    description=row.get("descripcion", "").strip() or None,
                    price=precio,
                    cost=costo,
                    stock=stock,
                    stock_min=stock_min,
                    weight=peso,
                    color=row.get("color", "").strip() or None,
                    category_id=category_id,
                    slug=slug,
                    is_active=is_active,
                    is_featured=is_featured,
                    show_in_decoration=show_in_decoration
                )
                db.add(product)
                existing_products[codigo] = product  # Para detectar duplicados en el mismo archivo
                results["created"] += 1

        except Exception as e:
            results["errors"].append(f"Fila {row_num}: error inesperado - {str(e)}")
            results["skipped"] += 1

    # Guardar cambios
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar: {str(e)}")

    return results


@router.get("/products/export")
async def export_products(
    category_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin)
):
    """
    Exportar productos a CSV

    Args:
        category_id: Filtrar por categoria
        is_active: Filtrar por estado activo
    """
    query = db.query(Product)

    if category_id:
        query = query.filter(Product.category_id == category_id)

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)

    products = query.order_by(Product.name).all()

    # Obtener categorias
    categories = {c.id: c.name for c in db.query(Category).all()}

    output = io.StringIO()
    writer = csv.writer(output)

    # Encabezados
    headers = [
        "codigo",
        "nombre",
        "descripcion",
        "precio",
        "costo",
        "stock",
        "stock_minimo",
        "peso_gramos",
        "color",
        "categoria",
        "activo",
        "destacado",
        "mostrar_decoracion"
    ]
    writer.writerow(headers)

    # Datos
    for p in products:
        writer.writerow([
            p.code,
            p.name,
            p.description or "",
            str(p.price),
            str(p.cost) if p.cost else "",
            p.stock,
            p.stock_min,
            str(p.weight) if p.weight else "",
            p.color or "",
            categories.get(p.category_id, "") if p.category_id else "",
            "Si" if p.is_active else "No",
            "Si" if p.is_featured else "No",
            "Si" if p.show_in_decoration else "No"
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=productos.csv"
        }
    )
