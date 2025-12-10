-- Migration: Add multiple images support for workshops and news
-- Created: 2025-12-08

-- Create workshop_images table
CREATE TABLE IF NOT EXISTS workshop_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    alt_text VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for workshop_images
CREATE INDEX IF NOT EXISTS idx_workshop_images_workshop_id ON workshop_images(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_images_display_order ON workshop_images(workshop_id, display_order);

-- Create news_images table
CREATE TABLE IF NOT EXISTS news_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    alt_text VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for news_images
CREATE INDEX IF NOT EXISTS idx_news_images_news_id ON news_images(news_id);
CREATE INDEX IF NOT EXISTS idx_news_images_display_order ON news_images(news_id, display_order);

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for workshop_images
DROP TRIGGER IF EXISTS update_workshop_images_updated_at ON workshop_images;
CREATE TRIGGER update_workshop_images_updated_at
    BEFORE UPDATE ON workshop_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for news_images
DROP TRIGGER IF EXISTS update_news_images_updated_at ON news_images;
CREATE TRIGGER update_news_images_updated_at
    BEFORE UPDATE ON news_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE workshop_images IS 'Multiple images for workshop galleries';
COMMENT ON TABLE news_images IS 'Multiple images for news/blog posts';
COMMENT ON COLUMN workshop_images.is_primary IS 'Indicates if this is the main image for the workshop';
COMMENT ON COLUMN news_images.is_primary IS 'Indicates if this is the main image for the news item';
COMMENT ON COLUMN workshop_images.display_order IS 'Order in which images should be displayed';
COMMENT ON COLUMN news_images.display_order IS 'Order in which images should be displayed';
