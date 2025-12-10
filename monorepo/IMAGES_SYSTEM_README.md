# Sistema de Gestión de Imágenes de Productos

## Descripción General

Se ha implementado un sistema completo para manejar múltiples imágenes por producto en el ecommerce, con las siguientes características:

- ✅ **Múltiples imágenes por producto** (hasta 10 por defecto)
- ✅ **Preview en tiempo real** al cargar imágenes
- ✅ **Imagen principal** seleccionable
- ✅ **Drag & drop** para reordenar imágenes
- ✅ **Optimización automática** de imágenes (redimensión, compresión)
- ✅ **Galería completa** en la vista de detalle del producto
- ✅ **Imagen principal** en las cards de productos

---

## Estructura del Sistema

### Backend

#### 1. Modelo de Datos (`product.py`)
```python
class ProductImage:
    - id: UUID
    - product_id: UUID (FK a products)
    - image_url: str
    - is_primary: bool  # Imagen principal
    - display_order: int  # Orden de visualización
    - alt_text: str (opcional)
```

#### 2. Servicio de Imágenes (`image_service.py`)
- **Ubicación**: `/monorepo/backend/app/services/image_service.py`
- **Funciones principales**:
  - `upload_image()`: Sube una imagen individual
  - `upload_multiple_images()`: Sube múltiples imágenes
  - `optimize_image()`: Optimiza tamaño y calidad
  - `delete_image()`: Elimina imagen del filesystem
  - `validate_image()`: Valida formato y tamaño

**Configuración**:
- Directorio de uploads: `uploads/products/`
- Formatos permitidos: JPG, JPEG, PNG, WEBP
- Tamaño máximo: 5MB por imagen
- Dimensiones máximas: 1920x1920px

#### 3. Endpoints API (`/api/images`)

**Upload de imágenes**:
```
POST /api/images/upload
POST /api/images/upload/multiple
```

**Gestión de imágenes de productos**:
```
POST   /api/images/products/{product_id}/images
GET    /api/images/products/{product_id}/images
PATCH  /api/images/products/images/{image_id}
DELETE /api/images/products/images/{image_id}
POST   /api/images/products/{product_id}/images/set-primary/{image_id}
PATCH  /api/images/products/{product_id}/images/reorder
```

---

### Frontend

#### 1. Componente ImageUploader
**Ubicación**: `/monorepo/apps/ecommerce/src/components/admin/ImageUploader.tsx`

**Características**:
- Preview de imágenes en tiempo real
- Drag & drop para reordenar
- Selección de imagen principal
- Eliminación de imágenes
- Indicador de progreso al subir

**Uso en componentes admin**:
```tsx
import ImageUploader from '@/components/admin/ImageUploader';

const [images, setImages] = useState<ProductImage[]>([]);

<ImageUploader
  productId={product?.id}
  images={images}
  onImagesChange={setImages}
  maxImages={10}
/>
```

#### 2. ProductCard Actualizado
**Ubicación**: `/monorepo/apps/ecommerce/src/components/shop/ProductCard.tsx`

Prioridad de imagen:
1. Imagen de variante seleccionada
2. Imagen principal del array `images`
3. Primera imagen del array `images`
4. Imagen legacy (`image_url`)

#### 3. ProductDetail con Galería
**Ubicación**: `/monorepo/apps/ecommerce/src/components/product/ProductDetail.tsx`

**Características**:
- Galería de thumbnails clickeables
- Zoom de imagen principal
- Separación visual entre galería general y variantes de color
- Navegación intuitiva entre imágenes

---

## Instalación y Configuración

### 1. Dependencias del Backend

Asegúrate de tener instaladas las siguientes dependencias en el backend:

```bash
cd monorepo/backend
pip install Pillow  # Para procesamiento de imágenes
```

### 2. Migración de Base de Datos

Ejecuta el script SQL para crear la tabla `product_images`:

```bash
# Usando psql
psql -U your_user -d your_database -f migrations/add_product_images.sql

# O desde un cliente SQL
# Ejecuta el contenido de: /monorepo/backend/migrations/add_product_images.sql
```

La migración incluye:
- Creación de tabla `product_images`
- Índices para rendimiento
- Trigger para `updated_at`
- Migración automática de imágenes existentes desde `products.image_url`

### 3. Directorio de Uploads

El directorio de uploads se crea automáticamente al iniciar el servidor, pero puedes crearlo manualmente:

```bash
mkdir -p monorepo/backend/uploads/products
```

### 4. Permisos

Asegúrate de que el servidor tenga permisos de escritura:

```bash
chmod -R 755 monorepo/backend/uploads
```

---

## Uso en el Panel de Administración

### Crear/Editar Producto con Imágenes

1. **Navega al panel de administración** → Productos
2. **Crea o edita un producto**
3. **En la sección de imágenes**:
   - Click en "Subir imágenes" o arrastra archivos
   - Las imágenes se suben automáticamente
   - Se muestran previews en tiempo real
4. **Gestionar imágenes**:
   - **Reordenar**: Arrastra las cards de imágenes
   - **Hacer principal**: Click en "Hacer principal"
   - **Eliminar**: Click en "Eliminar"

