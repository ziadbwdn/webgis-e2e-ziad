# MapID Web GIS - Backend API

Node.js + Express + PostgreSQL + PostGIS backend for the MapID Web GIS Dashboard.

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- PostgreSQL 12+ with PostGIS extension
- Docker (optional, for containerized setup)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Initialize database:**
   ```bash
   # Connect to PostgreSQL and run migrations
   psql -U webgisuser -d webgisdb -f src/db/migrations/001_create_users.sql
   psql -U webgisuser -d webgisdb -f src/db/migrations/002_create_layers.sql
   psql -U webgisuser -d webgisdb -f src/db/migrations/003_create_layer_features.sql
   psql -U webgisuser -d webgisdb -f src/db/migrations/004_seed_default_layers.sql
   ```

### Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000` by default.

### Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

### Production

Run the compiled server:
```bash
npm run start
```

## Project Structure

```
server/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/                  # Configuration files
│   ├── db/                      # Database connection and migrations
│   ├── middleware/              # Express middleware
│   ├── routes/                  # API route definitions
│   ├── controllers/             # Business logic
│   ├── models/                  # Data access layer
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Utility functions
├── package.json
├── tsconfig.json
└── PLAN.md / TASK.md            # Development planning documents
```

## API Endpoints

### Authentication

- **POST** `/api/auth/register` - Register a new user
- **POST** `/api/auth/login` - Login and get JWT token

### Layers (Protected)

- **GET** `/api/layers/default` - Get all default layers
- **GET** `/api/layers/:layerId/features` - Get layer features as GeoJSON
- **POST** `/api/layers/upload` - Upload a new layer with GeoJSON

### Health

- **GET** `/health` - Health check endpoint

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://webgisuser:webgispassword@localhost:5432/webgisdb

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# Server
PORT=3000
NODE_ENV=development
```

## Database Schema

### Users Table
- `id`: Primary key
- `email`: Unique email for login
- `password_hash`: Bcrypt hashed password
- `full_name`: User's display name
- `created_at`, `updated_at`: Timestamps

### Layers Table
- `id`: Primary key
- `name`: Layer name
- `description`: Layer description
- `type`: Geometry type (point, linestring, polygon, raster)
- `is_default`: Whether layer is available to all users
- `created_by`: Reference to creating user

### Layer Features Table
- `id`: Primary key
- `layer_id`: Reference to layer
- `geom`: PostGIS geometry (WGS84)
- `properties`: JSONB attributes

## Technology Stack

- **Express.js** - Web framework
- **PostgreSQL** - Database
- **PostGIS** - Spatial database extension
- **TypeScript** - Type-safe development
- **Zod** - Input validation
- **JWT** - Authentication
- **Bcrypt** - Password hashing

## Development

### Available Scripts

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Build TypeScript
- `npm run start` - Run production build
- `npm test` - Run tests (not yet implemented)

### Code Style

- TypeScript with strict mode enabled
- ESLint recommended
- Prettier for formatting

## Testing

TODO: Set up Jest or Mocha for unit and integration tests

## Docker

### Build Docker Image

```bash
docker build -t mapid-webgis-server .
```

### Run with docker-compose

From the project root:
```bash
docker-compose up
```

This will start both PostgreSQL and the Node.js backend.

## Security

- Passwords are hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 7 days
- Input validation with Zod schemas
- Parameterized SQL queries (prevents SQL injection)
- CORS is configured for frontend origin

## Performance

- Database connection pooling (max 20 connections)
- Indexed queries for common lookups
- Spatial indexes (GIST) for geometric queries
- JSONB index for fast property lookups

## Deployment

### Render

1. Connect repository to Render
2. Set environment variables in Render dashboard
3. Deploy automatically on push

### Railway

1. Connect repository to Railway
2. Add PostgreSQL + PostGIS plugin
3. Set DATABASE_URL environment variable
4. Deploy

### AWS / DigitalOcean / Other

See deployment documentation for detailed steps.

## Support & Documentation

- **PLAN.md** - Architecture and design decisions
- **TASK.md** - Development tasks and checklist
- **API.md** - Detailed API documentation (TODO)

## License

ISC
