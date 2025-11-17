# pgRouting Infrastructure Setup Guide
**For Future Isochrone & Route Analysis Implementation**

---

## Overview

This guide prepares the MapID WebGIS database for isochrone and routing analysis using pgRouting and OpenStreetMap (OSM) road network data. **This is DEFERRED** until OSM road network data is provided by the user.

---

## Prerequisites

- PostgreSQL 12+ with PostGIS 3.0+ (✅ Already installed: PostGIS 3.4.2)
- OSM road network data for your region (.osm.pbf file)
- ~2-4 hours for setup and data import
- Sufficient disk space (~500MB-5GB depending on region size)

---

## Step 1: Install pgRouting Extension

### 1.1 Install pgRouting Package (Linux)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-15-pgrouting

# Check installation
psql -U postgres -d mapid_webgis -c "SELECT * FROM pg_available_extensions WHERE name = 'pgrouting';"
```

### 1.2 Enable pgRouting in Database

```sql
-- Connect to database
psql -U postgres -d mapid_webgis

-- Enable pgRouting extension
CREATE EXTENSION IF NOT EXISTS pgrouting;

-- Verify installation
SELECT pgr_version();
```

**Expected Output:**
```
 pgr_version
-------------
 3.6.0
```

---

## Step 2: Download OSM Road Network Data

### 2.1 Obtain OSM Data

**Option A: Geofabrik (Recommended)**
- Visit: https://download.geofabrik.de/
- Select your region (e.g., Asia → Indonesia)
- Download `.osm.pbf` file

**Option B: BBBike Extract**
- Visit: https://extract.bbbike.org/
- Define custom bounding box
- Download `.osm.pbf` file

### 2.2 Example Download Commands

```bash
# Example: Download Java, Indonesia
cd /tmp
wget https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf

# Check file size
ls -lh java-latest.osm.pbf
```

---

## Step 3: Import OSM Data to PostgreSQL

### 3.1 Install osm2pgrouting Tool

```bash
# Ubuntu/Debian
sudo apt-get install osm2pgrouting

# Verify installation
osm2pgrouting --version
```

### 3.2 Import Road Network

```bash
# Import OSM data to PostgreSQL
osm2pgrouting \
  --file /tmp/java-latest.osm.pbf \
  --dbname mapid_webgis \
  --username postgres \
  --password iwakpeyek23 \
  --host localhost \
  --port 5432 \
  --conf /usr/share/osm2pgrouting/mapconfig.xml \
  --clean

# This creates the following tables:
# - ways (road segments)
# - ways_vertices_pgr (network nodes)
# - configuration, pointsofinterest, etc.
```

**Expected Duration:** 10-60 minutes depending on region size

### 3.3 Verify Import

```sql
-- Check imported tables
\dt

-- Count road segments
SELECT COUNT(*) FROM ways;

-- Count network nodes
SELECT COUNT(*) FROM ways_vertices_pgr;

