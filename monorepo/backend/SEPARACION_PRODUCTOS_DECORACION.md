# Separación entre Productos y Decoración

## Resumen

Las categorías y productos ahora están completamente separados por sección. Hay dos secciones independientes:
- `"productos"` - Sección de productos normales (lanas, hilos, etc.)
- `"decoracion"` - Sección de productos de decoración

## Cambios Realizados

### 1. Base de Datos

Se agregó el campo `section` a la tabla `categories`:

```sql
ALTER TABLE categories
ADD COLUMN section VARCHAR(50) DEFAULT 'productos' NOT NULL;
```

**Valores posibles:**
- `"productos"` (por defecto)
- `"decoracion"`

### 2. Modelo Category

```python
class Category(Base, TimestampMixin):
    # ... otros campos ...
    section = Column(String(50), default="productos", nullable=False)
```

### 3. Schema de Pydantic

```python
class CategoryBase(BaseModel):
    name: str
    slug: str
    # ... otros campos ...
    section: str = "productos"  # "productos" o "decoracion"
```

## Endpoints Actualizados

### GET /api/categories

Filtra categorías por sección:

```bash
# Obtener todas las categorías
curl http://localhost:8000/api/categories

# Obtener solo categorías de productos
curl http://localhost:8000/api/categories?section=productos

# Obtener solo categorías de decoración
curl http://localhost:8000/api/categories?section=decoracion
```

### POST /api/categories

Al crear una categoría, especifica la sección:

```json
{
  "name": "Textiles",
  "slug": "textiles",
  "description": "Categoría de productos textiles",
  "section": "productos"
}
```

```json
{
  "name": "Adornos",
  "slug": "adornos",
  "description": "Categoría de productos decorativos",
  "section": "decoracion"
}
```

### GET /api/products/public

Filtra productos por sección de su categoría:

```bash
# Productos de la sección "productos"
curl "http://localhost:8000/api/products/public?section=productos"

# Productos de la sección "decoracion"
curl "http://localhost:8000/api/products/public?section=decoracion"
```

## Uso en el Frontend

### Panel de Administración

#### Sección "Productos"

Cuando estés en la sección de productos del admin (`/sistema/productos`), debes:

1. **Listar categorías** con filtro de productos:
   ```typescript
   const { data: categories } = useQuery({
     queryKey: ['categories', 'productos'],
     queryFn: () => api.getCategories({ section: 'productos' })
   });
   ```

2. **Crear categoría** especificando la sección:
   ```typescript
   await api.createCategory({
     name: "Nueva categoría",
     slug: "nueva-categoria",
     section: "productos"  // ← Importante
   });
   ```

3. **Listar productos** con filtro:
   ```typescript
   const { data: products } = useQuery({
     queryKey: ['products', 'productos'],
     queryFn: () => api.getProducts({ section: 'productos' })
   });
   ```

#### Sección "Decoración"

Cuando estés en la sección de decoración del admin (`/sistema/decoracion`), debes:

1. **Listar categorías** con filtro de decoración:
   ```typescript
   const { data: categories } = useQuery({
     queryKey: ['categories', 'decoracion'],
     queryFn: () => api.getCategories({ section: 'decoracion' })
   });
   ```

2. **Crear categoría** especificando la sección:
   ```typescript
   await api.createCategory({
     name: "Adornos",
     slug: "adornos",
     section: "decoracion"  // ← Importante
   });
   ```

3. **Listar productos** con filtro:
   ```typescript
   const { data: products } = useQuery({
     queryKey: ['products', 'decoracion'],
     queryFn: () => api.getProducts({ section: 'decoracion' })
   });
   ```

### E-commerce (Tienda Online)

#### Página de Productos

```typescript
// /tienda
const { data: productosData } = usePublicProducts({
  section: 'productos'
});
```

#### Página de Decoración

```typescript
// /decoracion
const { data: decoracionData } = usePublicProducts({
  section: 'decoracion'
});
```

