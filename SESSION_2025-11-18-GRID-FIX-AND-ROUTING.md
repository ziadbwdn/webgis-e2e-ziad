# Grid Fix & pgRouting Implementation - Session Progress
**Date:** November 18, 2025
**Current Status:** 🟡 In Progress - Grid visualization fixed, ready for testing
**Objective:** Fix map export grid visualization, then implement pgRouting for isochrone & routing analysis

---

## Part 1: Grid Visualization Fix

### ✅ What Was Fixed

**Problem Identified:**
- Grid lines and tick marks were not visible in the exported map
- Root cause: Opacity settings too low, canvas compositing issues, potential coordinate transformation bugs
- Grid calculation logic was correct, but rendering was not visible

**Solution Implemented:**
- **Increased line opacity**: Changed from `rgba(255,255,255,0.7)` to `rgba(255,255,255,1)` (full opacity white)
- **Added shadow effects**: Added subtle black shadow `shadowBlur: 2` to white lines for contrast over map background
- **Improved tick marks**:
  - Changed stroke width from 1.2px to 1.5px for main grid
  - Changed tick stroke from 1.5px to 2px for visibility
  - Changed label positions for better spacing
  - Used `textBaseline: 'middle'` for latitude labels
- **Added debug logging**: Console logs grid bounds and line coordinates to verify calculations are correct
- **Coordinate mapping preserved**:
  - Proper handling of map centering offset (drawX, drawY account for aspect ratio centering)
  - Geographic bounds properly mapped to canvas pixels
  - Grid spacing correctly aligned to 0.5° boundaries

**Key Code Changes (client/src/dashboard.ts):**

```typescript
// Grid lines now use full opacity white with shadow for visibility
ctx.strokeStyle = 'rgba(255, 255, 255, 1)';  // Full opacity
ctx.lineWidth = 1.5;
ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';      // Black shadow for contrast
ctx.shadowBlur = 2;

// Tick marks with strong contrast
ctx.strokeStyle = 'rgba(0, 0, 0, 1)';        // Full opacity black
ctx.lineWidth = 2;                            // Thicker lines
ctx.fillStyle = 'rgba(0, 0, 0, 1)';          // Full opacity text
```

### 📋 Build Status
- ✅ TypeScript compilation: **SUCCESS** (no errors)
- ✅ Vite build: **SUCCESS** (3.89 kB minified)
- ✅ Client dev server: **RUNNING** on http://localhost:5173
- ✅ Backend server: **RUNNING** on http://localhost:3000

### 🧪 How to Test Grid Fix

**Prerequisites:**
- Apps running on localhost:5173 (client) and localhost:3000 (server)
- Map with data loaded on dashboard

**Test Steps (Human-in-the-loop):**
1. Navigate to dashboard page
2. Zoom to Surabaya area or any area with visible layers
3. Click "Export" button
4. Set export options (format: PNG, include scale & grid)
5. Click "Export Map"
6. **Verify in exported image:**
   - ✅ White grid lines visible across map
   - ✅ Grid lines aligned to 0.5° boundaries (112.5°, 113.0°, -7.0°, -7.5°, etc.)
   - ✅ Bottom axis: Longitude labels (112.6°, 112.7°, etc.)
   - ✅ Left axis: Latitude labels (-7.25°, -7.20°, etc.)
   - ✅ Tick marks perpendicular to axes
   - Check console (F12) for debug logs showing grid coordinate mappings

**Debug Info Available:**
Console logs will show:
```
Grid bounds: { westBound, eastBound, southBound, northBound, mapLeft, mapRight, mapTop, mapBottom, ... }
Grid line at lng=112.5° -> pixelX=250.3
Grid line at lat=-7.25° -> pixelY=450.8
...
```

---

## Part 2: pgRouting Implementation Roadmap

### 📊 Current Data Status

**Available Geometry Files** (in `client/data`):
| File | Size | Features | Type |
|------|------|----------|------|
| highway_secondary.geojson | 2.02 MB | 1,638 | MultiLineString |
| highway_tertiary.geojson | 1.58 MB | 1,517 | MultiLineString |
| highway_trunk.geojson | 0.68 MB | 513 | MultiLineString |
| highway_primary.geojson | 0.13 MB | 168 | MultiLineString |
| all-routes_v2.geojson | 0.57 MB | 16 | LineString |

**Total**: 4,836+ road segments covering Surabaya area
**Coverage**: Lat [-7.27 to -7.24], Lon [112.64 to 112.79] (~15km × 15km)

### 🔧 Implementation Steps

#### Step 1: Install pgRouting Extension (Database Setup)
**Status:** ⏳ PENDING
**Location:** PostgreSQL database `mapid_webgis`

```bash
# Connect to database
psql -U postgres -d mapid_webgis

# In PostgreSQL:
CREATE EXTENSION IF NOT EXISTS pgrouting;
SELECT pgr_version();  -- Should return version info
```

