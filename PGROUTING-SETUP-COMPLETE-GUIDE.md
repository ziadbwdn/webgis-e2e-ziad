# Complete pgRouting Setup Guide - Option B Implementation
**Date:** November 18, 2025
**Status:** 🟡 Ready for Implementation
**Objective:** Implement full pgRouting-based routing & isochrone analysis

---

## 📋 Overview

This guide provides **complete step-by-step instructions** to implement Option B: Full pgRouting Setup with existing GeoJSON road network data.

**What you'll get:**
- ✅ Road network topology in PostgreSQL
- ✅ Routing algorithms (shortest path, isochrone)
- ✅ Backend API endpoints (`/api/route`, `/api/isochrone`)
- ✅ Frontend routing UI with visualization
- **Estimated time:** 4-6 hours of implementation

---

## 🔧 Phase 1: Database Setup (30-45 minutes)

### Step 1.1: Install pgRouting Extension
Run in your terminal:
```bash
sudo apt-get update
sudo apt-get install -y postgresql-16-pgrouting osm2pgrouting
```

### Step 1.2: Enable pgRouting in Database
```bash
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
CREATE EXTENSION IF NOT EXISTS pgrouting;
SELECT pgr_version();
EOF
```

**Expected output:**
```
 pgr_version
----------
 3.6.0
```

### Step 1.3: Create roads_network Table & Import Data

**Option A: Using the TypeScript Importer (RECOMMENDED)**

This uses the existing application's layer upload functionality:

```bash
# Run the TypeScript importer
cd /home/user/mapid-webgis
npx ts-node IMPORT-ROADS-GEOJSON.ts
```

**What this does:**
1. Reads all 5 GeoJSON files from `client/data/`
2. Uses `LayerModel.createLayerWithFeatures()` to import
3. Converts GeoJSON to WKT using existing app utilities
4. Stores in both `layers` & `layer_features` tables
5. Creates `roads_network` table
6. Populates `roads_network` from imported layers

**Expected output:**
```
==================================================
Roads Network GeoJSON Importer
==================================================

Creating roads_network table structure...
✅ roads_network table created successfully

📂 Processing: Highway Primary - Surabaya
   Found 168 features
✅ Imported 168 features into layer ID: 5

📂 Processing: Highway Secondary - Surabaya
   Found 1638 features
✅ Imported 1638 features into layer ID: 6

... (more layers)

📊 Populating roads_network table from layer_features...
✅ Populated 4836 rows in roads_network table

==================================================
✅ Import complete!
==================================================
```