## Flujo de Trabajo

### Crear Producto en Sección "Productos"

1. Usuario va al panel admin → Sección "Productos"
2. Clic en "Agregar Producto"
3. Completa el formulario
4. Al seleccionar categoría, **solo verá categorías con `section: "productos"`**
5. El producto queda asociado a una categoría de productos
6. El producto aparece en `/tienda` (no en `/decoracion`)

### Crear Producto en Sección "Decoración"

1. Usuario va al panel admin → Sección "Decoración"
2. Clic en "Agregar Producto"
3. Completa el formulario
4. Al seleccionar categoría, **solo verá categorías con `section: "decoracion"`**
5. El producto queda asociado a una categoría de decoración
6. El producto aparece en `/decoracion` (no en `/tienda`)

## Migración de Categorías Existentes

Todas las categorías existentes fueron configuradas automáticamente con `section: "productos"`.

Si necesitas mover algunas categorías a decoración:

```sql
-- Ver todas las categorías y su sección actual
SELECT id, name, section FROM categories;

-- Cambiar una categoría a decoración
UPDATE categories
SET section = 'decoracion'
WHERE slug = 'adornos';

-- Cambiar varias categorías
UPDATE categories
SET section = 'decoracion'
WHERE slug IN ('adornos', 'textiles-decorativos', 'accesorios-deco');
```

## Validaciones Importantes

### En el Frontend

1. **Al crear categoría**, el formulario debe enviar el campo `section` según en qué sección del admin estés
2. **Al listar categorías**, siempre filtrar por `section`
3. **Al crear producto**, solo mostrar categorías de la sección correspondiente
4. **Al listar productos**, filtrar por `section` si quieres mostrar solo de una sección específica

### En el Backend

El backend ya está configurado para:
- ✅ Aceptar el campo `section` al crear/actualizar categorías
- ✅ Filtrar categorías por `section`
- ✅ Filtrar productos por `section` de su categoría
- ✅ Incluir el campo `section` en las respuestas de categorías

## Verificación

### Probar la separación:

```bash
# 1. Crear categoría de productos
curl -X POST http://localhost:8000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Lanas",
    "slug": "lanas",
    "section": "productos"
  }'

# 2. Crear categoría de decoración
curl -X POST http://localhost:8000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Adornos",
    "slug": "adornos",
    "section": "decoracion"
  }'

# 3. Verificar que solo aparecen categorías de productos
curl "http://localhost:8000/api/categories?section=productos"

# 4. Verificar que solo aparecen categorías de decoración
curl "http://localhost:8000/api/categories?section=decoracion"
```

## Resumen de Cambios en API Client

Necesitarás actualizar el `@morelatto/api-client` para agregar el parámetro `section`:

```typescript
// packages/api-client/src/client.ts

async getCategories(params?: {
  section?: 'productos' | 'decoracion';
  is_active?: boolean;
}) {
  const queryParams = new URLSearchParams();
  if (params?.section) queryParams.append('section', params.section);
  if (params?.is_active !== undefined) queryParams.append('is_active', String(params.is_active));

  return this.request(`/categories?${queryParams.toString()}`);
}

async createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  section: 'productos' | 'decoracion';
}) {
  return this.request('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async getPublicProducts(params?: {
  section?: 'productos' | 'decoracion';
  category_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.section) queryParams.append('section', params.section);
  if (params?.category_id) queryParams.append('category_id', params.category_id);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.page_size) queryParams.append('page_size', String(params.page_size));

  return this.request(`/products/public?${queryParams.toString()}`);
}
```

## Conclusión

Ahora productos y decoración son **completamente independientes**:

- ✅ Cada sección tiene sus propias categorías
- ✅ Las categorías no se comparten entre secciones
- ✅ Los productos se filtran por la sección de su categoría
- ✅ El frontend puede mostrar solo lo relevante para cada sección
- ✅ El backend valida y filtra correctamente por sección
