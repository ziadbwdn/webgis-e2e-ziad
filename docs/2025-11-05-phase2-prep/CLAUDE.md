# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MapID Web GIS is a web-based Geographic Information System (GIS) dashboard for managing and visualizing geospatial data. The project uses a monorepo structure with separate frontend (client) and backend (server) applications.

**Tech Stack:**
- **Frontend:** TypeScript, Vite, MapLibre GL JS, Turf.js
- **Backend:** Node.js, Express, PostgreSQL, PostGIS, JWT authentication
- **Database:** PostgreSQL with PostGIS extension for spatial data

## Directory Structure

```
mapid-webgis/
├── client/                 # Frontend application (Vite + TypeScript)
│   ├── src/
│   │   ├── main.ts        # Authentication UI (login/register)
│   │   └── dashboard.ts   # Map dashboard
│   ├── public/
│   ├── index.html         # Auth page
│   ├── dashboard.html     # Dashboard page
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/                # Backend application (Express + TypeScript)
│   ├── src/
│   │   ├── index.ts            # Express server entry point
│   │   ├── config/             # Configuration files
│   │   ├── db/                 # Database connection and migrations
│   │   ├── middleware/         # Express middleware (auth, validation, error)
│   │   ├── controllers/        # Request handlers (auth, layers)
│   │   ├── routes/             # API routes
│   │   ├── models/             # Data models (User, Layer)
│   │   ├── utils/              # Utilities (JWT, validation schemas)
│   │   └── types/              # TypeScript types
│   ├── dist/              # Compiled JavaScript output
│   ├── tsconfig.json
│   └── package.json
│
├── PROGRESS.md            # Development progress tracker
├── ROADMAP.md             # High-level project roadmap
└── .env                   # Environment variables (DATABASE_URL, JWT_SECRET, etc.)
```

## Common Development Commands

### Server (Backend)

```bash
cd server

# Start development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm build

# Run compiled server
npm start

# Run tests
npm test
```

### Client (Frontend)

```bash
cd client

# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm preview

# Run linter
npm run lint

# Format code
npm run format
```

### Database Setup

Database migrations are in `server/src/db/migrations/`. They are numbered and create:
1. **users** table - Authentication data with email and password_hash
2. **layers** table - Layer metadata (name, description, type, is_default flag)
3. **layer_features** table - PostGIS geometry data with JSONB properties
4. Default seed layers for Indonesia

Run migrations manually in PostgreSQL or configure an automated migration tool.

## High-Level Architecture

### Backend Architecture

The backend follows a layered MVC architecture:

- **Entry Point** (`server/src/index.ts`): Initializes Express app, middleware, routes, and database connection
- **Routes** (`server/src/routes/`): Define HTTP endpoints and middleware chains
- **Controllers** (`server/src/controllers/`): Handle business logic and respond to requests
- **Models** (`server/src/models/`): Encapsulate database queries and data transformations
- **Middleware** (`server/src/middleware/`):
  - `auth.middleware.ts` - JWT verification for protected routes
  - `validation.middleware.ts` - Zod schema validation
  - `error.middleware.ts` - Centralized error handling
- **Database** (`server/src/db/`): Connection pooling with pg library, migrations folder
- **Configuration** (`server/src/config/`): Environment-based settings for database, JWT, server

**Key Database Features:**
- Connection pooling (max 20 connections) with pg library
- SQL migrations for schema management
- PostGIS integration for spatial operations

**API Endpoints:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/layers/default` - Get default layers (protected)
- `GET /api/layers/:layerId/features` - Get layer features (protected)
- `POST /api/layers/upload` - Upload new layer (protected)
- `GET /health` - Health check endpoint

### Frontend Architecture

The frontend is a lightweight vanilla TypeScript application:

- **Authentication** (`client/src/main.ts`): Login/register form with toggle between modes
- **Dashboard** (`client/src/dashboard.ts`): Map visualization and layer management
- **API Communication**: Uses fetch API with Bearer token authentication
- **Storage**: Uses localStorage for JWT token and current user info
- **Styling**: CSS with responsive design

## Environment Variables

Both client and server use environment variables for configuration:

**Server (`server/.env`):**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5173)

**Client (`client/.env`):**
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000/api)

## Database Connection & Pool

The server uses `pg.Pool` for connection management:
- **File:** `server/src/db/connection.ts`
- **Features:**
  - Lazy initialization via `initializePool()`
  - Automatic error handling for idle connections
  - Connection timeout of 2 seconds
  - Idle timeout of 30 seconds
  - Max 20 concurrent connections

Database queries use parameterized statements to prevent SQL injection.

## Error Handling

The application uses a centralized error handling strategy:

- **Custom Error Class** (`AppError`): Extends Error with status code and message
- **Error Middleware** (`error.middleware.ts`): Catches all errors and returns consistent JSON responses
- **Async Handler Wrapper** (in routes): Wraps async controllers to catch Promise rejections
- **Validation Errors**: Return 400 status with detailed Zod validation messages

## Input Validation

All user inputs are validated using Zod schemas defined in `server/src/utils/validation.schemas.ts`:

- `registerSchema` - Validates email, password (min 6 chars), and full_name
- `loginSchema` - Validates email and password

Validation middleware in routes enforces these schemas before controller execution.

## Authentication Flow

1. User registers or logs in via POST endpoint
2. Password is hashed with bcrypt (10 salt rounds)
3. JWT token is generated with userId and email
4. Token is stored in client localStorage
5. Protected routes verify token via `auth.middleware.ts`
6. Token contains expiration (7 days) set in `server/src/config/database.config.ts`

## Key Implementation Notes

- **Frontend Build Tool:** Vite (configured in `client/vite.config.ts`)
- **Type Safety:** TypeScript in both frontend and backend with strict mode
- **CORS:** Configured to allow requests from frontend origin
- **Request Limits:** JSON payload size limited to 50MB
- **Models vs Controllers:** Models handle database operations, controllers handle HTTP request/response
- **No Framework:** Frontend uses vanilla TypeScript (no React/Vue) - better for learning core concepts

## Deployment Considerations

For production deployment:
- Set proper `JWT_SECRET` (don't use default value)
- Configure `DATABASE_URL` for production database
- Set `CORS_ORIGIN` to actual frontend domain
- Update `NODE_ENV` to "production"
- Use environment variable files or secrets management (never commit `.env` files)
- Database migrations should be run before starting the server
- Frontend should be built (`npm run build`) and served as static files

## Testing

Tests are currently not implemented. Consider adding:
- **Backend:** Jest or Mocha for unit/integration tests
- **Frontend:** Vitest or Jest for component tests
- **E2E:** Playwright or Cypress for user flow testing
