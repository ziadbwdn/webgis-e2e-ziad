# End-to-End Isochrone & Route Analysis Service Guide
**Tech Stack: TypeScript, MapLibre, PostGIS, pgRouting, OSM**

---

## **1. Architecture Overview**

### **System Components**
```
Frontend (MapLibre + TS) ↔ Backend API ↔ PostGIS/pgRouting ↔ OSM LineStrings
```

**Data Flow:**
1. User clicks origin/destination on map
2. Frontend sends coordinates to API
3. Backend queries pgRouting for routes/isochrones
4. Results returned as GeoJSON
5. MapLibre renders on map

---

## **2. Database Setup (PostGIS + pgRouting)**

### **2.1 Enable Extensions**
```sql
CREATE EXTENSION postgis;
CREATE EXTENSION pgrouting;
CREATE EXTENSION postgis_topology;
```

### **2.2 Prepare Road Network Table**
Assuming you have OSM linestrings in a table:

```sql
-- Create roads table with routing attributes
CREATE TABLE roads_network (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT,
    name VARCHAR(255),
    highway VARCHAR(50),  -- road type
    oneway VARCHAR(10),
    maxspeed INTEGER,
    geom GEOMETRY(LineString, 4326),
    source INTEGER,       -- start node
    target INTEGER,       -- end node
    cost DOUBLE PRECISION,    -- forward cost
    reverse_cost DOUBLE PRECISION,  -- backward cost
    length_m DOUBLE PRECISION
);

-- Create spatial index
CREATE INDEX roads_network_geom_idx ON roads_network USING GIST(geom);
CREATE INDEX roads_network_source_idx ON roads_network(source);
CREATE INDEX roads_network_target_idx ON roads_network(target);
```

### **2.3 Build Topology**
```sql
-- Create network topology (creates source/target nodes)
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

### **2.4 Calculate Costs**
```sql
-- Calculate cost based on length and speed
UPDATE roads_network SET 
    length_m = ST_Length(geom::geography),
    cost = ST_Length(geom::geography) / 
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
        ELSE ST_Length(geom::geography) / 
             (CASE 
                 WHEN maxspeed > 0 THEN maxspeed * 1000.0 / 3600.0
                 ELSE 40.0 * 1000.0 / 3600.0
             END)
    END;
```

---

## **3. Backend API Implementation**

### **3.1 Route Analysis Endpoint**

**SQL Function for Shortest Path:**
```sql
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
    
    -- Calculate route using Dijkstra
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
        MAX(agg_cost) as total_time
    FROM route
    WHERE geom IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
```

**TypeScript Backend (Node.js/Express example):**
```typescript
import { Pool } from 'pg';
import express from 'express';

const pool = new Pool({
    host: 'localhost',
    database: 'gis_db',
    user: 'postgres',
    password: 'password',
    port: 5432
});

interface RouteRequest {
    startLon: number;
    startLat: number;
    endLon: number;
    endLat: number;
}

