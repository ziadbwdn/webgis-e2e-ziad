# Phase 2 Implementation Plan: Advanced Interactions & Analysis

**Start Date:** November 5, 2025
**Target Completion:** 2-3 weeks
**Status:** Ready to Begin

---

## Phase 2 Objectives

Transform the basic GIS platform into an interactive analysis tool with:
1. **Asynchronous Job Processing** - Handle long-running geoprocessing tasks
2. **Feature Drawing/Editing** - Allow users to create and modify geometries
3. **Geoprocessing Tools** - Buffer, clip, intersect, union operations
4. **Client-side Analysis** - Quick calculations with Turf.js
5. **Event Bus Architecture** - Decouple components and improve state management

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    PHASE 2 ARCHITECTURE                  │
├─────────────────────────────────────────────────────────┤
│ FRONTEND                                                 │
│  ├── Event Bus (Pub/Sub pattern)                        │
│  ├── Drawing Tools (@mapbox/mapbox-gl-draw)             │
│  ├── Analysis Panel (UI for geoprocessing)              │
│  ├── Job Status Tracker (polling for async jobs)        │
│  └── Turf.js Tools (client-side preview)                │
├─────────────────────────────────────────────────────────┤
│ BACKEND                                                  │
│  ├── Job Queue System (Redis + BullMQ)                  │
│  │   ├── Job Creation API                               │
│  │   ├── Job Status API                                 │
│  │   └── Worker Process                                 │
│  ├── Geoprocessing Service                              │
│  │   ├── Buffer Analysis                                │
│  │   ├── Clip/Intersect                                 │
│  │   └── Spatial Queries                                │
│  └── Analysis Endpoints                                 │
├─────────────────────────────────────────────────────────┤
│ INFRASTRUCTURE                                           │
│  ├── Redis (Message Broker)                             │
│  ├── BullMQ (Job Queue Manager)                         │
│  └── PostGIS (Geoprocessing Engine)                     │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Week 1: Infrastructure & Job Queue System

#### Task 1.1: Redis Setup
**Priority:** High | **Effort:** 2 hours

```bash
# Install Redis
# Ubuntu/WSL
sudo apt-get install redis-server

# macOS
brew install redis

# Start Redis
redis-server
```

**Verify:**
```bash
redis-cli ping
# Should return: PONG
```

#### Task 1.2: Install BullMQ Dependencies
**Priority:** High | **Effort:** 1 hour

```bash
cd server
npm install bullmq ioredis
npm install --save-dev @types/ioredis
```

#### Task 1.3: Create Job Queue Infrastructure
**Priority:** High | **Effort:** 4 hours

**Files to Create:**
```
server/src/
├── queues/
│   ├── connection.ts          # Redis connection config
│   ├── analysis.queue.ts      # Analysis job queue
│   └── worker.ts              # Worker process
├── jobs/
│   ├── types.ts               # Job type definitions
│   └── handlers/
│       └── buffer.handler.ts  # Buffer analysis handler
└── services/
    └── geoprocessing.service.ts  # PostGIS operations
```

**Implementation:**

**1. Redis Connection (`queues/connection.ts`):**
```typescript
import { ConnectionOptions } from 'bullmq';

export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};
```

**2. Job Types (`jobs/types.ts`):**
```typescript
export enum JobType {
  BUFFER = 'buffer',
  CLIP = 'clip',
  INTERSECT = 'intersect',
  UNION = 'union',
}

export interface BufferJobData {
  layerId: number;
  distance: number;
  units: 'meters' | 'kilometers' | 'miles';
  userId: number;
}

export enum JobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface JobResult {
  jobId: string;
  status: JobStatus;
  resultLayerId?: number;
  error?: string;
  progress?: number;
  createdAt: Date;
  completedAt?: Date;
}
```

