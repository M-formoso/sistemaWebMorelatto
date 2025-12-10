-- Migration: Add layout configuration to news
-- Created: 2025-12-09

-- Add layout configuration columns to news table
ALTER TABLE news
ADD COLUMN IF NOT EXISTS card_size VARCHAR(50) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS layout_type VARCHAR(50) DEFAULT 'grid';

-- Add comments
COMMENT ON COLUMN news.card_size IS 'Size of the card in the news list: small, medium, large';
COMMENT ON COLUMN news.layout_type IS 'Layout type for displaying the news: grid, list, featured';

-- Update existing rows to have default values
UPDATE news SET card_size = 'medium' WHERE card_size IS NULL;
UPDATE news SET layout_type = 'grid' WHERE layout_type IS NULL;
