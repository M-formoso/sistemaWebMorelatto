# Sistema de Publicación de Productos

## Resumen

Se implementó un sistema simplificado para gestionar productos desde el panel de administración ("/inventario") con la capacidad de publicar/despublicar productos en la web mediante un botón toggle.

## Cambios Realizados

### 1. Backend (API)

#### Nuevos Endpoints

**POST `/api/products/{product_id}/unpublish`**
- Despublica un producto de la web (marca `is_active = False`)
- No requiere parámetros adicionales
- Retorna el producto actualizado

**PATCH `/api/products/{product_id}/toggle-active`**
- Alterna el estado de publicación de un producto (activo/inactivo)
- Útil para un botón de toggle en el admin
- No requiere parámetros adicionales
- Retorna el producto actualizado

**POST `/api/products/{product_id}/publish`** (ya existía)
- Publica un producto en la web
- Requiere: `{ category_id, weight? }`
- Genera slug automáticamente si no existe
- Marca `is_active = True`

### 2. API Client

Se agregaron dos nuevos métodos al API client (`@morelatto/api-client`):

```typescript
// Despublicar producto
async unpublishProduct(id: string)

// Alternar estado de publicación (toggle)
async toggleProductActive(id: string)
```

### 3. Frontend - Panel de Admin

#### Archivos Modificados

**`apps/sistema/src/pages/Inventario.tsx`**

**Cambios en la interfaz:**
```typescript
interface Producto {
  // ... campos existentes ...
  is_active: boolean; // NUEVO: Indica si está publicado en web
}
```

**Nueva función para toggle de publicación:**
```typescript
const togglePublicadoWeb = async (id: string, currentValue: boolean) => {
  try {
    await api.toggleProductActive(id);
    queryClient.invalidateQueries({ queryKey: ["productos"] });
    toast.success(
      !currentValue
        ? "Producto publicado en la web"
        : "Producto despublicado de la web"
    );
  } catch (error: any) {
    toast.error(`Error: ${error.message}`);
  }
};
```

**Nueva estadística:**
```typescript
const productosPublicados = productos?.filter(p => p.is_active).length || 0;
```

**Nuevas Cards de Estadísticas:**
Se agregó una 4ta card mostrando "Publicados en Web" con el ícono Globe.

**Nueva columna en la tabla:**
- Header: "Publicado Web"
- Contenido:
  - Badge mostrando estado (Publicado / Sin publicar)
  - Switch para toggle de publicación

## Flujo de Trabajo

### Crear un Producto

1. Usuario va al panel admin → "Inventario"
2. Clic en "Nuevo Producto"
3. Completa formulario:
   - Código (requerido)
   - Nombre (requerido)
   - Descripción
   - Costo
   - Precio (requerido)
   - Stock (requerido)
   - Stock Mínimo (requerido)
   - Categoría (opcional)
   - Color (opcional)
4. El producto se crea con `is_active = false` (NO publicado en web)
5. El producto aparece en la tabla del inventario

### Publicar un Producto en la Web

Hay dos formas:

#### Opción 1: Toggle Simple (Recomendada)
1. En la tabla de inventario, localizar el producto
2. En la columna "Publicado Web", activar el switch
3. El producto se publica automáticamente
4. El badge cambia a "Publicado" (verde)
5. El producto ahora es visible en el ecommerce

#### Opción 2: Endpoint Publish (Con Configuración)
Si necesitas configurar categoría y peso al publicar:
```typescript
await api.publishProductToWeb(productId, {
  category_id: "uuid-de-categoria",
  weight: 0.5 // kg
});
```

### Despublicar un Producto

1. En la tabla de inventario, localizar el producto
2. En la columna "Publicado Web", desactivar el switch
3. El producto se despublica automáticamente
4. El badge cambia a "Sin publicar" (gris)
5. El producto ya NO es visible en el ecommerce

## Estadísticas del Panel

El panel de inventario ahora muestra 4 cards:

