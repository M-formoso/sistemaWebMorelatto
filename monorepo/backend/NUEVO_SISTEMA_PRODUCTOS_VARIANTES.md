# Nuevo Sistema de Productos y Variantes

## Resumen del Cambio

**Sistema de variantes automáticas:** Los productos del sistema con el mismo nombre pero diferentes variantes se agrupan automáticamente en 1 producto web con múltiples variantes.

## Flujo Completo

### 1. Sistema de Inventario (`apps/sistema`)

**✅ COMPLETADO**

- **Nuevo campo "Variante"** en lugar de "Categoría" y "Color"
- Empleados cargan productos con el mismo nombre y diferentes variantes:
  - Lana Merino - $1000 - Stock: 50 - Variante: Rojo
  - Lana Merino - $1000 - Stock: 30 - Variante: Azul
  - Lana Merino - $1000 - Stock: 20 - Variante: Verde

- **Agrupación automática por nombre:** Si varios productos tienen el mismo nombre, se agrupan automáticamente en el admin web
- Empleados marcan productos como "Publicados en Web" con toggle
- Solo productos con `is_active = true` aparecen en el panel del admin web

### 2. Panel Admin Web (`apps/ecommerce/admin`)

**✅ COMPLETADO**

#### A. Gestión de Categorías ✅ COMPLETADO

- **Campo `section` agregado** (productos/decoracion)
- Categorías de productos y decoración son **independientes**
- Al crear categoría, se selecciona la sección
- Solo se ven categorías padre de la misma sección

#### B. Gestión de Productos ✅ COMPLETADO

**Agrupar productos por nombre:**
1. Productos con mismo `name` exacto = 1 producto web
2. Cada `variante` (campo del sistema) = 1 variante en la web
3. Admin puede:
   - Asignar categoría web
   - Subir imágenes para cada variante
   - Ver precio/stock en tiempo real (viene del sistema)
   - **NO puede editar precio/stock** (solo lectura)

**Ejemplo:**
- Sistema tiene 3 productos con nombre "Lana Merino":
  - Lana Merino - Variante: Rojo
  - Lana Merino - Variante: Azul
  - Lana Merino - Variante: Verde
- Admin web ve: **1 card "Lana Merino"** con 3 variantes
- Admin asigna a categoría "Lanas Importadas"
- Admin sube imagen para cada variante (Rojo, Azul, Verde)
- Precio y stock se sincronizan automáticamente desde el sistema

**Implementación:**
- Función `getBaseName()` usa el nombre directamente (sin procesamiento)
- Productos se agrupan en `Map<name, GroupedProduct>`
- Solo muestra productos con `is_active = true`
- Vista de cards con variantes expandidas
- Diálogo de edición muestra:
  - Configuración general (categoría web, peso)
  - Lista de variantes con precio/stock readonly
  - ImageUploader por cada variante (máximo 5 imágenes)

#### C. Eliminar Tab de Variantes ✅ COMPLETADO

- ✅ Tab "Variantes" eliminado de `ProductsConfigManager`
- ✅ Grid cambiado de `grid-cols-3` a `grid-cols-2`
- ✅ Gestión de variantes integrada dentro de cada producto
- ✅ Las variantes se gestionan inline al editar un producto

### 3. Web del Cliente (ecommerce público)

**✅ COMPLETADO**

- Ve "Lana Merino" en categoría "Lanas Importadas"
- **Display mejorado de variantes:**
  - Imagen principal prominente en la parte superior
  - Galería de miniaturas de variantes debajo de la imagen principal
  - Al hacer clic en una variante, la imagen se amplía en el visor principal
  - Efecto hover con escala en las miniaturas
  - Indicador visual de variante seleccionada (borde primary + ring)
  - Badge con nombre de variante en cada miniatura
  - Muestra si una variante está agotada (línea diagonal)
- Al seleccionar color:
  - Muestra imagen configurada en admin
  - Muestra precio del sistema
  - Muestra stock del sistema
  - Permite agregar al carrito con la variante correcta

## Cambios Técnicos Necesarios

### Backend (API)

**Ya existe:**
- ✅ Endpoint `/api/products` trae productos con `is_active`
- ✅ Modelo `ProductVariant` con `color_name`, `color_code`, `image_url`
- ✅ Campo `section` en categorías

**Por implementar:**
- 🔧 Endpoint para agrupar productos por nombre base
- 🔧 Lógica para convertir colores en variantes automáticamente
- 🔧 Sistema de sincronización precio/stock entre sistema y web

