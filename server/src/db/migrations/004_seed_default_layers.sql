-- Seed default layers for Indonesia
INSERT INTO layers (name, description, type, is_default) VALUES
  ('Indonesia OSM Base', 'OpenStreetMap basemap for Indonesia', 'raster', TRUE),
  ('Population Density', 'Population density by administrative region', 'polygon', TRUE),
  ('Economic Status', 'Economic indicators by region', 'polygon', TRUE),
  ('Old Public Routes', 'Historical public transportation routes', 'linestring', TRUE),
  ('Recent Public Routes', 'Current public transportation routes', 'linestring', TRUE)
ON CONFLICT DO NOTHING;