**Option B: Using ogr2ogr (If ts-node doesn't work)**

```bash
# Download and convert GeoJSON files
cd client/data

# Convert all highway files
for file in highway_*.geojson; do
  ogr2ogr -f "PostgreSQL" \
    PG:"dbname=mapid_webgis host=localhost user=postgres password=iwakpeyek23" \
    -nln roads_network \
    -append \
    "$file"
done

# Convert all routes
ogr2ogr -f "PostgreSQL" \
  PG:"dbname=mapid_webgis host=localhost user=postgres password=iwakpeyek23" \
  -nln roads_network \
  -append \
  all-routes_v2.geojson
```

### Step 1.4: Verify Data Import

```bash
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
SELECT COUNT(*) as total_roads FROM roads_network;
SELECT highway, COUNT(*) FROM roads_network GROUP BY highway ORDER BY COUNT(*) DESC;
SELECT ST_AsText(geom) FROM roads_network LIMIT 1;
EOF
```

**Expected results:**
- Total roads: ~4,836 segments
- Distribution by highway type
- Valid LineString geometries

---

## 🔗 Phase 2: Build Network Topology (20-30 minutes)

### Step 2.1: Create Network Topology

```bash
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
-- Create topology (nodes and edges)
-- This identifies intersection points and creates source/target relationships
SELECT pgr_createTopology(
    'roads_network',
    0.00001,  -- tolerance in degrees (~1m at equator)
    'geom',   -- geometry column
    'id',     -- id column
    'source', -- source node column
    'target'  -- target node column
);

-- This creates: roads_network_vertices_pgr table with nodes
-- And populates source/target columns in roads_network

EOF
```

**Expected output:**
```
NOTICE: pgr_createTopology('roads_network',0.00001,'geom','id','source','target')
NOTICE: Topology for "public"."roads_network" created
NOTICE: Vertices table created: "public"."roads_network_vertices_pgr"
```

### Step 2.2: Analyze Topology (Check for Issues)

```bash
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
-- Analyze the graph for consistency
SELECT pgr_analyzeGraph(
    'roads_network',
    0.00001,
    'geom',
    'id',
    'source',
    'target'
);

-- Check for any disconnected segments
SELECT * FROM roads_network_vertices_pgr WHERE is_isolated;

EOF
```

---

## 💰 Phase 3: Calculate Routing Costs (15-20 minutes)

### Step 3.1: Calculate Travel Time Costs

```bash
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
-- Calculate segment lengths and travel time costs
UPDATE roads_network SET
    -- Calculate length in meters
    length_m = ST_Length(geom::geography),

    -- Calculate cost (travel time in seconds) based on road type and speed
    cost = ST_Length(geom::geography) / (
        CASE
            WHEN highway = 'motorway' THEN 110.0 * 1000.0 / 3600.0      -- 110 km/h = 30.56 m/s
            WHEN highway = 'trunk' THEN 90.0 * 1000.0 / 3600.0          -- 90 km/h = 25 m/s
            WHEN highway = 'primary' THEN 70.0 * 1000.0 / 3600.0        -- 70 km/h = 19.44 m/s
            WHEN highway = 'secondary' THEN 50.0 * 1000.0 / 3600.0      -- 50 km/h = 13.89 m/s
            WHEN highway = 'tertiary' THEN 40.0 * 1000.0 / 3600.0       -- 40 km/h = 11.11 m/s
            ELSE 30.0 * 1000.0 / 3600.0                                 -- 30 km/h default = 8.33 m/s
        END
    ),

    -- For reverse direction: -1 means one-way (no reverse)
    reverse_cost = CASE
        WHEN oneway IN ('yes', '1', 'true') THEN -1
        ELSE ST_Length(geom::geography) / (
            CASE
                WHEN highway = 'motorway' THEN 110.0 * 1000.0 / 3600.0
                WHEN highway = 'trunk' THEN 90.0 * 1000.0 / 3600.0
                WHEN highway = 'primary' THEN 70.0 * 1000.0 / 3600.0
                WHEN highway = 'secondary' THEN 50.0 * 1000.0 / 3600.0
                WHEN highway = 'tertiary' THEN 40.0 * 1000.0 / 3600.0
                ELSE 30.0 * 1000.0 / 3600.0
            END
        )
    END
WHERE cost IS NULL;

-- Verify costs were calculated
SELECT highway, COUNT(*), AVG(cost) as avg_time_sec, MAX(length_m) as max_length_m
FROM roads_network
WHERE length_m IS NOT NULL
GROUP BY highway
ORDER BY AVG(cost) DESC;

EOF
```

**Example output:**
```
 highway   | count |  avg_time_sec  | max_length_m
-----------+-------+----------------+--------------
 secondary |  1638 |      32.45     |    2458.34
 tertiary  |  1517 |      28.12     |    1890.12
 trunk     |   513 |      18.75     |    3456.78
 primary   |   168 |      15.32     |    2234.56
 resident. |    16 |      22.11     |    1200.00
```

---

## 🛣️ Phase 4: Create SQL Functions for Routing (20-30 minutes)

### Step 4.1: Route Calculation Function

```bash
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
CREATE OR REPLACE FUNCTION calculate_route(
    start_lon DOUBLE PRECISION,
    start_lat DOUBLE PRECISION,
    end_lon DOUBLE PRECISION,
    end_lat DOUBLE PRECISION
)
RETURNS TABLE(
    geojson JSON,
    total_distance DOUBLE PRECISION,
    total_time DOUBLE PRECISION,
    path_names TEXT[]
) AS $$
DECLARE
    start_node INTEGER;
    end_node INTEGER;
BEGIN
    -- Find nearest network node to start point
    SELECT source INTO start_node
    FROM roads_network
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint(start_lon, start_lat), 4326)
    LIMIT 1;

    -- Find nearest network node to end point
    SELECT source INTO end_node
    FROM roads_network
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint(end_lon, end_lat), 4326)
    LIMIT 1;

    -- Return if no nodes found
    IF start_node IS NULL OR end_node IS NULL THEN
        RETURN QUERY SELECT
            json_build_object('type', 'FeatureCollection', 'features', '[]'::json)::json,
            0::DOUBLE PRECISION,
            0::DOUBLE PRECISION,
            ARRAY[]::TEXT[];
        RETURN;
    END IF;

    -- Calculate shortest path using Dijkstra
    RETURN QUERY
    WITH route AS (
        SELECT
            r.seq,
            r.node,
            r.edge,
            r.cost,
            r.agg_cost,
            rn.geom,
            rn.name,
            rn.length_m
        FROM pgr_dijkstra(
            'SELECT id, source, target, cost, reverse_cost FROM roads_network',
            start_node,
            end_node,
            directed := true
        ) r
        LEFT JOIN roads_network rn ON r.edge = rn.id
    )
    SELECT
        json_build_object(
            'type', 'FeatureCollection',
            'features', json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'sequence', seq,
                        'name', name,
                        'distance', length_m,
                        'cumulative_cost', agg_cost
                    )
                )
            )
        ) as geojson,
        SUM(length_m) as total_distance,
        MAX(agg_cost) as total_time,
        ARRAY_AGG(DISTINCT name) FILTER (WHERE name IS NOT NULL) as path_names
    FROM route
    WHERE geom IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

EOF
```

### Step 4.2: Isochrone Calculation Function

```bash
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
CREATE OR REPLACE FUNCTION calculate_isochrone(
    start_lon DOUBLE PRECISION,
    start_lat DOUBLE PRECISION,
    max_cost DOUBLE PRECISION
)
RETURNS JSON AS $$
DECLARE
    start_node INTEGER;
BEGIN
    -- Find nearest network node
    SELECT source INTO start_node
    FROM roads_network
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint(start_lon, start_lat), 4326)
    LIMIT 1;

    IF start_node IS NULL THEN
        RETURN json_build_object(
            'type', 'FeatureCollection',
            'features', '[]'::json
        );
    END IF;

    -- Calculate reachable area using driving distance
    RETURN (
        WITH reachable AS (
            SELECT
                di.node,
                di.agg_cost,
                rn.geom
            FROM pgr_drivingDistance(
                'SELECT id, source, target, cost, reverse_cost FROM roads_network',
                start_node,
                max_cost,
                directed := true
            ) di
            JOIN roads_network rn ON (di.node = rn.source OR di.node = rn.target)
        ),
        points AS (
            SELECT
                agg_cost,
                (ST_DumpPoints(geom)).geom as geom
            FROM reachable
        ),
        concave_hull AS (
            SELECT
                ST_ConcaveHull(ST_Collect(geom), 0.85) as geom
            FROM points
        )
        SELECT json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
                'max_time', max_cost,
                'center', json_array(start_lon, start_lat)
            )
        )
        FROM concave_hull
    );
END;
$$ LANGUAGE plpgsql;

EOF
```

### Step 4.3: Test SQL Functions

```bash
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
-- Test route calculation (example: center of Surabaya)
-- Start: 112.75°E, -7.25°S (Surabaya center)
-- End: 112.70°E, -7.20°S (nearby point)

SELECT total_distance, total_time FROM calculate_route(
    112.75, -7.25,
    112.70, -7.20
);

-- Expected: Some distance in meters, time in seconds

EOF
```

---

## 🚀 Phase 5: Backend API Implementation (1-1.5 hours)

### Step 5.1: Create Routing Routes

Create file: `server/src/routes/routing.routes.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { RoutingController } from '../controllers/routing.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};

// POST /api/routing/route
router.post(
  '/route',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await RoutingController.calculateRoute(req, res);
  })
);

// POST /api/routing/isochrone
router.post(
  '/isochrone',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    await RoutingController.calculateIsochrone(req, res);
  })
);

export default router;
```

### Step 5.2: Create Routing Controller

Create file: `server/src/controllers/routing.controller.ts`

```typescript
import { Request, Response } from 'express';
import { getPool } from '../db/connection';
import { AppError } from '../utils/errors';

export class RoutingController {
  static async calculateRoute(req: Request, res: Response): Promise<void> {
    const { startLon, startLat, endLon, endLat } = req.body;

    // Validate input
    if (!startLon || !startLat || !endLon || !endLat) {
      throw new AppError(400, 'Missing required parameters: startLon, startLat, endLon, endLat');
    }

    const pool = getPool();

    try {
      const result = await pool.query(
        'SELECT geojson, total_distance, total_time, path_names FROM calculate_route($1, $2, $3, $4)',
        [startLon, startLat, endLon, endLat]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'No route found between these points');
      }

      const { geojson, total_distance, total_time, path_names } = result.rows[0];

      res.status(200).json({
        route: geojson,
        distance: total_distance,    // meters
        time: total_time,            // seconds
        pathNames: path_names || []
      });
    } catch (error) {
      console.error('Route calculation error:', error);
      throw error;
    }
  }

  static async calculateIsochrone(req: Request, res: Response): Promise<void> {
    const { lon, lat, time } = req.body;

    if (!lon || !lat || !time) {
      throw new AppError(400, 'Missing required parameters: lon, lat, time (in seconds)');
    }

    const pool = getPool();

    try {
      // Create multiple isochrone intervals (5, 10, 15, 30 minutes)
      const intervals = [300, 600, 900, 1800].filter(t => t <= time);

      const features = [];

      for (const interval of intervals) {
        const result = await pool.query(
          'SELECT calculate_isochrone($1, $2, $3) as geojson',
          [lon, lat, interval]
        );

        if (result.rows[0]?.geojson) {
          const feature = result.rows[0].geojson;
          features.push({
            ...feature,
            properties: {
              ...feature.properties,
              time_minutes: Math.round(interval / 60),
              fill_color: this.getColorForTime(interval)
            }
          });
        }
      }

      res.status(200).json({
        type: 'FeatureCollection',
        features
      });
    } catch (error) {
      console.error('Isochrone calculation error:', error);
      throw error;
    }
  }

  private static getColorForTime(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    if (minutes <= 5) return '#fee5d9';   // Lightest
    if (minutes <= 10) return '#fcae91';
    if (minutes <= 15) return '#fb6a4a';
    if (minutes <= 20) return '#de2d26';
    return '#a50f15';                     // Darkest
  }
}
```

### Step 5.3: Register Routes in Main App

Edit `server/src/index.ts`:

```typescript
// ... existing imports ...
import routingRoutes from './routes/routing.routes';

// ... existing code ...

// Register routes
app.use('/api/analysis', analysisRoutes);
app.use('/api/layers', layersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/routing', routingRoutes);  // ← Add this line

// ... rest of code ...
```

---

## 🎨 Phase 6: Frontend Integration (1.5-2 hours)

### Step 6.1: Create Routing UI Component

Create file: `client/src/routing-tool.ts`

```typescript
import maplibregl from 'maplibre-gl';

export class RoutingTool {
  private map: maplibregl.Map;
  private startMarker: maplibregl.Marker | null = null;
  private endMarker: maplibregl.Marker | null = null;
  private startCoords: [number, number] | null = null;
  private endCoords: [number, number] | null = null;
  private routeSource: any = null;
  private isochroneSource: any = null;
  private clickMode: 'start' | 'end' | 'none' = 'none';

  constructor(map: maplibregl.Map) {
    this.map = map;
    this.initializeUI();
    this.initializeMapInteractions();
  }

  private initializeUI(): void {
    // Create control panel
    const controlDiv = document.createElement('div');
    controlDiv.id = 'routing-panel';
    controlDiv.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: white;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      z-index: 100;
      width: 280px;
    `;

    controlDiv.innerHTML = `
      <h3 style="margin: 0 0 10px; font-size: 16px;">Routing Tool</h3>
      <div style="margin-bottom: 10px;">
        <button id="route-start-btn" style="width: 100%; padding: 8px; margin-bottom: 5px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Click Start Point
        </button>
        <button id="route-end-btn" style="width: 100%; padding: 8px; margin-bottom: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Click End Point
        </button>
        <button id="route-calculate-btn" style="width: 100%; padding: 8px; margin-bottom: 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Calculate Route
        </button>
      </div>

      <h4 style="margin: 15px 0 10px; font-size: 14px;">Isochrone Analysis</h4>
      <select id="isochrone-time" style="width: 100%; padding: 8px; margin-bottom: 10px;">
        <option value="300">5 minutes</option>
        <option value="600">10 minutes</option>
        <option value="900" selected>15 minutes</option>
        <option value="1800">30 minutes</option>
      </select>
      <button id="isochrone-btn" style="width: 100%; padding: 8px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Show Isochrone
      </button>

      <div id="route-info" style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; display: none;">
        <p style="margin: 5px 0; font-size: 12px;"><strong>Distance:</strong> <span id="route-distance">-</span></p>
        <p style="margin: 5px 0; font-size: 12px;"><strong>Time:</strong> <span id="route-time">-</span></p>
      </div>

      <button id="route-clear-btn" style="width: 100%; padding: 8px; margin-top: 10px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Clear All
      </button>
    `;

    document.body.appendChild(controlDiv);

    // Event listeners
    document.getElementById('route-start-btn')?.addEventListener('click', () => this.setStartMode());
    document.getElementById('route-end-btn')?.addEventListener('click', () => this.setEndMode());
    document.getElementById('route-calculate-btn')?.addEventListener('click', () => this.calculateRoute());
    document.getElementById('isochrone-btn')?.addEventListener('click', () => this.calculateIsochrone());
    document.getElementById('route-clear-btn')?.addEventListener('click', () => this.clear());
  }

  private initializeMapInteractions(): void {
    this.map.on('click', (e) => {
      if (this.clickMode === 'start') {
        this.setStart(e.lngLat.lng, e.lngLat.lat);
        this.clickMode = 'end';
      } else if (this.clickMode === 'end') {
        this.setEnd(e.lngLat.lng, e.lngLat.lat);
        this.clickMode = 'none';
      }
    });
  }

  private setStartMode(): void {
    this.clickMode = 'start';
    alert('Click on the map to select start point');
  }

  private setEndMode(): void {
    this.clickMode = 'end';
    alert('Click on the map to select end point');
  }

  private setStart(lon: number, lat: number): void {
    this.startCoords = [lon, lat];
    if (this.startMarker) this.startMarker.remove();
    this.startMarker = new maplibregl.Marker({ color: 'green' })
      .setLngLat([lon, lat])
      .addTo(this.map);
  }

  private setEnd(lon: number, lat: number): void {
    this.endCoords = [lon, lat];
    if (this.endMarker) this.endMarker.remove();
    this.endMarker = new maplibregl.Marker({ color: 'red' })
      .setLngLat([lon, lat])
      .addTo(this.map);
  }

  private async calculateRoute(): Promise<void> {
    if (!this.startCoords || !this.endCoords) {
      alert('Please select both start and end points');
      return;
    }

    try {
      const response = await fetch('/api/routing/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLon: this.startCoords[0],
          startLat: this.startCoords[1],
          endLon: this.endCoords[0],
          endLat: this.endCoords[1]
        })
      });

      const data = await response.json();

      // Display route
      if (!this.routeSource) {
        this.map.addSource('route', {
          type: 'geojson',
          data: data.route
        });
        this.map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#0080ff',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      } else {
        this.map.getSource('route').setData(data.route);
      }

      // Show info
      const infoDiv = document.getElementById('route-info');
      if (infoDiv) {
        infoDiv.style.display = 'block';
        document.getElementById('route-distance')!.textContent =
          `${(data.distance / 1000).toFixed(2)} km`;
        document.getElementById('route-time')!.textContent =
          `${Math.round(data.time / 60)} min`;
      }

      // Fit bounds
      const bounds = new maplibregl.LngLatBounds();
      data.route.features.forEach((feature: any) => {
        feature.geometry.coordinates.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
      });
      this.map.fitBounds(bounds, { padding: 50 });
    } catch (error) {
      console.error('Route calculation failed:', error);
      alert('Failed to calculate route');
    }
  }

  private async calculateIsochrone(): Promise<void> {
    if (!this.startCoords) {
      alert('Please select a start point');
      return;
    }

    const timeSelect = document.getElementById('isochrone-time') as HTMLSelectElement;
    const time = parseInt(timeSelect.value);

    try {
      const response = await fetch('/api/routing/isochrone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lon: this.startCoords[0],
          lat: this.startCoords[1],
          time
        })
      });

      const data = await response.json();

      // Display isochrones
      if (!this.isochroneSource) {
        this.map.addSource('isochrones', {
          type: 'geojson',
          data
        });
        data.features.forEach((feature: any, idx: number) => {
          this.map.addLayer({
            id: `isochrone-${idx}`,
            type: 'fill',
            source: 'isochrones',
            filter: ['==', 'time_minutes', feature.properties.time_minutes],
            paint: {
              'fill-color': feature.properties.fill_color,
              'fill-opacity': 0.4,
              'fill-outline-color': '#000'
            }
          });
        });
      } else {
        this.map.getSource('isochrones').setData(data);
      }
    } catch (error) {
      console.error('Isochrone calculation failed:', error);
      alert('Failed to calculate isochrone');
    }
  }

  private clear(): void {
    if (this.startMarker) this.startMarker.remove();
    if (this.endMarker) this.endMarker.remove();
    this.startCoords = null;
    this.endCoords = null;
    this.clickMode = 'none';

    if (this.map.getLayer('route')) {
      this.map.removeLayer('route');
      this.map.removeSource('route');
    }
    if (this.map.getLayer('isochrone')) {
      this.map.removeLayer('isochrone');
      this.map.removeSource('isochrones');
    }

    const infoDiv = document.getElementById('route-info');
    if (infoDiv) infoDiv.style.display = 'none';
  }
}
```

### Step 6.2: Integrate into Dashboard

Edit `client/src/dashboard.ts` and add near initialization:

```typescript
// ... existing code ...
import { RoutingTool } from './routing-tool';

