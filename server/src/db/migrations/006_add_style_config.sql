-- Add style_config column to layers table for storing layer styling configuration
-- This allows default layers to have pre-configured styles and user layers to have custom styles

ALTER TABLE layers ADD COLUMN IF NOT EXISTS style_config JSONB DEFAULT NULL;

-- Add index for faster style_config queries
CREATE INDEX IF NOT EXISTS idx_layers_style_config ON layers USING GIN (style_config);

-- Comment on the column
COMMENT ON COLUMN layers.style_config IS 'JSON configuration for layer styling including type (interpolate/match/simple), attributes, colors, and other style properties';
