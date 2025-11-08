# Analysis API Reference

**Version:** 1.0
**Status:** Week 1 Implementation Complete
**Date:** November 8, 2025

---

## Base URL

```
http://localhost:3000/api/analysis
```

## Authentication

All endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

Obtain a token from:
- **POST** `/api/auth/login` - Returns JWT token
- **POST** `/api/auth/register` - Create account and get token

---

## Endpoints

### 1. Create Buffer Analysis Job

Create a new buffer analysis job that generates a buffered version of a layer.

**Endpoint:**
```
POST /api/analysis/buffer
```

**Request Body:**
```json
{
  "layerId": 1,
  "distance": 100,
  "units": "meters"
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| layerId | integer | Yes | ID of the layer to buffer |
| distance | number | Yes | Buffer distance (must be positive) |
| units | string | No | Distance units: `meters` (default), `kilometers`, `miles` |

**Response (202 Accepted):**
```json
{
  "jobId": "buffer-1-1731093600000",
  "status": "queued",
  "message": "Analysis job created. Poll /api/analysis/:jobId for status."
}
```

**Error Responses:**
| Status | Error | Reason |
|--------|-------|--------|
| 400 | Invalid input | Missing required fields or invalid values |
| 401 | Missing authorization token | No JWT token provided |
| 404 | Layer not found or access denied | LayerId doesn't exist or user doesn't have access |
| 500 | Internal server error | Server error during job creation |

**Example:**
```bash
curl -X POST http://localhost:3000/api/analysis/buffer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "layerId": 1,
    "distance": 500,
    "units": "meters"
  }'
```

---

### 2. Create Clip Analysis Job

Create a new clip analysis job (**NOT YET IMPLEMENTED**).

**Endpoint:**
```
POST /api/analysis/clip
```

**Request Body:**
```json
{
  "layerId": 1,
  "clipLayerId": 2
}
```

**Response:**
```json
{
  "error": "Clip analysis not yet implemented"
}
```

**Status:** 501 Not Implemented

---

### 3. Create Intersect Analysis Job

Create a new intersect analysis job (**NOT YET IMPLEMENTED**).

**Endpoint:**
```
POST /api/analysis/intersect
```

**Request Body:**
```json
{
  "layerId1": 1,
  "layerId2": 2
}
```

**Response:**
```json
{
  "error": "Intersect analysis not yet implemented"
}
```

**Status:** 501 Not Implemented

---

### 4. Create Union Analysis Job

Create a new union analysis job (**NOT YET IMPLEMENTED**).

**Endpoint:**
```
POST /api/analysis/union
```

**Request Body:**
```json
{
  "layerId1": 1,
  "layerId2": 2
}
```

**Response:**
```json
{
  "error": "Union analysis not yet implemented"
}
```

**Status:** 501 Not Implemented

---

### 5. Get Job Status

Retrieve the current status and progress of a job.

**Endpoint:**
```
GET /api/analysis/:jobId
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | string | Job ID returned from job creation endpoint |

**Response (200 OK):**
```json
{
  "jobId": "buffer-1-1731093600000",
  "type": "buffer",
  "status": "running",
  "progress": 50,
  "resultLayerId": null,
  "error": null,
  "createdAt": "2025-11-08T12:00:00.000Z",
  "completedAt": null
}
```

**Status Values:**
- `queued` - Job is waiting to be processed
- `running` - Job is currently processing
- `completed` - Job completed successfully
- `failed` - Job failed with an error
- `cancelled` - Job was cancelled by user

**Progress:**
- 0-100 (percentage complete)
- Progress updates: 10%, 30%, 50%, 80%, 100%

**Response Examples:**

**Running Job:**
```json
{
  "jobId": "buffer-1-1731093600000",
  "type": "buffer",
  "status": "running",
  "progress": 80,
  "resultLayerId": null,
  "error": null,
  "createdAt": "2025-11-08T12:00:00.000Z",
  "completedAt": null
}
```

**Completed Job:**
```json
{
  "jobId": "buffer-1-1731093600000",
  "type": "buffer",
  "status": "completed",
  "progress": 100,
  "resultLayerId": 42,
  "error": null,
  "createdAt": "2025-11-08T12:00:00.000Z",
  "completedAt": "2025-11-08T12:05:30.000Z"
}
```

**Failed Job:**
```json
{
  "jobId": "buffer-1-1731093600000",
  "type": "buffer",
  "status": "failed",
  "progress": 50,
  "resultLayerId": null,
  "error": "Layer has no features to buffer",
  "createdAt": "2025-11-08T12:00:00.000Z",
  "completedAt": "2025-11-08T12:02:15.000Z"
}
```

**Error Responses:**
| Status | Error | Reason |
|--------|-------|--------|
| 401 | Missing authorization token | No JWT token provided |
| 403 | Access denied to this job | Job belongs to different user |
| 404 | Job not found | Job ID doesn't exist |
| 500 | Internal server error | Server error during status retrieval |

