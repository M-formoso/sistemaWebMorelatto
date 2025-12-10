-- Migración para agregar tabla product_images
-- Ejecutar este script en la base de datos

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    alt_text VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(display_order);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_images_updated_at
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Migrar imágenes existentes de products.image_url a product_images
-- Solo si existe image_url y no está vacío
INSERT INTO product_images (product_id, image_url, is_primary, display_order)
SELECT
    id as product_id,
    image_url,
    true as is_primary,
    0 as display_order
FROM products
WHERE image_url IS NOT NULL
  AND image_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM product_images WHERE product_id = products.id
  );

COMMENT ON TABLE product_images IS 'Galería de imágenes para productos del ecommerce';
COMMENT ON COLUMN product_images.product_id IS 'ID del producto al que pertenece la imagen';
COMMENT ON COLUMN product_images.image_url IS 'URL de la imagen';
COMMENT ON COLUMN product_images.is_primary IS 'Indica si es la imagen principal del producto';
COMMENT ON COLUMN product_images.display_order IS 'Orden de visualización en la galería';
COMMENT ON COLUMN product_images.alt_text IS 'Texto alternativo para accesibilidad';
