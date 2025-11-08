# Week 1 Implementation Checklist

**Status:** Ready to implement when you are
**Estimated Time:** 10-12 hours
**Files to Create:** 2 main files
**Files to Modify:** Database migration

---

## Pre-Implementation (Before Starting Week 1)

- [ ] Review `CRITICAL_FIXES_COMPLETED.md`
- [ ] Review `PHASE2_PLAN.md`
- [ ] Understand job queue architecture
- [ ] Understand geoprocessing service
- [ ] Verify Redis installed and running
- [ ] Verify PostgreSQL + PostGIS installed

---

## Task 1: Install Dependencies (1 hour)

**File Location:** `server/package.json`

**Commands:**
```bash
cd server
npm install bullmq ioredis
npm install --save-dev @types/ioredis
```

**Verification:**
```bash
npm ls bullmq ioredis
# Should show both packages installed
```

**Checklist:**
- [ ] bullmq installed
- [ ] ioredis installed
- [ ] @types/ioredis installed
- [ ] package.json updated
- [ ] package-lock.json updated

---

## Task 2: Create API Controller (2 hours)

**File to Create:** `server/src/controllers/analysis.controller.ts`

**Key Methods Needed:**
- `createBufferAnalysis(req, res)` - POST /api/analysis/buffer
- `createClipAnalysis(req, res)` - POST /api/analysis/clip
- `createIntersectAnalysis(req, res)` - POST /api/analysis/intersect
- `createUnionAnalysis(req, res)` - POST /api/analysis/union
- `getJobStatus(req, res)` - GET /api/analysis/:jobId
- `cancelJob(req, res)` - DELETE /api/analysis/:jobId
- `getJobHistory(req, res)` - GET /api/analysis/history (optional)

**Reference:** Use `PHASE2_PLAN.md` section "Task 1.7: Create Analysis API Endpoints"

**Checklist:**
- [ ] All create methods implemented
- [ ] All get methods implemented
- [ ] Proper error handling with AppError
- [ ] Validation middleware usage
- [ ] Job creation with queue
- [ ] Database insert for job record
- [ ] TypeScript compiled without errors

---

## Task 3: Create API Routes (1 hour)

**File to Create:** `server/src/routes/analysis.routes.ts`

**Routes Needed:**
```
POST   /api/analysis/buffer     - createBufferAnalysis
POST   /api/analysis/clip       - createClipAnalysis
POST   /api/analysis/intersect  - createIntersectAnalysis
POST   /api/analysis/union      - createUnionAnalysis
GET    /api/analysis/:jobId     - getJobStatus
DELETE /api/analysis/:jobId     - cancelJob
GET    /api/analysis/history    - getJobHistory (optional)
```

**Key Features:**
- All routes protected by authMiddleware
- Proper validation middleware
- Async handler wrapper
- Correct HTTP methods and status codes

**Checklist:**
- [ ] All routes defined
- [ ] Auth middleware applied
- [ ] Validation middleware applied
- [ ] Async handlers used
- [ ] Correct status codes (201 for creation, 202 for async, 200 for get)

---

## Task 4: Create Database Migration (2 hours)

**File to Create:** `server/src/db/migrations/005_create_jobs_table.sql`

**Tables Needed:**
1. `jobs` table with columns:
   - id (VARCHAR PRIMARY KEY)
   - type (VARCHAR - buffer/clip/intersect/union)
   - status (VARCHAR - queued/running/completed/failed/cancelled)
   - user_id (INTEGER FOREIGN KEY)
   - input_data (JSONB)
   - result_layer_id (INTEGER FOREIGN KEY)
   - error_message (TEXT)
   - progress (INTEGER 0-100)
   - created_at (TIMESTAMP)
   - started_at (TIMESTAMP)
   - completed_at (TIMESTAMP)

**Indexes Needed:**
- idx_jobs_user_id ON jobs(user_id)
- idx_jobs_status ON jobs(status)
- idx_jobs_created_at ON jobs(created_at DESC)
- idx_jobs_cleanup ON jobs(status, completed_at) WHERE status IN (...)

**Functions Needed:**
- cleanup_old_jobs() function to delete completed jobs older than 7 days

**Reference:** Use `PHASE2_PLAN.md` section "Task 1.4: Create Database Schema for Jobs"

**Checklist:**
- [ ] jobs table created
- [ ] All columns defined
- [ ] Proper data types
- [ ] Foreign key constraints
- [ ] All indexes created
- [ ] Cleanup function created
- [ ] Migration runs without errors

---

## Task 5: Test Database Migration (1 hour)

**Commands:**
```bash
# Run migration (manually for now)
psql mapid_webgis < server/src/db/migrations/005_create_jobs_table.sql

# Verify table created
psql mapid_webgis -c "\d jobs"

# Verify indexes
psql mapid_webgis -c "\d+ jobs"

# Verify functions
psql mapid_webgis -c "\df cleanup_old_jobs"
```