app.post('/api/route', async (req, res) => {
    const { startLon, startLat, endLon, endLat }: RouteRequest = req.body;
    
    try {
        const result = await pool.query(
            'SELECT * FROM calculate_route($1, $2, $3, $4)',
            [startLon, startLat, endLon, endLat]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No route found' });
        }
        
        res.json({
            route: result.rows[0].geojson,
            distance: result.rows[0].total_distance,
            time: result.rows[0].total_time
        });
    } catch (error) {
        console.error('Route calculation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
```

### **3.2 Isochrone Analysis Endpoint**

**SQL Function for Isochrones:**
```sql
CREATE OR REPLACE FUNCTION calculate_isochrone(
    start_lon DOUBLE PRECISION,
    start_lat DOUBLE PRECISION,
    max_cost DOUBLE PRECISION  -- time in seconds
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
    
    -- Calculate driving distance polygons
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
        convex_hull AS (
            SELECT 
                ST_ConcaveHull(ST_Collect(geom), 0.85) as geom
            FROM points
        )
        SELECT json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
                'max_time', max_cost,
                'center', json_build_array(start_lon, start_lat)
            )
        )
        FROM convex_hull
    );
END;
$$ LANGUAGE plpgsql;
```

**TypeScript Backend:**
```typescript
interface IsochroneRequest {
    lon: number;
    lat: number;
    time: number;  // seconds
}

app.post('/api/isochrone', async (req, res) => {
    const { lon, lat, time }: IsochroneRequest = req.body;
    
    // Create multiple isochrones (5, 10, 15 min intervals)
    const intervals = [300, 600, 900, time].filter(t => t <= time);
    
    try {
        const promises = intervals.map(interval => 
            pool.query(
                'SELECT calculate_isochrone($1, $2, $3) as geojson',
                [lon, lat, interval]
            )
        );
        
        const results = await Promise.all(promises);
        
        const features = results.map((result, idx) => ({
            ...result.rows[0].geojson,
            properties: {
                ...result.rows[0].geojson.properties,
                time_minutes: intervals[idx] / 60,
                fill_color: getColorForInterval(idx)
            }
        }));
        
        res.json({
            type: 'FeatureCollection',
            features
        });
    } catch (error) {
        console.error('Isochrone calculation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function getColorForInterval(index: number): string {
    const colors = ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'];
    return colors[index] || '#a50f15';
}
```

---

## **4. Frontend Implementation (MapLibre + TypeScript)**

### **4.1 Map Initialization**
```typescript
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

class RouteAnalyzer {
    private map: maplibregl.Map;
    private startMarker: maplibregl.Marker | null = null;
    private endMarker: maplibregl.Marker | null = null;
    private startCoords: [number, number] | null = null;
    private endCoords: [number, number] | null = null;
    
    constructor(container: string) {
        this.map = new maplibregl.Map({
            container,
            style: {
                version: 8,
                sources: {
                    'osm': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors'
                    }
                },
                layers: [{
                    id: 'osm',
                    type: 'raster',
                    source: 'osm'
                }]
            },
            center: [0, 0],
            zoom: 2
        });
        
        this.initializeInteractions();
    }
    
    private initializeInteractions(): void {
        let clickCount = 0;
        
        this.map.on('click', (e) => {
            if (clickCount === 0) {
                this.setStart(e.lngLat.lng, e.lngLat.lat);
                clickCount = 1;
            } else if (clickCount === 1) {
                this.setEnd(e.lngLat.lng, e.lngLat.lat);
                this.calculateRoute();
                clickCount = 0;
            }
        });
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
}
```

### **4.2 Route Display**
```typescript
async calculateRoute(): Promise<void> {
    if (!this.startCoords || !this.endCoords) return;
    
    try {
        const response = await fetch('/api/route', {
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
        
        // Remove existing route layer
        if (this.map.getLayer('route')) {
            this.map.removeLayer('route');
            this.map.removeSource('route');
        }
        
        // Add route to map
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
        
        // Fit bounds to route
        const bounds = new maplibregl.LngLatBounds();
        data.route.features.forEach((feature: any) => {
            feature.geometry.coordinates.forEach((coord: [number, number]) => {
                bounds.extend(coord);
            });
        });
        this.map.fitBounds(bounds, { padding: 50 });
        
        // Display route info
        this.displayRouteInfo(data.distance, data.time);
    } catch (error) {
        console.error('Route calculation failed:', error);
    }
}

private displayRouteInfo(distance: number, time: number): void {
    const infoDiv = document.getElementById('route-info');
    if (infoDiv) {
        infoDiv.innerHTML = `
            <h3>Route Information</h3>
            <p>Distance: ${(distance / 1000).toFixed(2)} km</p>
            <p>Estimated Time: ${(time / 60).toFixed(0)} minutes</p>
        `;
    }
}
```

### **4.3 Isochrone Display**
```typescript
async calculateIsochrone(time: number = 900): Promise<void> {
    if (!this.startCoords) {
        alert('Please select a starting point first');
        return;
    }
    
    try {
        const response = await fetch('/api/isochrone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lon: this.startCoords[0],
                lat: this.startCoords[1],
                time
            })
        });
        
        const data = await response.json();
        
        // Remove existing isochrone layers
        for (let i = 0; i < 5; i++) {
            if (this.map.getLayer(`isochrone-${i}`)) {
                this.map.removeLayer(`isochrone-${i}`);
            }
        }
        if (this.map.getSource('isochrones')) {
            this.map.removeSource('isochrones');
        }
        
        // Add isochrones to map
        this.map.addSource('isochrones', {
            type: 'geojson',
            data
        });
        
        // Add fill layers for each isochrone (reverse order for proper stacking)
        data.features.reverse().forEach((feature: any, idx: number) => {
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
        
        // Add legend
        this.addIsochroneLegend(data.features);
    } catch (error) {
        console.error('Isochrone calculation failed:', error);
    }
}

private addIsochroneLegend(features: any[]): void {
    const legendDiv = document.getElementById('isochrone-legend');
    if (legendDiv) {
        legendDiv.innerHTML = '<h4>Travel Time</h4>' + 
            features.map(f => `
                <div>
                    <span style="background: ${f.properties.fill_color}; 
                                 display: inline-block; 
                                 width: 20px; 
                                 height: 20px;"></span>
                    ${f.properties.time_minutes} min
                </div>
            `).join('');
    }
}
```

### **4.4 UI Controls**
```typescript
addControls(): void {
    const controlsHTML = `
        <div id="controls" style="position: absolute; top: 10px; right: 10px; 
                                  background: white; padding: 10px; 
                                  border-radius: 5px; z-index: 1000;">
            <button id="clear-btn">Clear All</button>
            <button id="route-btn">Calculate Route</button>
            <select id="isochrone-time">
                <option value="300">5 min</option>
                <option value="600">10 min</option>
                <option value="900" selected>15 min</option>
                <option value="1800">30 min</option>
            </select>
            <button id="isochrone-btn">Show Isochrone</button>
        </div>
        <div id="route-info" style="position: absolute; bottom: 10px; left: 10px;
                                     background: white; padding: 10px;
                                     border-radius: 5px; z-index: 1000;"></div>
        <div id="isochrone-legend" style="position: absolute; bottom: 10px; right: 10px;
                                          background: white; padding: 10px;
                                          border-radius: 5px; z-index: 1000;"></div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', controlsHTML);
    
    document.getElementById('clear-btn')?.addEventListener('click', () => this.clear());
    document.getElementById('route-btn')?.addEventListener('click', () => this.calculateRoute());
    document.getElementById('isochrone-btn')?.addEventListener('click', () => {
        const select = document.getElementById('isochrone-time') as HTMLSelectElement;
        this.calculateIsochrone(parseInt(select.value));
    });
}

private clear(): void {
    this.startMarker?.remove();
    this.endMarker?.remove();
    this.startCoords = null;
    this.endCoords = null;
    
    ['route', 'isochrones'].forEach(sourceId => {
        if (this.map.getSource(sourceId)) {
            const layers = this.map.getStyle().layers.filter(
                (layer: any) => layer.source === sourceId
            );
            layers.forEach(layer => this.map.removeLayer(layer.id));
            this.map.removeSource(sourceId);
        }
    });
    
    document.getElementById('route-info')!.innerHTML = '';
    document.getElementById('isochrone-legend')!.innerHTML = '';
}
```

---

## **5. Optimization & Performance**

### **5.1 Database Optimizations**
```sql
-- Create materialized view for frequently accessed routes
CREATE MATERIALIZED VIEW popular_routes AS
SELECT 
    source,
    target,
    COUNT(*) as frequency
FROM route_requests
GROUP BY source, target
HAVING COUNT(*) > 10;

-- Refresh periodically
REFRESH MATERIALIZED VIEW popular_routes;

-- Partition large road networks by region
CREATE TABLE roads_network_region1 PARTITION OF roads_network
FOR VALUES FROM (minx, miny) TO (maxx, maxy);
```

### **5.2 Caching Strategy**
```typescript
class RouteCache {
    private cache = new Map<string, any>();
    private maxSize = 100;
    
    private generateKey(start: [number, number], end: [number, number]): string {
        return `${start[0].toFixed(5)},${start[1].toFixed(5)}-` +
               `${end[0].toFixed(5)},${end[1].toFixed(5)}`;
    }
    
    get(start: [number, number], end: [number, number]): any {
        return this.cache.get(this.generateKey(start, end));
    }
    
    set(start: [number, number], end: [number, number], data: any): void {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(this.generateKey(start, end), data);
    }
}
```

### **5.3 Frontend Performance**
```typescript
// Debounce map interactions
private debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Use WebWorkers for heavy calculations
private worker: Worker;

constructor() {
    this.worker = new Worker('/route-worker.js');
    this.worker.onmessage = (e) => {
        this.handleRouteResult(e.data);
    };
}

calculateRouteAsync(): void {
    this.worker.postMessage({
        type: 'route',
        start: this.startCoords,
        end: this.endCoords
    });
}
```

---

## **6. Error Handling & Edge Cases**

```typescript
interface RouteError {
    code: string;
    message: string;
}

class RouteErrorHandler {
    static handle(error: any): RouteError {
        if (error.message?.includes('No path found')) {
            return {
                code: 'NO_ROUTE',
                message: 'No route found between these points. They may be in disconnected road networks.'
            };
        }
        
        if (error.message?.includes('timeout')) {
            return {
                code: 'TIMEOUT',
                message: 'Route calculation took too long. Try points closer together.'
            };
        }
        
        return {
            code: 'UNKNOWN',
            message: 'An error occurred calculating the route.'
        };
    }
}
```

---

## **7. Testing Strategy**

```typescript
describe('Route Analysis', () => {
    test('should calculate route between two points', async () => {
        const result = await calculateRoute(
            -0.1276, 51.5074,  // London
            -0.0759, 51.5155   // Stratford
        );
        
        expect(result.route).toBeDefined();
        expect(result.distance).toBeGreaterThan(0);
        expect(result.time).toBeGreaterThan(0);
    });
    
    test('should handle disconnected road networks', async () => {
        await expect(
            calculateRoute(0, 0, 100, 100)  // Ocean to ocean
        ).rejects.toThrow('No path found');
    });
});
```

---

## **8. Deployment Checklist**

- [ ] **Database**: Properly indexed, topology validated
- [ ] **API**: Rate limiting, authentication, CORS configured
- [ ] **Frontend**: Minified, tree-shaken, lazy loaded
- [ ] **Caching**: Redis for route cache, CDN for tiles
- [ ] **Monitoring**: Log route failures, track response times
- [ ] **Documentation**: API docs with examples
- [ ] **Security**: Validate coordinates, sanitize inputs, use HTTPS

---

This guide provides a complete foundation for building an isochrone and routing service. Adjust costs, algorithms, and UI based on your specific requirements!