class Dashboard {
  // ... existing properties ...
  private routingTool: RoutingTool | null = null;

  private setupMap(): void {
    // ... existing map setup ...

    // Initialize routing tool after map is ready
    this.map.on('load', () => {
      this.routingTool = new RoutingTool(this.map);
    });
  }
}
```

---

## ✅ Verification Checklist

After completing all phases:

- [ ] pgRouting extension installed and working
- [ ] roads_network table created with 4,836+ segments
- [ ] Network topology built (source/target nodes populated)
- [ ] Travel costs calculated
- [ ] SQL functions test successfully
- [ ] Backend API endpoints respond correctly
- [ ] Frontend routing UI renders and functions
- [ ] Routes display on map with distance/time
- [ ] Isochrones display with color gradients
- [ ] Grid visualization shows in map exports

---

## 🧪 Quick Test Queries

```bash
# Test data import
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
SELECT COUNT(*) FROM roads_network;
SELECT highway, COUNT(*) FROM roads_network GROUP BY highway;
EOF

# Test topology
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
SELECT COUNT(*) FROM roads_network_vertices_pgr;
SELECT COUNT(*) FROM roads_network WHERE source IS NOT NULL;
EOF

# Test route function
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
SELECT total_distance, total_time FROM calculate_route(112.75, -7.25, 112.70, -7.20);
EOF

# Test isochrone
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
SELECT calculate_isochrone(112.75, -7.25, 900);  -- 15 minutes
EOF
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| pgRouting extension not found | Install: `sudo apt-get install postgresql-16-pgrouting` |
| Topology creation fails | Check geometry validity: `SELECT ST_IsValid(geom) FROM roads_network` |
| No route found | Check nodes exist: `SELECT COUNT(*) FROM roads_network_vertices_pgr` |
| Slow routing queries | Ensure indexes exist: `SELECT * FROM pg_indexes WHERE tablename = 'roads_network'` |
| GDAL ogr2ogr not found | Install: `sudo apt-get install gdal-bin` |

---

## 📚 Documentation References

- **ISOCHRONE-GUIDE.md**: Complete routing implementation examples
- **PGROUTING-SETUP-GUIDE.md**: Detailed setup instructions
- **SESSION_2025-11-18-GRID-FIX-AND-ROUTING.md**: This session's progress

---

**Last Updated:** November 18, 2025
**Status:** Ready for Implementation
**Estimated Implementation Time:** 4-6 hours
