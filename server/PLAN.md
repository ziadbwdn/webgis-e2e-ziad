# Backend/Server Development Plan

**Project:** MapID Web GIS - Backend API
**Technology Stack:** Node.js + Express + PostgreSQL + PostGIS
**Last Updated:** 2025-11-02

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Choices](#technology-choices)
3. [Directory Structure](#directory-structure)
4. [Database Design](#database-design)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Security](#authentication--security)
7. [Implementation Phases](#implementation-phases)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Strategy](#deployment-strategy)

---

## Architecture Overview

### System Architecture

```
┌─────────────┐
│   Client    │
│ (Frontend)  │
└──────┬──────┘
       │ HTTP/REST
       │
┌──────▼──────────────────────────┐
│   Express API Server            │
│  ┌──────────────────────────┐  │
│  │  Middleware Layer        │  │
│  │  - CORS                  │  │
│  │  - Auth (JWT)            │  │
│  │  - Validation (Zod)      │  │
│  │  - Error Handler         │  │
│  └──────────┬───────────────┘  │
│  ┌──────────▼───────────────┐  │
│  │  Routes Layer            │  │
│  │  - /api/auth/*           │  │
│  │  - /api/layers/*         │  │
│  └──────────┬───────────────┘  │
│  ┌──────────▼───────────────┐  │
│  │  Controllers Layer       │  │
│  │  - Business Logic        │  │
│  └──────────┬───────────────┘  │
│  ┌──────────▼───────────────┐  │
│  │  Models Layer            │  │
│  │  - Data Access           │  │
│  └──────────┬───────────────┘  │
└─────────────┼───────────────────┘
              │
       ┌──────▼──────┐
       │ PostgreSQL  │
       │  + PostGIS  │
       └─────────────┘
```

### Design Principles

1. **Separation of Concerns:** Clear separation between routes, controllers, models, and middleware
2. **Security First:** Input validation, authentication, and error handling from the start
3. **Scalability:** Designed to handle 50K+ users with proper indexing and caching
4. **Maintainability:** Simple, readable code with minimal dependencies
5. **RESTful Design:** Standard HTTP methods and resource-based URLs

---

## Technology Choices

### Core Dependencies

| Package | Version | Purpose | Justification |
|---------|---------|---------|---------------|
| **express** | ^4.18.0 | Web framework | Industry standard, simple, well-documented |
| **pg** | ^8.11.0 | PostgreSQL client | Official PostgreSQL driver for Node.js |
| **bcrypt** | ^5.1.0 | Password hashing | Secure password storage |
| **jsonwebtoken** | ^9.0.0 | JWT generation | Stateless authentication |
| **cors** | ^2.8.5 | CORS middleware | Enable cross-origin requests |
| **dotenv** | ^16.0.0 | Environment config | Secure configuration management |
| **zod** | ^3.22.0 | Validation | Type-safe input validation |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **typescript** | ^5.0.0 | Type safety |
| **@types/express** | ^4.17.0 | Express type definitions |
| **@types/node** | ^20.0.0 | Node.js type definitions |
| **tsx** | ^4.0.0 | TypeScript execution |

### Why This Stack?

- **No ORM:** Direct SQL queries for better performance and control
- **TypeScript:** Type safety without runtime overhead
- **Minimal Dependencies:** Easier to maintain and update
- **Standard Tools:** Well-known packages with large communities

---

## Directory Structure

```
server/
├── src/
│   ├── index.ts                 # Entry point, Express app setup
│   │
│   ├── config/
│   │   └── database.config.ts   # Database configuration
│   │
│   ├── db/
│   │   ├── connection.ts        # PostgreSQL connection pool
│   │   └── migrations/          # SQL migration scripts
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_layers.sql
│   │       └── 003_create_layer_features.sql
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts   # JWT verification
│   │   ├── validation.middleware.ts  # Zod validation
│   │   ├── error.middleware.ts  # Error handling
│   │   └── logger.middleware.ts # Request logging (optional)
│   │
│   ├── routes/
│   │   ├── auth.routes.ts       # Authentication routes
│   │   └── layers.routes.ts     # Layer management routes
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts   # Auth business logic
│   │   └── layers.controller.ts # Layer business logic
│   │
│   ├── models/
│   │   ├── user.model.ts        # User data access
│   │   └── layer.model.ts       # Layer data access
│   │
│   ├── services/                # Business services (future)
│   │   └── geospatial.service.ts
│   │
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   │
│   └── utils/
│       ├── jwt.util.ts          # JWT helper functions
│       └── validation.schemas.ts # Shared validation schemas
│
├── tests/                       # Test files (future)
│   ├── unit/
│   └── integration/
│
├── .env.example                 # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── Dockerfile                   # Docker container definition
└── PLAN.md                      # This file
```

---

## Database Design

### Schema Overview

#### 1. Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**Purpose:** Store user authentication and profile information

**Fields:**
- `id`: Auto-incrementing primary key
- `email`: Unique identifier for login
- `password_hash`: bcrypt-hashed password (never store plain text)
- `full_name`: User's display name
- `created_at`: Account creation timestamp
- `updated_at`: Last modification timestamp

#### 2. Layers Table

```sql
CREATE TABLE layers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50),           -- 'point', 'linestring', 'polygon', 'raster'
  is_default BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_layers_default ON layers(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_layers_created_by ON layers(created_by);
```

**Purpose:** Store layer metadata (not the actual geometries)

**Fields:**
- `id`: Layer identifier
- `name`: Display name
- `description`: Layer description
- `type`: Geometry type for rendering
- `is_default`: Whether layer is available to all users
- `created_by`: User who created the layer (NULL for system layers)

#### 3. Layer Features Table

```sql
CREATE TABLE layer_features (
  id SERIAL PRIMARY KEY,
  layer_id INTEGER REFERENCES layers(id) ON DELETE CASCADE,
  geom GEOMETRY(Geometry, 4326),  -- PostGIS spatial type, WGS84
  properties JSONB,               -- Feature attributes
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spatial index for fast geometric queries
CREATE INDEX idx_layer_features_geom ON layer_features USING GIST(geom);
CREATE INDEX idx_layer_features_layer_id ON layer_features(layer_id);
CREATE INDEX idx_layer_features_properties ON layer_features USING GIN(properties);
```

**Purpose:** Store actual spatial data (geometries and attributes)

**Fields:**
- `id`: Feature identifier
- `layer_id`: Reference to parent layer
- `geom`: PostGIS geometry (points, lines, polygons)
- `properties`: JSON attributes (flexible schema)

### Database Initialization

**Default Layers for Indonesia:**

```sql
INSERT INTO layers (name, description, type, is_default) VALUES
('Indonesia OSM Base', 'OpenStreetMap basemap for Indonesia', 'raster', TRUE),
('Population Density', 'Population density by administrative region', 'polygon', TRUE),
('Economic Status', 'Economic indicators by region', 'polygon', TRUE),
('Old Public Routes', 'Historical public transportation routes', 'linestring', TRUE),
('Recent Public Routes', 'Current public transportation routes', 'linestring', TRUE);
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register

**Description:** Register a new user account

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe"
}
```

**Validation:**
- Email: Valid email format
- Password: Minimum 6 characters
- Full name: Non-empty string

**Response (201):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Error Responses:**
- 400: Invalid input
- 409: Email already exists

---

#### POST /api/auth/login

**Description:** Authenticate user and receive JWT token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Error Responses:**
- 401: Invalid credentials
- 400: Invalid input

---

### Layer Endpoints (Protected)

All layer endpoints require the `Authorization: Bearer <token>` header.

#### GET /api/layers/default

**Description:** Get all default layers (available to all users)

**Response (200):**
```json
{
  "layers": [
    {
      "id": 1,
      "name": "Indonesia OSM Base",
      "description": "OpenStreetMap basemap for Indonesia",
      "type": "raster",
      "is_default": true
    }
  ]
}
```

---

#### GET /api/layers/:layerId/features

**Description:** Get all features for a specific layer as GeoJSON

**URL Parameters:**
- `layerId`: Layer ID (integer)

**Response (200):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [106.8456, -6.2088]
      },
      "properties": {
        "name": "Jakarta",
        "population": 10562088
      }
    }
  ]
}
```

**Error Responses:**
- 404: Layer not found
- 401: Unauthorized

---

#### POST /api/layers/upload

**Description:** Upload a new layer with GeoJSON data

**Request Body:**
```json
{
  "name": "My Custom Layer",
  "description": "Points of interest",
  "geojson": {
    "type": "FeatureCollection",
    "features": [...]
  }
}
```

**Response (201):**
```json
{
  "layer": {
    "id": 6,
    "name": "My Custom Layer",
    "description": "Points of interest",
    "type": "point",
    "created_by": 1
  }
}
```

**Error Responses:**
- 400: Invalid GeoJSON
- 413: Payload too large
- 401: Unauthorized

---

## Authentication & Security

### JWT Implementation

**Token Structure:**
```javascript
{
  userId: 1,
  email: "user@example.com",
  iat: 1635724800,  // Issued at
  exp: 1636329600   // Expires in 7 days
}
```

**Security Considerations:**
1. **Secret Key:** Store in environment variable, use strong random string
2. **Token Expiration:** 7 days default, refresh token flow in Phase 2
3. **HTTPS Only:** In production, serve over HTTPS
4. **Password Hashing:** Use bcrypt with salt rounds = 10

### Input Validation

**Zod Schemas:**
```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  full_name: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const uploadLayerSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  geojson: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.any()),
  }),
});
```

### Error Handling

**Centralized Error Middleware:**
- Never expose internal errors to client
- Log errors server-side
- Return generic error messages
- Use appropriate HTTP status codes

---

## Implementation Phases

### Phase 1: Core Setup (Week 1)

- [ ] Initialize npm project
- [ ] Set up TypeScript configuration
- [ ] Create directory structure
- [ ] Install dependencies
- [ ] Set up database connection
- [ ] Create database schema

### Phase 2: Authentication (Week 1-2)

- [ ] Implement user model
- [ ] Create auth controller (register/login)
- [ ] Add JWT middleware
- [ ] Add validation middleware
- [ ] Test auth flow with Postman

### Phase 3: Layer Management (Week 2)

- [ ] Implement layer model
- [ ] Create layer controller
- [ ] Add GeoJSON validation
- [ ] Implement layer upload
- [ ] Test layer endpoints

### Phase 4: Error Handling & Security (Week 2-3)

- [ ] Add centralized error handler
- [ ] Implement request logging
- [ ] Add rate limiting (optional)
- [ ] Security audit
- [ ] Performance testing

### Phase 5: Docker & Deployment (Week 3)

- [ ] Create Dockerfile
- [ ] Set up docker-compose
- [ ] Test local deployment
- [ ] Prepare for production

---

## Testing Strategy

### Unit Tests

**Tools:** Jest or Mocha

**Coverage:**
- Models: Database queries
- Controllers: Business logic
- Utils: Helper functions
- Middleware: Validation, auth

### Integration Tests

**Coverage:**
- API endpoints
- Database operations
- Authentication flow
- File upload

### Testing Checklist

- [ ] Test happy paths
- [ ] Test error cases
- [ ] Test edge cases (empty data, large files)
- [ ] Test authentication/authorization
- [ ] Test SQL injection prevention
- [ ] Load testing (50+ concurrent users)

---

## Deployment Strategy

### Environment Configuration

**Required Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/webgisdb

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# Server
PORT=3000
NODE_ENV=production

# Optional
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Docker Deployment

**Production Considerations:**
1. Use multi-stage builds for smaller images
2. Run as non-root user
3. Use connection pooling for PostgreSQL
4. Enable CORS only for known origins
5. Implement rate limiting
6. Set up health check endpoints

### Scaling Strategy

**For 50K+ users:**
1. Database indexing (already planned)
2. Connection pooling (pg pool)
3. Horizontal scaling with load balancer
4. Redis for session caching (Phase 2)
5. CDN for static assets
6. Database read replicas (if needed)

---

## Next Steps

1. Complete Phase 1 setup
2. Implement authentication endpoints
3. Test with frontend integration
4. Add layer management features
5. Security hardening
6. Deploy to staging environment

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-02 | Use Zod for validation | Better TypeScript integration than Joi |
| 2025-11-02 | No ORM (use raw SQL) | Better performance, simpler debugging |
| 2025-11-02 | JWT for auth | Stateless, scalable, industry standard |