1. **Total Productos**: Cantidad total de productos en inventario
2. **Publicados en Web**: Productos visibles en el ecommerce (is_active = true)
3. **Con Código Físico**: Productos con código físico asignado
4. **En Depósito**: Productos sin código físico asignado

## Vista de la Tabla

La tabla de productos ahora incluye:

| Columna | Descripción |
|---------|-------------|
| Código | Código único del producto |
| Nombre | Nombre del producto |
| Categoría | Categoría asignada (si tiene) |
| Color | Color del producto (si tiene) |
| Precio | Precio de venta |
| Stock | Stock actual (en rojo si está bajo) |
| Ubicación | Badge: Físico o Depósito |
| Código Físico | Switch para marcar con código físico |
| **Publicado Web** | **NUEVO: Badge + Switch para publicar/despublicar** |
| Acciones | QR, Editar, Eliminar |

## Validaciones y Reglas

### Backend

- ✅ Campo `is_active` controla la visibilidad en web
- ✅ Por defecto, los productos nuevos tienen `is_active = false`
- ✅ El endpoint `/api/products/public` solo muestra productos con `is_active = true`
- ✅ Se puede toggle el estado sin perder otros datos del producto

### Frontend

- ✅ El switch de publicación funciona de forma independiente
- ✅ Se muestra feedback visual inmediato (toast notifications)
- ✅ Las estadísticas se actualizan automáticamente
- ✅ El badge refleja el estado actual del producto

## Sistema de Variantes (Pendiente)

**Nota:** El sistema de variantes (colores con imágenes) se gestionará en una actualización futura. Por ahora:
- La tabla `product_variants` existe en el backend
- Los productos pueden tener variantes de color
- Cada variante puede tener su propia imagen
- La gestión de variantes se integrará dentro del formulario de producto

## Diferencias con el Sistema Anterior

### Antes

- ❌ No había forma de publicar/despublicar desde el panel de inventario
- ❌ Los productos del sistema no se relacionaban con el ecommerce
- ❌ Había que crear productos separados para web y sistema

### Ahora

- ✅ Productos unificados entre sistema e ecommerce
- ✅ Toggle simple para publicar/despublicar
- ✅ Un solo inventario para todo
- ✅ Stock y precio se sincronizan automáticamente
- ✅ Estadísticas en tiempo real de productos publicados

## Próximos Pasos

1. **Gestión de Variantes**: Implementar UI para agregar variantes dentro del formulario de producto
2. **Gestión de Imágenes**: Mejorar el sistema de múltiples imágenes por producto
3. **Publicación Masiva**: Agregar opción para publicar/despublicar múltiples productos a la vez
4. **Filtros Avanzados**: Filtrar productos por estado de publicación en la tabla

## Testing

Para probar el sistema:

```bash
# 1. Crear un producto desde el panel de inventario
# 2. Verificar que aparece con badge "Sin publicar"
# 3. Activar el switch de "Publicado Web"
# 4. Verificar toast de confirmación
# 5. Verificar que el badge cambió a "Publicado"
# 6. Ir al ecommerce y verificar que el producto es visible
# 7. Desactivar el switch
# 8. Verificar que el producto ya no es visible en el ecommerce
```

## Errores Comunes

### Error: "Product not found"
- **Causa**: El ID del producto no existe
- **Solución**: Verificar que el ID es correcto

### Error: "toggleProductActive is not a function"
- **Causa**: El API client no está actualizado
- **Solución**: Reconstruir el paquete `@morelatto/api-client`

### El producto no aparece en la web
- **Causa**: El campo `is_active` no se actualizó
- **Solución**: Verificar que el toggle funciona correctamente y que el backend responde 200 OK

## Conclusión

El nuevo sistema de publicación de productos simplifica enormemente la gestión del inventario y el ecommerce, permitiendo:

- ✅ Gestión unificada desde un solo panel
- ✅ Toggle simple para publicar/despublicar
- ✅ Sincronización automática de stock y precios
- ✅ Estadísticas en tiempo real
- ✅ Mejor experiencia de usuario
