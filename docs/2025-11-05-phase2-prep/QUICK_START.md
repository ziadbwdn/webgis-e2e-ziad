# Quick Start Guide - MapID WebGIS

## Prerequisites
- Node.js 18+
- PostgreSQL 12+
- PostGIS extension enabled
- Git

## Setup Instructions

### 1. Environment Configuration
```bash
# Copy environment template (or create .env)
cp server/.env.example server/.env

# Edit server/.env with your database credentials
DATABASE_URL=postgresql://user:password@localhost:5432/mapid_webgis
JWT_SECRET=your-secret-key-here
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### 2. Database Setup
```bash
# Create database
createdb mapid_webgis

# Enable PostGIS
psql mapid_webgis -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run migrations (run each SQL file in order)
psql mapid_webgis < server/src/db/migrations/001_create_users.sql
psql mapid_webgis < server/src/db/migrations/002_create_layers.sql
psql mapid_webgis < server/src/db/migrations/003_create_layer_features.sql
psql mapid_webgis < server/src/db/migrations/004_seed_default_layers.sql
```

### 3. Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Server running on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# App running on http://localhost:5173
```

## Basic Workflow

### 1. Register/Login
- Go to http://localhost:5173
- Click "Sign up" to create new account
- Or login with existing credentials

### 2. Upload Layer
- Click "Upload Layer" button
- Select a GeoJSON file
- Enter layer name and description
- Layer appears in "MY LAYERS" section

### 3. View Layer
- Check the layer checkbox
- Layer renders on map with assigned color
- Toggle checkbox to show/hide
- Legend updates to show active layers

### 4. Supported File Format
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

## Build for Production

### Backend
```bash
cd server
npm run build
npm start
```

### Frontend
```bash
cd client
npm run build
# Output in client/dist/
```

## Common Commands

### Backend
```bash
npm run dev      # Start development server
npm run build    # Compile TypeScript
npm start        # Run compiled server
npm test         # Run tests (not yet implemented)
```

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run linter
npm run format   # Format code with Prettier
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Layers
- `GET /api/layers/default` - Get default layers
- `GET /api/layers/all/list` - Get all layers (default + user's)
- `GET /api/layers/user/list` - Get user's layers only
- `GET /api/layers/:layerId/features` - Get layer features as GeoJSON
- `POST /api/layers/upload` - Upload new layer

## Troubleshooting

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
- Check PostgreSQL is running: `psql -U postgres`
- Verify DATABASE_URL in .env
- Check database exists: `psql -l`

### CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
- Check CORS_ORIGIN in server/.env matches frontend URL
- Default is http://localhost:5173

### Port Already in Use
```
Error: listen EADDRINUSE :::3000
```
- Change PORT in server/.env
- Or kill existing process: `lsof -ti:3000 | xargs kill -9`

### GeoJSON Upload Failed
```
Error: Invalid GeoJSON structure
```
- Ensure file has `"type": "FeatureCollection"`
- Ensure features array exists and has at least one feature
- Verify coordinates are valid [longitude, latitude]

## Documentation

- `CLAUDE.md` - Full architecture guide
- `REVIEW_SUMMARY.md` - Code review findings
- `PLAN-NEW.md` - Long-term roadmap
- `STATUS_REPORT.md` - Current status

## Support

If you encounter issues:
1. Check the relevant documentation file
2. Review server logs in terminal
3. Check browser console (F12) for frontend errors
4. Check database is properly set up: `psql mapid_webgis -c "\d"`

## What's Next?

See `STATUS_REPORT.md` → "Next Steps" for recommended improvements and Phase 2 features.