**Checklist:**
- [ ] Table exists
- [ ] All columns present
- [ ] All indexes present
- [ ] Function works
- [ ] No errors in migration

---

## Task 6: Register Routes in Main App (30 minutes)

**File to Modify:** `server/src/index.ts`

**Add:**
```typescript
import analysisRoutes from './routes/analysis.routes';

// ... existing code ...

// Add analysis routes
app.use('/api/analysis', analysisRoutes);
```

**Checklist:**
- [ ] Import analysis routes
- [ ] Register routes with app.use()
- [ ] Backend compiles without errors
- [ ] Server starts without errors

---

## Task 7: Integration Testing (3 hours)

### 7.1: Start Services
```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Backend
cd server && npm run dev

# Terminal 3: Frontend
cd client && npm run dev
```

### 7.2: Test Buffer Analysis
```bash
# Get auth token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Create buffer job
curl -X POST http://localhost:3000/api/analysis/buffer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "layerId": 1,
    "distance": 100,
    "units": "meters"
  }'

# Check job status
curl http://localhost:3000/api/analysis/<JOB_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

### 7.3: Verify Results
**Checklist:**
- [ ] Job created successfully (202 response)
- [ ] Job ID returned
- [ ] Job appears in database
- [ ] Worker picks up job
- [ ] Progress updates visible in logs
- [ ] Job completed successfully
- [ ] Result layer ID returned
- [ ] New layer appears in database
- [ ] Frontend can fetch and display result

---

## Task 8: Error Handling Tests (1 hour)

**Test Cases:**
- [ ] Invalid layer ID - should return 404
- [ ] Negative distance - should return 400
- [ ] Invalid units - should return 400
- [ ] Missing auth token - should return 401
- [ ] Non-existent job ID - should return 404
- [ ] Layer with no features - should return 400

**Checklist:**
- [ ] All error cases handled
- [ ] Error messages are clear
- [ ] Correct HTTP status codes
- [ ] No server crashes

---

## Task 9: Optional - Frontend Integration (2 hours)

**Frontend Changes:**
- [ ] Update dashboard.ts with analysis panel
- [ ] Add job polling service
- [ ] Add progress bar UI
- [ ] Add result layer display
- [ ] Handle job completion/failure

**Checklist:**
- [ ] Analysis panel renders
- [ ] Can submit buffer job from UI
- [ ] Progress updates in real-time
- [ ] Result displays on map
- [ ] Error messages show to user

---

## Verification Checklist

### Code Quality
- [ ] All files compile without TypeScript errors
- [ ] No ESLint warnings
- [ ] Proper error handling throughout
- [ ] Comprehensive logging

### Functionality
- [ ] Buffer analysis creates correct geometries
- [ ] Job status updates properly
- [ ] Database records match actual state
- [ ] Worker processes jobs correctly
- [ ] Results persist in database

### Testing
- [ ] All API endpoints tested
- [ ] All error cases tested
- [ ] Integration tests pass
- [ ] Manual testing complete

### Documentation
- [ ] Code is well commented
- [ ] Architecture documented
- [ ] API endpoints documented
- [ ] Error codes documented

---

## Common Issues & Solutions

### Issue: Worker doesn't start
**Solution:**
- Check Redis is running: `redis-cli ping`
- Check connection.ts settings
- Check logs in terminal

### Issue: Jobs stay in "queued" status
**Solution:**
- Verify worker is running
- Check worker logs for errors
- Verify database connection

### Issue: Result layer not created
**Solution:**
- Check buffer handler logs
- Verify PostGIS functions work
- Check database transaction

### Issue: Port already in use
**Solution:**
- Change port in .env
- Or kill process: `lsof -ti:3000 | xargs kill -9`

---

## Timeline

| Task | Hours | Day |
|------|-------|-----|
| Dependencies | 1 | Day 1 |
| API Controller | 2 | Day 1 |
| API Routes | 1 | Day 2 |
| Database Migration | 2 | Day 2 |
| Test Migration | 1 | Day 2 |
| Register Routes | 0.5 | Day 3 |
| Integration Testing | 3 | Day 3 |
| Error Testing | 1 | Day 3 |
| Frontend (Optional) | 2 | Day 4 |
| **TOTAL** | **13.5** | **4 Days** |

---

## Success Criteria

Before moving to Week 2, verify:

- [ ] All 6 critical issues remain fixed
- [ ] API endpoints respond correctly
- [ ] Jobs are queued and processed
- [ ] Worker completes jobs successfully
- [ ] Results are created as expected
- [ ] Error handling works properly
- [ ] Database records are accurate
- [ ] Progress tracking shows updates
- [ ] Job status persists correctly
- [ ] No memory leaks or crashes

---

## Notes

- All code files are already created with proper structure
- Just need to add API endpoints and routes
- Database migration is straightforward SQL
- Use existing PHASE2_PLAN.md as reference for implementation details

**You're ready to go! Just need to execute the tasks when ready.** 🚀