**Why needed:** pgRouting provides algorithms for:
- `pgr_dijkstra()` - Shortest path routing
- `pgr_drivingDistance()` - Isochrone calculation
- `pgr_alphaShape()` - Polygon generation from points

#### Step 2: Import GeoJSON to PostgreSQL
**Status:** ⏳ PENDING

Convert GeoJSON road data into routable network:

```bash
# Option A: Using GDAL (if available)
ogr2ogr -f "PostgreSQL" PG:"dbname=mapid_webgis" highway_primary.geojson -nln roads_primary

# Option B: Using Python/Node script to load and parse GeoJSON
# This would:
# 1. Read .geojson files
# 2. Parse LineString/MultiLineString geometries
# 3. INSERT into PostgreSQL table with proper structure
```

**Target table structure:**
```sql
CREATE TABLE roads_network (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT,
    name VARCHAR(255),
    highway VARCHAR(50),        -- road type: primary, secondary, tertiary, trunk
    oneway VARCHAR(10),
    maxspeed INTEGER,
    geom GEOMETRY(LineString, 4326),
    source INTEGER,             -- start node
    target INTEGER,             -- end node
    cost DOUBLE PRECISION,      -- time in seconds (forward)
    reverse_cost DOUBLE PRECISION,  -- time in seconds (backward)
    length_m DOUBLE PRECISION
);
```

#### Step 3: Build Network Topology
**Status:** ⏳ PENDING

Create nodes and edge relationships required by pgRouting:

```sql
-- Create topology (nodes & edges)
SELECT pgr_createTopology(
    'roads_network',
    0.00001,  -- tolerance in degrees (~1m)
    'geom',
    'id',
    'source',
    'target'
);

-- Analyze topology for issues
SELECT pgr_analyzeGraph(
    'roads_network',
    0.00001,
    'geom',
    'id',
    'source',
    'target'
);
```

#### Step 4: Calculate Routing Costs
**Status:** ⏳ PENDING

Assign time-based costs based on road type:

```sql
UPDATE roads_network SET
    length_m = ST_Length(geom::geography),
    cost = length_m / (CASE
        WHEN highway = 'motorway' THEN 110.0 * 1000.0 / 3600.0      -- 110 km/h
        WHEN highway = 'trunk' THEN 90.0 * 1000.0 / 3600.0          -- 90 km/h
        WHEN highway = 'primary' THEN 70.0 * 1000.0 / 3600.0        -- 70 km/h
        WHEN highway = 'secondary' THEN 50.0 * 1000.0 / 3600.0      -- 50 km/h
        WHEN highway = 'tertiary' THEN 40.0 * 1000.0 / 3600.0       -- 40 km/h
        ELSE 30.0 * 1000.0 / 3600.0                                 -- 30 km/h default
    END),
    reverse_cost = CASE
        WHEN oneway IN ('yes', '1', 'true') THEN -1
        ELSE cost
    END;
```

#### Step 5: Create SQL Functions for Routing
**Status:** ⏳ PENDING

```sql
-- Route calculation function
CREATE OR REPLACE FUNCTION calculate_route(
    start_lon DOUBLE PRECISION,
    start_lat DOUBLE PRECISION,
    end_lon DOUBLE PRECISION,
    end_lat DOUBLE PRECISION
)
RETURNS TABLE(
    geojson JSON,
    total_distance DOUBLE PRECISION,
    total_time DOUBLE PRECISION
) AS $$
-- Implementation from ISOCHRONE-GUIDE.md
$$ LANGUAGE plpgsql;

-- Isochrone function
CREATE OR REPLACE FUNCTION calculate_isochrone(
    start_lon DOUBLE PRECISION,
    start_lat DOUBLE PRECISION,
    max_cost DOUBLE PRECISION  -- time in seconds
)
RETURNS JSON AS $$
-- Implementation from ISOCHRONE-GUIDE.md
$$ LANGUAGE plpgsql;
```

#### Step 6: Implement Backend API Endpoints
**Status:** ⏳ PENDING
**Files:** `server/src/routes/` and `server/src/controllers/`

```typescript
// POST /api/route
// Body: { startLon, startLat, endLon, endLat }
// Response: { route: GeoJSON, distance: meters, time: seconds }

// POST /api/isochrone
// Body: { lon, lat, time: seconds }
// Response: FeatureCollection with multiple isochrone polygons
```

Reference implementation available in `ISOCHRONE-GUIDE.md` (lines 107-335)

#### Step 7: Frontend Routing UI
**Status:** ⏳ PENDING
**Location:** `client/src/` (new component or dashboard extension)

Features needed:
- Click-to-place start/end markers (or button to input coordinates)
- Route calculation and visualization (blue line on map)
- Route info panel (distance, time, road names)
- Isochrone visualization with time intervals (5min, 10min, 15min, 30min)
- Isochrone legend with travel time bands