### Tips de Uso

- La primera imagen subida se marca automáticamente como principal
- Puedes subir hasta 10 imágenes por producto (configurable)
- Las imágenes se optimizan automáticamente al subirlas
- El orden de las imágenes se guarda automáticamente

---

## Visualización en el Ecommerce

### Vista de Listado (Tienda)
- Muestra la **imagen principal** de cada producto
- Si hay variantes con imágenes, se puede seleccionar variante y ver su imagen
- Fallback a `image_url` si no hay imágenes en el array

### Vista de Detalle (Producto)
1. **Imagen principal grande** con zoom
2. **Galería de thumbnails** debajo (si hay más de 1 imagen)
3. **Variantes de color** en sección separada (si hay variantes)
4. **Navegación intuitiva**:
   - Click en thumbnail para ver imagen
   - Click en variante para ver imagen de variante
   - Las selecciones son independientes

---

## Estructura de Datos

### ProductImage Interface (TypeScript)
```typescript
interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  alt_text?: string;
}
```

### Ejemplo de Producto con Imágenes
```json
{
  "id": "uuid",
  "name": "Lana Merino Premium",
  "price": 1500,
  "image_url": "legacy_url.jpg",  // Retrocompatibilidad
  "images": [
    {
      "id": "img1",
      "image_url": "/uploads/products/xyz.jpg",
      "is_primary": true,
      "display_order": 0,
      "alt_text": "Vista frontal"
    },
    {
      "id": "img2",
      "image_url": "/uploads/products/abc.jpg",
      "is_primary": false,
      "display_order": 1,
      "alt_text": "Vista lateral"
    }
  ]
}
```

---

## API Client

Los métodos del API client están en `/monorepo/packages/api-client/src/client.ts`:

```typescript
// Upload
await api.uploadImage(formData);
await api.uploadMultipleImages(formData);

// Gestión
await api.addProductImage(productId, imageData);
await api.getProductImages(productId);
await api.updateProductImage(imageId, imageData);
await api.deleteProductImage(imageId);
await api.setPrimaryImage(productId, imageId);
await api.reorderImages(productId, imageOrders);
```

---

## Configuración Avanzada

### Cambiar Límites de Imágenes

En `ImageUploader.tsx`:
```tsx
<ImageUploader maxImages={20} />  // Cambiar de 10 a 20
```

En `image_service.py`:
```python
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_IMAGE_WIDTH = 2400
MAX_IMAGE_HEIGHT = 2400
```

### Agregar Formatos Adicionales

En `image_service.py`:
```python
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
```

---

## Troubleshooting

### Las imágenes no se suben
1. Verifica que el directorio `uploads/products/` existe
2. Verifica permisos de escritura
3. Revisa logs del backend para errores de PIL/Pillow
4. Verifica que el tamaño no exceda 5MB

### Las imágenes no se muestran en el frontend
1. Verifica que el backend esté sirviendo archivos estáticos
2. Revisa la URL en el navegador
3. Verifica que las rutas en `main.py` estén montadas correctamente

### Error de CORS al subir imágenes
1. Verifica configuración de CORS en `main.py`
2. Asegúrate de que el origen del frontend esté permitido

---

## Archivos Modificados/Creados

### Backend
- ✅ `app/models/product.py` - Modelo ProductImage
- ✅ `app/schemas/product.py` - Schemas ProductImage
- ✅ `app/services/image_service.py` - Servicio de imágenes (NUEVO)
- ✅ `app/api/routes/images.py` - Endpoints de imágenes (NUEVO)
- ✅ `app/api/routes/__init__.py` - Registro de router
- ✅ `app/api/routes/products.py` - Incluir images en queries
- ✅ `app/main.py` - Montar archivos estáticos
- ✅ `migrations/add_product_images.sql` - Migración SQL (NUEVO)

### Frontend
- ✅ `apps/ecommerce/src/components/admin/ImageUploader.tsx` - Componente de upload (NUEVO)
- ✅ `apps/ecommerce/src/components/shop/ProductCard.tsx` - Usar images array
- ✅ `apps/ecommerce/src/components/product/ProductDetail.tsx` - Galería completa
- ✅ `apps/ecommerce/src/hooks/useProducts.ts` - Interface ProductImage
- ✅ `apps/ecommerce/src/pages/Tienda.tsx` - Pasar images a ProductCard
- ✅ `packages/api-client/src/client.ts` - Métodos de API para imágenes

---

## Próximos Pasos

Para integrar completamente el sistema:

1. **Ejecutar migración de base de datos**
2. **Actualizar ProductsManager** para usar ImageUploader
3. **Instalar dependencia Pillow** en el backend
4. **Reiniciar servicios** backend y frontend
5. **Probar flujo completo** de subida de imágenes

---

## Soporte

Para dudas o problemas con el sistema de imágenes, revisa:
- Logs del backend en la consola
- Network tab en DevTools del navegador
- Documentación de FastAPI para archivos estáticos
- Documentación de Pillow para procesamiento de imágenes