**3. Analysis Queue (`queues/analysis.queue.ts`):**
```typescript
import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import { JobType, BufferJobData } from '../jobs/types';

export const analysisQueue = new Queue('analysis', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
    },
  },
});

export async function createBufferJob(data: BufferJobData): Promise<string> {
  const job = await analysisQueue.add(JobType.BUFFER, data);
  return job.id!;
}
```

**4. Worker Process (`queues/worker.ts`):**
```typescript
import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection';
import { JobType, BufferJobData } from '../jobs/types';
import { handleBufferJob } from '../jobs/handlers/buffer.handler';

export const analysisWorker = new Worker(
  'analysis',
  async (job: Job) => {
    console.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case JobType.BUFFER:
        return await handleBufferJob(job.data as BufferJobData);

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs concurrently
  }
);

analysisWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

analysisWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

#### Task 1.4: Create Database Schema for Jobs
**Priority:** High | **Effort:** 1 hour

**File:** `server/src/db/migrations/005_create_jobs_table.sql`

```sql
-- Create jobs table for tracking analysis jobs
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  user_id INTEGER REFERENCES users(id),
  input_data JSONB,
  result_layer_id INTEGER REFERENCES layers(id),
  error_message TEXT,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
```

#### Task 1.5: Implement Buffer Analysis Handler
**Priority:** High | **Effort:** 3 hours

**File:** `server/src/jobs/handlers/buffer.handler.ts`

```typescript
import { BufferJobData } from '../types';
import { GeoprocessingService } from '../../services/geoprocessing.service';
import { LayerModel } from '../../models/layer.model';

export async function handleBufferJob(data: BufferJobData): Promise<number> {
  const { layerId, distance, units, userId } = data;

  // Get source layer
  const sourceLayer = await LayerModel.getLayerById(layerId);
  if (!sourceLayer) {
    throw new Error(`Layer ${layerId} not found`);
  }

  // Get features
  const features = await LayerModel.getLayerFeatures(layerId);

  // Perform buffer analysis using PostGIS
  const bufferedFeatures = await GeoprocessingService.buffer(
    features.features,
    distance,
    units
  );

  // Create new layer with results
  const resultLayer = await LayerModel.createLayerWithFeatures(
    `${sourceLayer.name} (Buffer ${distance}${units})`,
    `Buffer analysis result`,
    'polygon',
    userId,
    bufferedFeatures
  );

  return resultLayer.id;
}
```

#### Task 1.6: Create Geoprocessing Service
**Priority:** High | **Effort:** 4 hours

**File:** `server/src/services/geoprocessing.service.ts`

```typescript
import { getPool } from '../db/connection';
import { GeoJSONFeature } from '../types';

export class GeoprocessingService {
  static async buffer(
    features: GeoJSONFeature[],
    distance: number,
    units: 'meters' | 'kilometers' | 'miles'
  ): Promise<GeoJSONFeature[]> {
    const pool = getPool();

    // Convert units to meters (PostGIS ST_Buffer uses meters)
    let distanceInMeters = distance;
    if (units === 'kilometers') {
      distanceInMeters = distance * 1000;
    } else if (units === 'miles') {
      distanceInMeters = distance * 1609.34;
    }

    const results: GeoJSONFeature[] = [];

    for (const feature of features) {
      const geomWKT = this.geojsonToWKT(feature.geometry);

      const result = await pool.query(
        `SELECT ST_AsGeoJSON(ST_Buffer(ST_GeomFromText($1, 4326)::geography, $2)::geometry) as geometry`,
        [geomWKT, distanceInMeters]
      );

      results.push({
        type: 'Feature',
        geometry: JSON.parse(result.rows[0].geometry),
        properties: {
          ...feature.properties,
          buffer_distance: distance,
          buffer_units: units,
        },
      });
    }

    return results;
  }

