# Backend/Server Task Management

**Project:** MapID Web GIS - Backend API
**Last Updated:** 2025-11-02
**Sprint:** Phase 1 - Core Implementation

---

## Task Status Legend

- 🔴 **Blocked:** Cannot proceed due to dependency or issue
- 🟡 **In Progress:** Currently being worked on
- 🟢 **Completed:** Task finished and tested
- ⚪ **Not Started:** Waiting to begin
- 🔵 **In Review:** Ready for code review

---

## Sprint Overview

**Current Sprint:** Phase 1 - Foundation
**Start Date:**
**End Date:**
**Sprint Goal:** Complete authentication and basic layer management API

---

## Phase 1: Project Setup & Configuration

### 1.1 Project Initialization

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 1 | Initialize npm project | ⚪ | | HIGH | 0.5 | `npm init -y` |
| 2 | Install core dependencies | ⚪ | | HIGH | 0.5 | express, pg, bcrypt, jwt, cors, dotenv, zod |
| 3 | Install dev dependencies | ⚪ | | HIGH | 0.5 | typescript, @types/*, tsx |
| 4 | Create tsconfig.json | ⚪ | | HIGH | 0.5 | Target ES2020, strict mode |
| 5 | Create .env.example | ⚪ | | HIGH | 0.5 | Document all env variables |
| 6 | Create .gitignore | ⚪ | | HIGH | 0.5 | node_modules, .env, dist |
| 7 | Set up directory structure | ⚪ | | HIGH | 1 | Create all folders as per plan |

**Subtasks for #7:**
- [ ] Create src/ directory
- [ ] Create src/config/
- [ ] Create src/db/
- [ ] Create src/middleware/
- [ ] Create src/routes/
- [ ] Create src/controllers/
- [ ] Create src/models/
- [ ] Create src/types/
- [ ] Create src/utils/

---

## Phase 2: Database Setup

### 2.1 Database Connection

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 8 | Create database.config.ts | ⚪ | | HIGH | 1 | Database configuration |
| 9 | Create connection.ts | ⚪ | | HIGH | 2 | PostgreSQL connection pool |
| 10 | Test database connection | ⚪ | | HIGH | 0.5 | Verify connectivity |

**Dependencies:** #8 → #9 → #10

### 2.2 Database Schema

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 11 | Create users table migration | ⚪ | | HIGH | 1 | 001_create_users.sql |
| 12 | Create layers table migration | ⚪ | | HIGH | 1 | 002_create_layers.sql |
| 13 | Create layer_features migration | ⚪ | | HIGH | 1.5 | 003_create_layer_features.sql |
| 14 | Create indexes | ⚪ | | HIGH | 1 | Spatial indexes, user email |
| 15 | Seed default layers | ⚪ | | MEDIUM | 1 | Indonesia default layers |
| 16 | Test schema creation | ⚪ | | HIGH | 0.5 | Run all migrations |

**SQL Files to Create:**
- [ ] db/migrations/001_create_users.sql
- [ ] db/migrations/002_create_layers.sql
- [ ] db/migrations/003_create_layer_features.sql
- [ ] db/migrations/004_seed_default_layers.sql

---

## Phase 3: Core Middleware

### 3.1 Validation Middleware

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 17 | Create validation.middleware.ts | ⚪ | | HIGH | 2 | Zod validation wrapper |
| 18 | Create validation.schemas.ts | ⚪ | | HIGH | 2 | Shared Zod schemas |
| 19 | Test validation middleware | ⚪ | | HIGH | 1 | Unit tests |

### 3.2 Authentication Middleware

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 20 | Create jwt.util.ts | ⚪ | | HIGH | 2 | JWT sign/verify functions |
| 21 | Create auth.middleware.ts | ⚪ | | HIGH | 2 | JWT verification middleware |
| 22 | Test auth middleware | ⚪ | | HIGH | 1 | Mock JWT tokens |

**Dependencies:** #20 → #21 → #22

### 3.3 Error Handling Middleware

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 23 | Create error.middleware.ts | ⚪ | | HIGH | 2 | Centralized error handler |
| 24 | Define custom error classes | ⚪ | | MEDIUM | 1 | ValidationError, AuthError, etc. |
| 25 | Test error handling | ⚪ | | HIGH | 1 | Trigger various errors |

---

## Phase 4: Models (Data Access Layer)

### 4.1 User Model

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 26 | Create user.model.ts | ⚪ | | HIGH | 3 | CRUD operations |
| 27 | Implement findByEmail() | ⚪ | | HIGH | 0.5 | For login |
| 28 | Implement create() | ⚪ | | HIGH | 0.5 | For registration |
| 29 | Implement findById() | ⚪ | | MEDIUM | 0.5 | For profile |
| 30 | Test user model | ⚪ | | HIGH | 1 | Unit tests with test DB |

**Methods to Implement:**
- [ ] `findByEmail(email: string): Promise<User | null>`
- [ ] `create(email: string, passwordHash: string, fullName: string): Promise<User>`
- [ ] `findById(id: number): Promise<User | null>`

### 4.2 Layer Model

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 31 | Create layer.model.ts | ⚪ | | HIGH | 4 | Layer operations |
| 32 | Implement getDefaultLayers() | ⚪ | | HIGH | 1 | Public layers |
| 33 | Implement createLayer() | ⚪ | | HIGH | 1 | New layer metadata |
| 34 | Implement getLayerFeatures() | ⚪ | | HIGH | 2 | Return GeoJSON |
| 35 | Implement insertFeatures() | ⚪ | | HIGH | 2 | Bulk insert geometries |
| 36 | Test layer model | ⚪ | | HIGH | 2 | Test with sample GeoJSON |

**Methods to Implement:**
- [ ] `getDefaultLayers(): Promise<Layer[]>`
- [ ] `createLayer(name, description, type, userId): Promise<Layer>`
- [ ] `getLayerFeatures(layerId: number): Promise<GeoJSON>`
- [ ] `insertFeatures(layerId: number, features: GeoJSONFeature[]): Promise<void>`
- [ ] `deleteLayer(layerId: number): Promise<void>`

---

## Phase 5: Controllers (Business Logic)

### 5.1 Auth Controller

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 37 | Create auth.controller.ts | ⚪ | | HIGH | 4 | Auth business logic |
| 38 | Implement register() | ⚪ | | HIGH | 2 | Hash password, create user |
| 39 | Implement login() | ⚪ | | HIGH | 2 | Verify password, return JWT |
| 40 | Add rate limiting logic | ⚪ | | MEDIUM | 1 | Prevent brute force |
| 41 | Test auth controller | ⚪ | | HIGH | 2 | Integration tests |

**Dependencies:** #26-30 (User Model), #20 (JWT Utils)

**Test Cases:**
- [ ] Successful registration
- [ ] Duplicate email registration
- [ ] Successful login
- [ ] Invalid credentials
- [ ] Missing fields validation

### 5.2 Layers Controller

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 42 | Create layers.controller.ts | ⚪ | | HIGH | 4 | Layer business logic |
| 43 | Implement getDefaultLayers() | ⚪ | | HIGH | 1 | Return all default layers |
| 44 | Implement getLayerFeatures() | ⚪ | | HIGH | 1.5 | Return GeoJSON for layer |
| 45 | Implement uploadLayer() | ⚪ | | HIGH | 3 | Parse and store GeoJSON |
| 46 | Add GeoJSON validation | ⚪ | | HIGH | 2 | Validate structure |
| 47 | Test layers controller | ⚪ | | HIGH | 2 | Test with sample data |

**Dependencies:** #31-36 (Layer Model)

**Test Cases:**
- [ ] Get default layers (empty and populated)
- [ ] Get features for valid layer
- [ ] Get features for non-existent layer
- [ ] Upload valid GeoJSON (Point, LineString, Polygon)
- [ ] Upload invalid GeoJSON
- [ ] Upload oversized GeoJSON

---

## Phase 6: Routes (API Endpoints)

### 6.1 Auth Routes

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 48 | Create auth.routes.ts | ⚪ | | HIGH | 2 | Route definitions |
| 49 | Add POST /api/auth/register | ⚪ | | HIGH | 0.5 | With validation |
| 50 | Add POST /api/auth/login | ⚪ | | HIGH | 0.5 | With validation |
| 51 | Test auth routes with Postman | ⚪ | | HIGH | 1 | Manual testing |

**Dependencies:** #37-41 (Auth Controller), #17-19 (Validation)

### 6.2 Layer Routes

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 52 | Create layers.routes.ts | ⚪ | | HIGH | 2 | Route definitions |
| 53 | Add GET /api/layers/default | ⚪ | | HIGH | 0.5 | Protected route |
| 54 | Add GET /api/layers/:id/features | ⚪ | | HIGH | 0.5 | Protected route |
| 55 | Add POST /api/layers/upload | ⚪ | | HIGH | 1 | Protected + validation |
| 56 | Test layer routes with Postman | ⚪ | | HIGH | 1.5 | Manual testing |

**Dependencies:** #42-47 (Layers Controller), #20-22 (Auth Middleware)

---

## Phase 7: Server Setup

### 7.1 Express Application

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 57 | Create index.ts | ⚪ | | HIGH | 3 | Main entry point |
| 58 | Configure CORS | ⚪ | | HIGH | 0.5 | Allow frontend origin |
| 59 | Add JSON body parser | ⚪ | | HIGH | 0.5 | 50MB limit for GeoJSON |
| 60 | Register auth routes | ⚪ | | HIGH | 0.5 | /api/auth/* |
| 61 | Register layer routes | ⚪ | | HIGH | 0.5 | /api/layers/* |
| 62 | Add error middleware | ⚪ | | HIGH | 0.5 | Must be last |
| 63 | Add health check endpoint | ⚪ | | MEDIUM | 0.5 | GET /health |
| 64 | Test server startup | ⚪ | | HIGH | 0.5 | Should start without errors |

**Dependencies:** All previous routes, middleware, controllers

---

## Phase 8: Docker & Deployment

### 8.1 Docker Configuration

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 65 | Create Dockerfile | ⚪ | | HIGH | 2 | Multi-stage build |
| 66 | Create docker-compose.yml | ⚪ | | HIGH | 2 | PostgreSQL + backend |
| 67 | Create .dockerignore | ⚪ | | MEDIUM | 0.5 | Exclude node_modules |
| 68 | Test Docker build | ⚪ | | HIGH | 1 | docker build . |
| 69 | Test docker-compose up | ⚪ | | HIGH | 1 | Full stack startup |

### 8.2 Documentation

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 70 | Write README.md | ⚪ | | HIGH | 2 | Setup instructions |
| 71 | Document environment variables | ⚪ | | HIGH | 1 | .env.example |
| 72 | Create API documentation | ⚪ | | MEDIUM | 3 | Endpoint specs |
| 73 | Add inline code comments | ⚪ | | LOW | 2 | Complex logic only |

---

## Phase 9: Testing & Quality Assurance

### 9.1 Integration Testing

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 74 | Test complete auth flow | ⚪ | | HIGH | 2 | Register → Login → Access |
| 75 | Test layer retrieval | ⚪ | | HIGH | 1 | Default layers + features |
| 76 | Test layer upload | ⚪ | | HIGH | 2 | Multiple GeoJSON types |
| 77 | Test error scenarios | ⚪ | | HIGH | 2 | Invalid data, auth failures |
| 78 | Load testing | ⚪ | | MEDIUM | 3 | 50+ concurrent users |

### 9.2 Security Audit

| # | Task | Status | Owner | Priority | Est. Hours | Notes |
|---|------|--------|-------|----------|------------|-------|
| 79 | Test SQL injection prevention | ⚪ | | HIGH | 1 | Parameterized queries |
| 80 | Test XSS prevention | ⚪ | | HIGH | 1 | Input sanitization |
| 81 | Test authentication bypass | ⚪ | | HIGH | 1 | Try accessing without token |
| 82 | Test JWT expiration | ⚪ | | MEDIUM | 1 | Expired token handling |
| 83 | Review environment secrets | ⚪ | | HIGH | 0.5 | No secrets in code |

---

## Bug Tracker

| Bug # | Description | Severity | Status | Assigned To | Resolution |
|-------|-------------|----------|--------|-------------|------------|
| | | | | | |

**Severity Levels:**
- 🔴 **Critical:** Blocks core functionality
- 🟠 **High:** Major feature broken
- 🟡 **Medium:** Minor feature issue
- 🟢 **Low:** Cosmetic or edge case

---

## Daily Standup Notes

### [Date]

**Yesterday:**
-

**Today:**
-

**Blockers:**
-

---

## Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] All functions have type annotations
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] SQL queries use parameterized statements
- [ ] No secrets in code
- [ ] Comments explain "why" not "what"
- [ ] Functions are single-responsibility
- [ ] Code is DRY (Don't Repeat Yourself)

---

## Definition of Done

A task is considered complete when:

1. ✅ Code is written and follows style guidelines
2. ✅ Code is tested (unit/integration as applicable)
3. ✅ Code is reviewed by at least one person
4. ✅ Documentation is updated
5. ✅ No known bugs or issues
6. ✅ Deployed to development environment
7. ✅ Task marked as complete in this document

---

## Sprint Retrospective

### What Went Well
-

### What Could Be Improved
-

### Action Items
-

---

## Notes & Decisions

### [Date] - Decision Title

**Context:**

**Decision:**

**Alternatives Considered:**

**Consequences:**