Reference frontend code available in `ISOCHRONE-GUIDE.md` (lines 340-615)

---

## 🎯 Next Phase: Routing Setup

### Recommended Execution Order:

1. **Immediate**: Test grid visualization (this session)
   - Verify white grid lines appear in export
   - Check coordinate alignment is correct
   - Confirm labels and tick marks render properly

2. **Day 1-2**: pgRouting Database Setup
   - Install pgRouting extension
   - Create roads_network table
   - Import GeoJSON data
   - Build topology
   - Calculate costs

3. **Day 2-3**: Backend API Implementation
   - Create SQL functions (route, isochrone)
   - Implement Express endpoints
   - Add error handling
   - Test with curl/Postman

4. **Day 3-4**: Frontend Integration
   - Build routing UI component
   - Add map click handlers for markers
   - Implement route visualization
   - Add isochrone visualization
   - Add legend and info panels

### Technical Decisions Made:

✅ **Road Speed Assumptions** (from PGROUTING-SETUP-GUIDE.md):
- Motorway: 110 km/h
- Trunk: 90 km/h
- Primary: 70 km/h
- Secondary: 50 km/h
- Tertiary: 40 km/h
- Default: 30 km/h

✅ **Grid Spacing**: Fixed 0.5° increments (aligned to geographic boundaries)

✅ **Isochrone Intervals**: 5, 10, 15, 30 minutes (user-selectable)

✅ **Coordinate System**: WGS84 (EPSG:4326) throughout

---

## 📚 Documentation References

- **ISOCHRONE-GUIDE.md** (lines 107-335): Backend API implementation
- **ISOCHRONE-GUIDE.md** (lines 340-615): Frontend routing UI
- **PGROUTING-SETUP-GUIDE.md**: OSM data import and topology setup
- **EXPORT_GUIDE.md**: Export feature documentation

---

## 🔍 Grid Visualization Debug Info

**Coordinate System Used:**
```
┌─────────────────────────────────────────────┐
│ Canvas Coordinates (pixels)                  │
│ Origin (0,0) at top-left                     │
│                                              │
│  (mapLeft, mapTop) ┌─────────────┐          │
│       ↓            │ MAIN MAP    │          │
│       └────────────│ (drawWidth) │──────┐   │
│    (mapBottom)     │ (drawHeight)│      │   │
│                    └─────────────┘      │   │
│                                   (mapRight)│
└─────────────────────────────────────────────┘

Geographic Coordinates (WGS84):
┌──────────────────────────────────────┐
│ (northBound, westBound)              │
│  y+b, x                              │
│ ┌─────────────────────────────────┐  │
│ │ VISIBLE MAP AREA                │  │
│ │ Coverage:                        │  │
│ │ Lon: [westBound, eastBound]    │  │
│ │ Lat: [southBound, northBound]  │  │
│ │ (x, y) to (x+a, y+b)           │  │
│ └─────────────────────────────────┘  │
│              y, (x+a)                │
└──────────────────────────────────────┘
```

**Transformation Formula:**
```
pixelX = mapLeft + ((lng - westBound) / lngRange) * drawWidth
pixelY = mapTop + ((northBound - lat) / latRange) * drawHeight
```

Where:
- `lngRange = eastBound - westBound` (geographic width)
- `latRange = northBound - southBound` (geographic height)
- `drawX`, `drawY`, `drawWidth`, `drawHeight` = actual canvas positions accounting for aspect ratio centering

---

## ✅ Status Summary

| Component | Status | Details |
|-----------|--------|---------|
| Grid visualization fix | ✅ COMPLETED | Full opacity, shadows, proper coordinates |
| TypeScript build | ✅ PASSING | No compilation errors |
| Client dev server | ✅ RUNNING | http://localhost:5173 |
| Backend server | ✅ RUNNING | http://localhost:3000 |
| pgRouting extension | ⏳ PENDING | Not yet installed |
| Road network import | ⏳ PENDING | GeoJSON ready, needs DB import |
| Topology build | ⏳ PENDING | Ready after data import |
| API endpoints | ⏳ PENDING | Code templates from guides available |
| Frontend UI | ⏳ PENDING | Code templates from guides available |

---

## 📝 Notes for Next Session

- Grid fix uses full opacity white (not 70%) - verify visibility in browser export
- Debug logs will be very helpful for coordinate validation - check browser console when exporting
- Road network data is ready and validates (4,836 segments, valid LineString/MultiLineString geometries)
- Speed assumptions can be adjusted based on local road standards
- Consider caching route calculations in Redis for performance
- May need to implement request rate limiting for API endpoints

---

**Document Version:** 1.0
**Last Updated:** November 18, 2025
**Session Status:** 🟡 IN PROGRESS - Grid fix complete, routing setup pending
**Next Action:** Test grid visualization in browser, then proceed with pgRouting setup