-- Check sample data
SELECT id, tag_id, length, name, source, target FROM ways LIMIT 10;
```

---

## Step 4: Create Optimized Road Network Table

Create a normalized table structure compatible with the existing ISOCHRONE-GUIDE.md:

```sql
-- Create optimized roads_network table
CREATE TABLE roads_network (
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

-- Populate from osm2pgrouting tables
INSERT INTO roads_network (osm_id, name, highway, oneway, maxspeed, geom, source, target, length_m)
SELECT
    w.osm_id,
    w.name,
    w.tag_id::VARCHAR AS highway,
    CASE WHEN w.one_way = 1 THEN 'yes' ELSE 'no' END AS oneway,
    w.maxspeed_forward AS maxspeed,
    w.the_geom AS geom,
    w.source,
    w.target,
    w.length AS length_m
FROM ways w
WHERE w.tag_id IS NOT NULL;

-- Create spatial index
CREATE INDEX roads_network_geom_idx ON roads_network USING GIST(geom);
CREATE INDEX roads_network_source_idx ON roads_network(source);
CREATE INDEX roads_network_target_idx ON roads_network(target);

-- Verify
SELECT COUNT(*) FROM roads_network;
```

---

## Step 5: Calculate Routing Costs

Assign travel time costs based on road classification and speed limits:

```sql
-- Calculate cost based on length and speed
UPDATE roads_network SET
    cost = length_m /
           (CASE
               WHEN maxspeed > 0 THEN maxspeed * 1000.0 / 3600.0  -- m/s
               WHEN highway = 'motorway' THEN 110.0 * 1000.0 / 3600.0
               WHEN highway = 'trunk' THEN 90.0 * 1000.0 / 3600.0
               WHEN highway = 'primary' THEN 70.0 * 1000.0 / 3600.0
               WHEN highway = 'secondary' THEN 50.0 * 1000.0 / 3600.0
               WHEN highway = 'residential' THEN 30.0 * 1000.0 / 3600.0
               ELSE 40.0 * 1000.0 / 3600.0
           END),
    reverse_cost = CASE
        WHEN oneway IN ('yes', '1', 'true') THEN -1  -- no reverse
        ELSE length_m /
             (CASE
                 WHEN maxspeed > 0 THEN maxspeed * 1000.0 / 3600.0
                 ELSE 40.0 * 1000.0 / 3600.0
             END)
    END;

-- Verify costs
SELECT highway, AVG(cost) as avg_cost_seconds, COUNT(*)
FROM roads_network
GROUP BY highway
ORDER BY avg_cost_seconds DESC;
```

---

## Step 6: Test Routing Functionality

### 6.1 Simple Route Test

```sql
-- Find route between two random nodes
WITH random_nodes AS (
    SELECT id FROM ways_vertices_pgr ORDER BY RANDOM() LIMIT 2
)
SELECT * FROM pgr_dijkstra(
    'SELECT id, source, target, cost, reverse_cost FROM roads_network',
    (SELECT id FROM random_nodes LIMIT 1),
    (SELECT id FROM random_nodes OFFSET 1 LIMIT 1),
    directed := true
);
```

### 6.2 Test Isochrone (Driving Distance)

```sql
-- 5-minute driving distance from a node
SELECT * FROM pgr_drivingDistance(
    'SELECT id, source, target, cost, reverse_cost FROM roads_network',
    (SELECT id FROM ways_vertices_pgr LIMIT 1),
    300,  -- 5 minutes in seconds
    directed := true
) LIMIT 20;
```

---

## Step 7: Backend API Integration (Ready to Implement)

Once data is imported, follow **ISOCHRONE-GUIDE.md** sections:

### 7.1 Route Analysis Endpoint
- Implement `calculate_route()` SQL function (ISOCHRONE-GUIDE.md line 111)
- Add `/api/route` endpoint (line 204)
- Test with frontend route tool

### 7.2 Isochrone Analysis Endpoint
- Implement `calculate_isochrone()` SQL function (line 232)
- Add `/api/isochrone` endpoint (line 296)
- Test with frontend isochrone tool

### 7.3 Frontend Implementation
- Add route calculation UI (ISOCHRONE-GUIDE.md line 340)
- Add isochrone visualization (line 487)
- Add UI controls (line 564)

---

## Step 8: Performance Optimization

### 8.1 Database Indexes

```sql
-- Additional performance indexes
CREATE INDEX roads_network_highway_idx ON roads_network(highway);
CREATE INDEX roads_network_name_idx ON roads_network(name);
ANALYZE roads_network;
```

### 8.2 Materialized Views for Hot Routes

```sql
-- Cache frequently accessed routes
CREATE MATERIALIZED VIEW popular_routes AS
SELECT
    source,
    target,
    COUNT(*) as frequency
FROM route_requests  -- Create this table to log requests
GROUP BY source, target
HAVING COUNT(*) > 10;

REFRESH MATERIALIZED VIEW popular_routes;
```

---

## Troubleshooting

### Issue: osm2pgrouting Not Found
**Solution:**
```bash
# Check package availability
apt search osm2pgrouting

# Alternative: Build from source
git clone https://github.com/pgRouting/osm2pgrouting.git
cd osm2pgrouting
mkdir build && cd build
cmake ..
make
sudo make install
```

### Issue: Import Fails with "No Configuration"
**Solution:**
```bash
# Download default mapconfig
cd /tmp
wget https://raw.githubusercontent.com/pgRouting/osm2pgrouting/master/mapconfig.xml

# Use custom config
osm2pgrouting --file data.osm.pbf --conf /tmp/mapconfig.xml ...
```

### Issue: pgRouting Functions Not Found
**Solution:**
```sql
-- Ensure extension is in correct schema
CREATE EXTENSION IF NOT EXISTS pgrouting SCHEMA public;

-- Check search path
SHOW search_path;
```

---

## Current Status

✅ **Completed:**
- PostGIS 3.4.2 installed and verified
- PostgreSQL database ready
- Radius analysis tool implemented (uses ST_Buffer, no road network required)

⏸️ **Deferred (Awaiting OSM Data):**
- pgRouting extension installation
- OSM road network import
- Route/isochrone API endpoints
- Frontend route/isochrone tools

---

## Quick Start Checklist (When Ready)

- [ ] Install pgRouting extension
- [ ] Download OSM .osm.pbf file for your region
- [ ] Install osm2pgrouting tool
- [ ] Import OSM data to database
- [ ] Create roads_network table
- [ ] Calculate routing costs
- [ ] Test sample route queries
- [ ] Implement backend API endpoints (follow ISOCHRONE-GUIDE.md)
- [ ] Implement frontend tools
- [ ] Test end-to-end routing functionality

---

## Estimated Resource Requirements

| Region Size | File Size | Import Time | Disk Space | Routes Table Size |
|------------|-----------|-------------|------------|-------------------|
| City       | 50-200 MB | 5-15 min    | 500 MB     | ~100K-500K rows   |
| Province   | 200-1 GB  | 15-40 min   | 2-4 GB     | ~1M-5M rows       |
| Country    | 1-5 GB    | 40-120 min  | 10-20 GB   | ~10M-50M rows     |

---

**Next Steps:** Wait for OSM road network data from user, then proceed with Step 1.

**Reference:** See `ISOCHRONE-GUIDE.md` for complete routing implementation details.

---

*Guide Created: 2025-11-13*
*Database: mapid_webgis*
*Region: TBD (User to provide)*
