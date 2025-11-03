-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create layer_features table with PostGIS geometry
CREATE TABLE IF NOT EXISTS layer_features (
  id SERIAL PRIMARY KEY,
  layer_id INTEGER NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
  geom GEOMETRY(Geometry, 4326) NOT NULL,  -- PostGIS spatial type, WGS84 (SRID 4326)
  properties JSONB,                         -- Flexible schema for feature attributes
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index for fast geometric queries (GIST index)
CREATE INDEX IF NOT EXISTS idx_layer_features_geom ON layer_features USING GIST(geom);

-- Create regular indexes
CREATE INDEX IF NOT EXISTS idx_layer_features_layer_id ON layer_features(layer_id);
CREATE INDEX IF NOT EXISTS idx_layer_features_properties ON layer_features USING GIN(properties);
