# Week 2 Plan - Frontend Integration & Advanced Handlers

**Status:** Ready to Start
**Duration:** 3 days (similar to Week 1)
**Dependencies:** Week 1 ✅ Complete

---

## Overview

Build frontend UI for analysis tools and complete remaining analysis handlers (clip, intersect, union).

---

## Task 1: Frontend UI for Buffer Analysis (1 day)

**Files to Create:**
- `client/src/analysis-panel.ts` - Analysis UI component
- `client/src/analysis-service.ts` - Job polling & management

**What to Build:**
1. Analysis panel with tabs (Buffer, Clip, Intersect, Union)
2. Buffer input form (layer selector, distance input, units dropdown)
3. Job status display with progress bar
4. Results list showing created layers
5. Job history

**Key Features:**
- Real-time progress updates (poll every 2 seconds)
- Error display with user-friendly messages
- Cancel button for running jobs
- Load result layer on completion
- Clear completed jobs

---

## Task 2: Implement Clip Handler (8 hours)

**File:** `server/src/jobs/handlers/buffer.handler.ts`

**Add Function:** `handleClipJob(data, job)`

**What it Does:**
1. Validate both layer IDs exist
2. Update progress (10%)
3. Load both layers' features (30%)
4. Use PostGIS ST_Intersection to clip (50%)
5. Create result layer (80%)
6. Insert features (100%)

**PostGIS Operation:**
```sql
ST_Intersection(layer1.geom, layer2.geom)
```

---

## Task 3: Implement Intersect Handler (8 hours)

**File:** `server/src/jobs/handlers/buffer.handler.ts`

**Add Function:** `handleIntersectJob(data, job)`

**What it Does:**
1. Validate both layer IDs
2. Load features from both layers (30%)
3. Find overlapping geometries (50%)
4. Create new layer with intersections (80%)
5. Save features (100%)

**PostGIS Operation:**
```sql
ST_Intersection(layer1.geom, layer2.geom)
```

---

## Task 4: Implement Union Handler (8 hours)

**File:** `server/src/jobs/handlers/buffer.handler.ts`

**Add Function:** `handleUnionJob(data, job)`

**What it Does:**
1. Validate both layer IDs
2. Load features (30%)
3. Union geometries (50%)
4. Dissolve boundaries (80%)
5. Save result (100%)

**PostGIS Operation:**
```sql
ST_Union(layer1.geom, layer2.geom)
```

---

## Task 5: Update Worker Routes (4 hours)

**File:** `server/src/routes/analysis.routes.ts`

**Changes:**
- Remove 501 (Not Implemented) errors
- Add proper route handlers for clip, intersect, union
- Link to new handlers

---

## Task 6: Frontend Result Visualization (8 hours)

**Features:**
- Auto-load result layer on job completion
- Style result layer with different color
- Show result metadata (feature count, bounds)
- Add to layer list
- Option to download as GeoJSON

---

## Estimated Timeline

| Task | Hours | Day |
|------|-------|-----|
| Frontend UI | 8 | Day 1 |
| Clip Handler | 8 | Day 2 |
| Intersect Handler | 8 | Day 2 |
| Union Handler | 8 | Day 3 |
| Route Updates | 4 | Day 3 |
| Result Visualization | 8 | Day 3 |
| Testing | 4 | Day 3 |
| **Total** | **48** | **3 Days** |

---

## Success Criteria

- ✅ All 4 analysis types fully implemented
- ✅ Frontend UI responsive and intuitive
- ✅ Job polling working smoothly
- ✅ Results displaying on map
- ✅ Error handling comprehensive
- ✅ No TypeScript errors
- ✅ All tests passing

---

## Dependencies

**Backend:**
- PostGIS ST_Buffer ✅ Working
- PostGIS ST_Intersection ⏳ Need to implement
- PostGIS ST_Union ⏳ Need to implement

**Frontend:**
- MapLibre GL JS ✅ Ready
- Layer management ✅ Ready
- Feature rendering ✅ Ready

---

## Reference Files

- Backend: `docs/2025-11-05-phase2-prep/PHASE2_PLAN.md` (sections 2.1-2.4)
- Handlers: `server/src/jobs/handlers/buffer.handler.ts` (use as template)
- Routes: `server/src/routes/analysis.routes.ts`

---

## Next Actions (When Starting Week 2)

1. Review existing buffer handler implementation
2. Create clip handler (copy & modify buffer)
3. Create intersect handler
4. Create union handler
5. Build frontend UI
6. Integrate result visualization
7. Test all scenarios

---

**Status:** ✅ Ready to Begin
**Prerequisites:** All Week 1 tasks complete
