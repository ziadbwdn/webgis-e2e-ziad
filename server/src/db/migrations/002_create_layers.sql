-- Create layers table
CREATE TABLE IF NOT EXISTS layers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50),  -- 'point', 'linestring', 'polygon', 'raster'
  is_default BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_layers_default ON layers(is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_layers_created_by ON layers(created_by);
CREATE INDEX IF NOT EXISTS idx_layers_name ON layers(name);