**Example:**
```bash
curl http://localhost:3000/api/analysis/buffer-1-1731093600000 \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 6. Cancel Job

Cancel a running or queued job.

**Endpoint:**
```
DELETE /api/analysis/:jobId
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | string | Job ID to cancel |

**Response (200 OK):**
```json
{
  "jobId": "buffer-1-1731093600000",
  "status": "cancelled",
  "message": "Job cancelled successfully"
}
```

**Error Responses:**
| Status | Error | Reason |
|--------|-------|--------|
| 400 | Cannot cancel job in {status} state | Job already completed/failed/cancelled |
| 401 | Missing authorization token | No JWT token provided |
| 403 | Access denied to this job | Job belongs to different user |
| 404 | Job not found | Job ID doesn't exist |
| 500 | Internal server error | Server error during cancellation |

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/analysis/buffer-1-1731093600000 \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 7. Get Job History (Commented Out - Not Yet Available)

Get user's job history with pagination.

**Endpoint:**
```
GET /api/analysis/history
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Number of jobs to return |
| offset | integer | 0 | Number of jobs to skip |

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "id": "buffer-1-1731093600000",
      "type": "buffer",
      "status": "completed",
      "progress": 100,
      "result_layer_id": 42,
      "error_message": null,
      "created_at": "2025-11-08T12:00:00.000Z",
      "completed_at": "2025-11-08T12:05:30.000Z"
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

**Status:** ⚠️ Currently commented out - enable in routes when ready

---

## Response Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST request (auth endpoints) |
| 202 | Accepted | Successful async job submission |
| 400 | Bad Request | Invalid input parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User lacks access to resource |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server error |
| 501 | Not Implemented | Feature not yet implemented |

---

## Job Lifecycle

```
CREATE REQUEST
    ↓
[1] Job created in queue (queued status)
    ↓
[2] Job picked up by worker (running status)
    ↓
[3] Progress updates (10%, 30%, 50%, 80%)
    ↓
[4] Job completes or fails
    ↓
[5] Database updated with result/error
    ↓
GET STATUS returns final result
```

---

## Database Schema

### jobs Table

```sql
CREATE TABLE jobs (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,           -- 'buffer', 'clip', 'intersect', 'union'
  status VARCHAR(50) NOT NULL,         -- 'queued', 'running', 'completed', 'failed', 'cancelled'
  user_id INTEGER NOT NULL,            -- User who created the job
  input_data JSONB,                    -- Original job parameters
  result_layer_id INTEGER,             -- Resulting layer ID (if successful)
  error_message TEXT,                  -- Error message (if failed)
  progress INTEGER DEFAULT 0,          -- 0-100
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Indexes

- `idx_jobs_user_id` - Fast lookup by user
- `idx_jobs_status` - Fast lookup by status
- `idx_jobs_created_at` - Sorting by creation time
- `idx_jobs_cleanup` - For cleanup queries

### Cleanup Function

Completed jobs older than 7 days are automatically deleted:
```sql
SELECT cleanup_old_jobs();
```

---

## Error Response Format

All errors return JSON with error message:

```json
{
  "error": "Descriptive error message"
}
```

---

## Authentication Flow

1. Register or login to get JWT token
2. Include token in `Authorization: Bearer <token>` header
3. Token valid for 7 days
4. All analysis endpoints require valid token

---

## Buffer Analysis Details

### Algorithm
- Uses PostGIS `ST_Buffer()` function
- Converts distance to appropriate CRS units
- Handles all geometry types

### Progress Tracking
1. 10% - Layer fetched
2. 30% - Features loaded
3. 50% - Buffer calculation started
4. 80% - Result layer creation started
5. 100% - Complete

### Input Validation
- Distance must be positive
- Layer must exist and have features
- User must have access to layer

---

## Rate Limiting

Currently no rate limiting. Implement if needed.

---

## Versioning

Current API version: **1.0**

Future versions will be at `/api/v2/analysis/...`

---

## Testing with cURL

### Full workflow example

```bash
# 1. Register user
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "full_name": "Test User"
  }' | jq -r '.token')

# 2. Create buffer job
JOB=$(curl -s -X POST http://localhost:3000/api/analysis/buffer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "layerId": 1,
    "distance": 100,
    "units": "meters"
  }' | jq -r '.jobId')

# 3. Check status
curl -s http://localhost:3000/api/analysis/$JOB \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4. Poll for completion
while true; do
  STATUS=$(curl -s http://localhost:3000/api/analysis/$JOB \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status')
  echo "Status: $STATUS"
  [ "$STATUS" = "completed" ] && break
  sleep 2
done

# 5. Get final result
curl -s http://localhost:3000/api/analysis/$JOB \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Document Information

- **Created:** November 8, 2025
- **Last Updated:** November 8, 2025
- **Status:** ✅ Production Ready (Buffer)
- **Status:** ❌ Not Implemented (Clip, Intersect, Union)
