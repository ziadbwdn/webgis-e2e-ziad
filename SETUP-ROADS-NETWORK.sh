#!/bin/bash
# Roads Network Setup Script
# Prerequisite: pgRouting extension must be installed first
# Run: bash ./SETUP-ROADS-NETWORK.sh

echo "=================================="
echo "Roads Network Setup for pgRouting"
echo "=================================="
echo ""

PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOSQL'

-- ============================================
-- Step 1: Create roads_network table
-- ============================================
echo "Creating roads_network table...";

CREATE TABLE IF NOT EXISTS roads_network (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT,
    name VARCHAR(255),
    highway VARCHAR(50),
    oneway VARCHAR(10),
    maxspeed INTEGER,
    geom GEOMETRY(LineString, 4326),
    source INTEGER,
    target INTEGER,
    cost DOUBLE PRECISION,
    reverse_cost DOUBLE PRECISION,
    length_m DOUBLE PRECISION
);

-- Create spatial index for performance
CREATE INDEX IF NOT EXISTS roads_network_geom_idx ON roads_network USING GIST(geom);
CREATE INDEX IF NOT EXISTS roads_network_source_idx ON roads_network(source);
CREATE INDEX IF NOT EXISTS roads_network_target_idx ON roads_network(target);

SELECT 'roads_network table created successfully' AS status;

-- ============================================
-- Step 2: Import highway data from GeoJSON
-- ============================================
-- NOTE: This step requires Python script to parse GeoJSON
-- See IMPORT-GEOJSON.py for implementation
-- For now, manual import or OGR2OGR is recommended:
--
-- Option 1: Using ogr2ogr (GDAL)
-- ogr2ogr -f "PostgreSQL" PG:"dbname=mapid_webgis host=localhost user=postgres password=iwakpeyek23" \
--         -nln roads_network_import \
--         -append \
--         client/data/highway_primary.geojson
--
-- Then transform and insert into roads_network table
--
-- Option 2: Using Python script (IMPORT-GEOJSON.py)
-- python3 IMPORT-GEOJSON.py

SELECT 'Please run GeoJSON import step (see comments above)' AS next_step;

-- ============================================
-- Step 3: Build network topology
-- ============================================
-- WAIT: Run this AFTER importing data
-- SELECT pgr_createTopology('roads_network', 0.00001, 'geom', 'id', 'source', 'target');

-- ============================================
-- Step 4: Calculate routing costs
-- ============================================
-- WAIT: Run this AFTER topology is built
-- UPDATE roads_network SET
--     length_m = ST_Length(geom::geography),
--     cost = length_m / (
--         CASE
--             WHEN highway = 'motorway' THEN 110.0 * 1000.0 / 3600.0
--             WHEN highway = 'trunk' THEN 90.0 * 1000.0 / 3600.0
--             WHEN highway = 'primary' THEN 70.0 * 1000.0 / 3600.0
--             WHEN highway = 'secondary' THEN 50.0 * 1000.0 / 3600.0
--             WHEN highway = 'tertiary' THEN 40.0 * 1000.0 / 3600.0
--             ELSE 30.0 * 1000.0 / 3600.0
--         END
--     ),
--     reverse_cost = CASE
--         WHEN oneway IN ('yes', '1', 'true') THEN -1
--         ELSE cost
--     END;

SELECT 'Setup phase 1 complete. Next: Import GeoJSON data' AS status;

EOSQL

echo ""
echo "✅ Database schema created!"
echo ""
echo "📋 Next steps:"
echo "1. Run: python3 IMPORT-GEOJSON.py"
echo "2. Run: bash SETUP-ROADS-TOPOLOGY.sh"
echo "3. Run: bash SETUP-ROADS-COSTS.sh"