### Frontend Admin Web

**Implementado:**
- ✅ `CategoriesManager` con campo `section`
- ✅ Separación visual de categorías productos/decoración
- ✅ `ProductsManager` modificado con:
  - Función `getBaseName()` para extraer nombre base
  - Agrupación automática de productos por nombre
  - Filtrado de productos con `is_active = true`
  - Vista de cards con variantes expandidas
  - Interfaces: `Product`, `ProductVariant`, `GroupedProduct`
  - Estado: `groupedProducts`, `variantImages` (Map)

- ✅ Tab "Variantes" eliminado de `ProductsConfigManager`
- ✅ Grid actualizado a 2 columnas (Productos, Categorías)

- ✅ Diálogo de edición de productos agrupados:
  - Título muestra nombre base del producto
  - Sección "Configuración General":
    - Selector de categoría web (filtrado por section="productos")
    - Campo peso para cálculo de envíos
  - Sección "Variantes":
    - Cards individuales por variante
    - Muestra color, nombre completo, precio (readonly), stock (readonly)
    - `ImageUploader` integrado por variante
    - Máximo 5 imágenes por variante
  - handleSubmit actualiza category_id y weight para todas las variantes
  - handleSubmit guarda imágenes individuales por variante

### Frontend Ecommerce Público

**✅ Implementado:**
- ✅ `ProductDetail.tsx` modificado con:
  - Estado `mainImage` para controlar la imagen mostrada
  - Lógica de prioridad de imagen: mainImage (clicked) > variante seleccionada > imagen principal del producto
  - Galería de miniaturas de variantes con imágenes individuales
  - Grid responsivo (4-6 columnas según tamaño de pantalla)
  - Thumbnails clicables que amplían la imagen en el visor principal
  - Indicadores visuales: borde primary, ring, check mark en seleccionada
  - Fallback a color_code si no hay imagen de variante
  - Badge con nombre de variante en cada thumbnail
  - Indicador de stock agotado (línea diagonal)
  - Hover effects con scale-105 en thumbnails
  - Galería tradicional de imágenes para productos sin variantes

## Estado Actual

### ✅ Completado

1. Sistema de inventario con campo "Variante" (sin categoría/color)
2. Backend con endpoints de publicación y ProductImage con `is_primary`
3. API client actualizado
4. CategoriesManager con soporte de `section` (productos/decoración independientes)
5. ProductsManager con agrupación automática de productos por nombre
6. Eliminación de tab de variantes (gestión inline)
7. Gestión de imágenes por variante con ImageUploader (máx 5 por variante)
8. **ImageUploader con soporte de imagen principal** (is_primary flag)
9. **ProductDetail con display mejorado de variantes**
10. Documentación completa

### ⏳ Pendiente

1. Testing end-to-end del flujo completo
2. Optimizaciones de rendimiento si es necesario

## Próximos Pasos

1. **Testing completo** del flujo:
   - ✅ Crear productos en el sistema con diferentes variantes
   - ✅ Marcar productos como "Publicado en Web"
   - ✅ Verificar agrupación en panel admin web
   - ✅ Asignar categorías web y subir imágenes por variante
   - 🔧 Probar visualización en web pública con datos reales
   - 🔧 Verificar que precio/stock se mantienen sincronizados
   - 🔧 Probar agregar al carrito con diferentes variantes
   - 🔧 Verificar que las imágenes principales se muestran correctamente

## Notas Importantes

- **NO se pueden editar precios/stock desde el admin web** (solo desde sistema)
- **Categorías de productos y decoración son completamente independientes**
- **La agrupación es automática** basada en el nombre exacto del producto
- **Cada variante del sistema = 1 variante en la web**
- **Las imágenes se gestionan en el admin web**, no en el sistema
- **Cada variante puede tener hasta 5 imágenes propias**
- **La primera imagen subida es automáticamente marcada como principal**
- **Se puede cambiar la imagen principal desde el ImageUploader** (botón "Hacer principal")
- **Las imágenes se pueden reordenar arrastrando** (drag & drop)
- **En la web pública, las variantes se muestran como miniaturas clicables** debajo de la imagen principal

## Comandos para Desarrollo

```bash
# Sistema de inventario (panel empleados)
cd apps/sistema && npm run dev
# Puerto: 5175

# Ecommerce admin panel
cd apps/ecommerce && npm run dev
# Puerto: 5173 (o siguiente disponible)

# Backend
cd backend && python3 -m uvicorn app.main:app --reload
# Puerto: 8000
```