  private static geojsonToWKT(geometry: any): string {
    // Reuse from LayerModel or create shared utility
    // ... implementation
  }
}
```

#### Task 1.7: Create Analysis API Endpoints
**Priority:** High | **Effort:** 3 hours

**File:** `server/src/controllers/analysis.controller.ts`

```typescript
import { Request, Response } from 'express';
import { createBufferJob, analysisQueue } from '../queues/analysis.queue';
import { AppError } from '../middleware/error.middleware';

export class AnalysisController {
  static async createBufferAnalysis(req: Request, res: Response): Promise<void> {
    const { layerId, distance, units } = req.body;
    const userId = req.userId!;

    // Create job
    const jobId = await createBufferJob({
      layerId,
      distance,
      units: units || 'meters',
      userId,
    });

    // Store job record in database
    await pool.query(
      `INSERT INTO jobs (id, type, status, user_id, input_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [jobId, 'buffer', 'queued', userId, JSON.stringify(req.body)]
    );

    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Analysis job created. Poll /api/jobs/:jobId for status.',
    });
  }

  static async getJobStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;

    // Get job from BullMQ
    const job = await analysisQueue.getJob(jobId);

    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    // Get job from database
    const result = await pool.query(
      'SELECT * FROM jobs WHERE id = $1',
      [jobId]
    );

    const jobRecord = result.rows[0];

    res.status(200).json({
      jobId: job.id,
      type: jobRecord.type,
      status: await job.getState(),
      progress: job.progress || 0,
      resultLayerId: jobRecord.result_layer_id,
      error: jobRecord.error_message,
      createdAt: jobRecord.created_at,
      completedAt: jobRecord.completed_at,
    });
  }
}
```

**File:** `server/src/routes/analysis.routes.ts`

```typescript
import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { bufferAnalysisSchema } from '../utils/validation.schemas';

const router = Router();

router.use(authMiddleware);

router.post(
  '/buffer',
  validateBody(bufferAnalysisSchema),
  asyncHandler(AnalysisController.createBufferAnalysis)
);

router.get(
  '/:jobId',
  asyncHandler(AnalysisController.getJobStatus)
);

export default router;
```

---

### Week 2: Frontend Drawing Tools & Client-side Analysis

#### Task 2.1: Install Drawing Dependencies
**Priority:** High | **Effort:** 1 hour

```bash
cd client
npm install @mapbox/mapbox-gl-draw
npm install --save-dev @types/mapbox__mapbox-gl-draw
```

#### Task 2.2: Integrate Drawing Tools
**Priority:** High | **Effort:** 4 hours

**File:** `client/src/map/drawing-manager.ts`

```typescript
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import maplibregl from 'maplibre-gl';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

export class DrawingManager {
  private draw: MapboxDraw;
  private map: maplibregl.Map;

  constructor(map: maplibregl.Map) {
    this.map = map;

    this.draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        point: true,
        line_string: true,
        polygon: true,
        trash: true,
      },
      styles: [
        // Custom styles for drawn features
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          paint: {
            'fill-color': '#3498db',
            'fill-opacity': 0.3,
          },
        },
        {
          id: 'gl-draw-line',
          type: 'line',
          paint: {
            'line-color': '#3498db',
            'line-width': 2,
          },
        },
        {
          id: 'gl-draw-point',
          type: 'circle',
          paint: {
            'circle-radius': 6,
            'circle-color': '#3498db',
          },
        },
      ],
    });

    this.map.addControl(this.draw);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.map.on('draw.create', this.onDrawCreate.bind(this));
    this.map.on('draw.update', this.onDrawUpdate.bind(this));
    this.map.on('draw.delete', this.onDrawDelete.bind(this));
  }

  private onDrawCreate(e: any) {
    console.log('Feature created:', e.features);
    // Emit event via Event Bus
    window.dispatchEvent(new CustomEvent('feature:created', {
      detail: { features: e.features }
    }));
  }

  private onDrawUpdate(e: any) {
    console.log('Feature updated:', e.features);
  }

  private onDrawDelete(e: any) {
    console.log('Feature deleted:', e.features);
  }

  enableDrawing(mode: 'point' | 'line_string' | 'polygon') {
    this.draw.changeMode(`draw_${mode}`);
  }

  getAll() {
    return this.draw.getAll();
  }

  deleteAll() {
    this.draw.deleteAll();
  }
}
```

#### Task 2.3: Create Analysis Panel UI
**Priority:** Medium | **Effort:** 6 hours

**File:** `client/src/components/analysis-panel.ts`

```typescript
export class AnalysisPanel {
  private container: HTMLElement;
  private onAnalysisStart: (type: string, params: any) => void;

  constructor(containerId: string, onAnalysisStart: (type: string, params: any) => void) {
    this.container = document.getElementById(containerId)!;
    this.onAnalysisStart = onAnalysisStart;
    this.render();
  }

  private render() {
    this.container.innerHTML = `
      <div class="analysis-panel">
        <h3>Analysis Tools</h3>

        <div class="tool-section">
          <h4>Buffer Analysis</h4>
          <label>
            Select Layer:
            <select id="buffer-layer-select"></select>
          </label>
          <label>
            Distance:
            <input type="number" id="buffer-distance" value="100" />
          </label>
          <label>
            Units:
            <select id="buffer-units">
              <option value="meters">Meters</option>
              <option value="kilometers">Kilometers</option>
              <option value="miles">Miles</option>
            </select>
          </label>
          <button id="run-buffer-btn">Run Buffer</button>
        </div>

        <div class="tool-section">
          <h4>Drawing Tools</h4>
          <button id="draw-point-btn">Draw Point</button>
          <button id="draw-line-btn">Draw Line</button>
          <button id="draw-polygon-btn">Draw Polygon</button>
          <button id="clear-drawing-btn">Clear</button>
        </div>

        <div id="job-status" style="display:none;">
          <h4>Analysis Progress</h4>
          <div class="progress-bar">
            <div id="progress-fill"></div>
          </div>
          <p id="status-message"></p>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners() {
    document.getElementById('run-buffer-btn')!.addEventListener('click', () => {
      const layerId = (document.getElementById('buffer-layer-select') as HTMLSelectElement).value;
      const distance = parseFloat((document.getElementById('buffer-distance') as HTMLInputElement).value);
      const units = (document.getElementById('buffer-units') as HTMLSelectElement).value;

      this.onAnalysisStart('buffer', { layerId: parseInt(layerId), distance, units });
    });

    // Add drawing button listeners...
  }

  showJobProgress(jobId: string, status: string, progress: number) {
    const jobStatus = document.getElementById('job-status')!;
    jobStatus.style.display = 'block';

    const progressFill = document.getElementById('progress-fill')!;
    progressFill.style.width = `${progress}%`;

    const statusMessage = document.getElementById('status-message')!;
    statusMessage.textContent = `Job ${jobId}: ${status} (${progress}%)`;
  }
}
```

#### Task 2.4: Implement Client-side Turf.js Tools
**Priority:** Medium | **Effort:** 4 hours

**File:** `client/src/tools/turf-tools.ts`

```typescript
import * as turf from '@turf/turf';

export class TurfTools {
  // Quick buffer preview (client-side only)
  static bufferPreview(feature: GeoJSON.Feature, distance: number, units: string): GeoJSON.Feature {
    return turf.buffer(feature, distance, { units: units as any });
  }

  // Calculate area
  static calculateArea(feature: GeoJSON.Feature<GeoJSON.Polygon>): number {
    return turf.area(feature); // Square meters
  }

  // Calculate length
  static calculateLength(feature: GeoJSON.Feature<GeoJSON.LineString>): number {
    return turf.length(feature, { units: 'kilometers' });
  }

  // Find features within polygon
  static pointsWithinPolygon(
    points: GeoJSON.FeatureCollection<GeoJSON.Point>,
    polygon: GeoJSON.Feature<GeoJSON.Polygon>
  ): GeoJSON.FeatureCollection<GeoJSON.Point> {
    return turf.pointsWithinPolygon(points, polygon);
  }

  // Distance between two points
  static distance(
    from: GeoJSON.Feature<GeoJSON.Point>,
    to: GeoJSON.Feature<GeoJSON.Point>,
    units: string = 'kilometers'
  ): number {
    return turf.distance(from, to, { units: units as any });
  }
}
```

---

### Week 3: Event Bus & Integration

#### Task 3.1: Implement Event Bus Pattern
**Priority:** High | **Effort:** 3 hours

**File:** `client/src/core/event-bus.ts`

```typescript
type EventCallback = (data: any) => void;

export class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  once(event: string, callback: EventCallback) {
    const onceCallback = (data: any) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
}

// Global event bus instance
export const eventBus = new EventBus();

// Event types
export const Events = {
  LAYER_ADDED: 'layer:added',
  LAYER_REMOVED: 'layer:removed',
  FEATURE_CREATED: 'feature:created',
  FEATURE_UPDATED: 'feature:updated',
  ANALYSIS_STARTED: 'analysis:started',
  ANALYSIS_COMPLETED: 'analysis:completed',
  ANALYSIS_FAILED: 'analysis:failed',
};
```

#### Task 3.2: Integrate Job Polling System
**Priority:** High | **Effort:** 3 hours

**File:** `client/src/services/job-poller.service.ts`

```typescript
import { eventBus, Events } from '../core/event-bus';

export class JobPollerService {
  private apiUrl: string;
  private authToken: string;
  private activeJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(apiUrl: string, authToken: string) {
    this.apiUrl = apiUrl;
    this.authToken = authToken;
  }

  startPolling(jobId: string) {
    if (this.activeJobs.has(jobId)) {
      return; // Already polling
    }

    const intervalId = setInterval(async () => {
      try {
        const status = await this.checkJobStatus(jobId);

        if (status.status === 'completed') {
          this.stopPolling(jobId);
          eventBus.emit(Events.ANALYSIS_COMPLETED, status);
        } else if (status.status === 'failed') {
          this.stopPolling(jobId);
          eventBus.emit(Events.ANALYSIS_FAILED, status);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

    this.activeJobs.set(jobId, intervalId);
  }

  stopPolling(jobId: string) {
    const intervalId = this.activeJobs.get(jobId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeJobs.delete(jobId);
    }
  }

  private async checkJobStatus(jobId: string) {
    const response = await fetch(`${this.apiUrl}/analysis/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get job status');
    }

    return response.json();
  }
}
```

---

## Testing Strategy

### Unit Tests
- [ ] Buffer handler creates correct geometries
- [ ] Job queue creates and processes jobs
- [ ] Turf.js tools return correct results
- [ ] Event bus emits and receives events

### Integration Tests
- [ ] Buffer analysis complete workflow (API → Worker → Database)
- [ ] Job polling updates UI correctly
- [ ] Drawing tools create valid GeoJSON
- [ ] Analysis results display on map

### Manual Testing Checklist
- [ ] Create buffer analysis job
- [ ] Poll for job completion
- [ ] Result layer appears on map
- [ ] Draw point/line/polygon on map
- [ ] Client-side buffer preview works
- [ ] Event bus notifies components

---

## Dependencies Summary

### Backend
```json
{
  "bullmq": "^5.0.0",
  "ioredis": "^5.3.0"
}
```

### Frontend
```json
{
  "@mapbox/mapbox-gl-draw": "^1.4.0",
  "@turf/turf": "^7.0.0" (already installed)
}
```

### Infrastructure
- Redis 6.0+ (message broker)

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Set up Redis** - Install and configure
3. **Start with Week 1 Task 1.1** - Begin implementation
4. **Test incrementally** - Don't wait until the end

Ready to begin Phase 2 implementation?
