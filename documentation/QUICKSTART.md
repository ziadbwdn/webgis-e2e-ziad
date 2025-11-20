# MapID WebGIS - Quickstart Guide

A web-based Geographic Information System (GIS) application for Surabaya city analysis and visualization.

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Running the Application](#running-the-application)
5. [First Time Setup](#first-time-setup)
6. [Using the Application](#using-the-application)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Prerequisites
- **Node.js**: v18 or higher
- **PostgreSQL**: v14 or higher with PostGIS extension
- **Redis**: v6 or higher (for analysis queue)
- **npm**: v9 or higher

### Operating System
- Linux, macOS, or Windows with WSL2

---

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mapid-webgis
```

### 2. Install Dependencies

#### Server Dependencies
```bash
cd server
npm install
```

#### Client Dependencies
```bash
cd ../client
npm install
```

---

## Database Setup

### 1. Create PostgreSQL Database
```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database and enable PostGIS
CREATE DATABASE mapid_webgis;
\c mapid_webgis
CREATE EXTENSION postgis;
\q
```

### 2. Configure Database Connection

Create a `.env` file in the `server` directory:

```bash
cd server
nano .env
```

Add the following configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/mapid_webgis

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

**Important**: Replace `YOUR_PASSWORD` with your PostgreSQL password and generate a secure JWT secret.

### 3. Run Database Migrations

```bash
cd server
npm run migrate
```

This will create all necessary tables and schema.

### 4. Import Default Layers (Optional)

```bash
npm run import-layers
```

This imports default layers including:
- Population Density
- Economic Status (Socioeconomic Status)
- Old Public Routes
- Recent Routes

---

## Running the Application

### Start Redis Server

```bash
# Ubuntu/Debian
sudo systemctl start redis

# macOS
brew services start redis

# Or manually
redis-server
```

### Start the Backend Server

```bash
cd server
npm run dev
```

The server will start at: **http://localhost:3000**

You should see:
```
Database connection successful
Server running on http://localhost:3000
Environment: development
```

### Start the Frontend Client

Open a **new terminal window**:

```bash
cd client
npm run dev
```

The client will start at: **http://localhost:5173**

You should see:
```
VITE v5.4.21  ready in XXXms
➜  Local:   http://localhost:5173/
```

---

## First Time Setup

### 1. Create User Account

1. Open your browser and navigate to: **http://localhost:5173**
2. You'll see the login page
3. Click **"Register"** (or go to the registration page)
4. Fill in the registration form:
   - Email
   - Full Name
   - Password (minimum 6 characters)
5. Click **"Register"**
6. You'll be redirected to the login page

### 2. Login

1. Enter your email and password
2. Click **"Login"**
3. You'll be redirected to the dashboard

---

## Using the Application

### Dashboard Overview

The dashboard is divided into several sections:

#### Left Sidebar
- **Layers Panel**: View and toggle available layers
- **Map Tools**: Drawing and measurement tools
- **Analysis**: Perform spatial analysis operations

#### Main Map Area
- Interactive map powered by MapLibre GL
- Pan and zoom controls
- Scale indicator
- Legend (bottom-left)

#### Right Panel (Tabs)
- **Layers**: Manage layer visibility and order
- **Tools**: Access drawing and measurement tools
- **Analysis**: Run analysis operations
- **Routing**: Calculate routes and distances
- **Export**: Export map as image

### Working with Layers

#### View Layers
1. Check the boxes next to layer names in the **Layers** tab
2. Layers will appear on the map with their respective styling
3. Use drag handles (☰) to reorder layers

#### Default Layers Available
- **Population Density**: Choropleth map showing population density
- **Economic Status**: Categorical map of socioeconomic status (5 categories)
- **Old Public Routes**: Historical transportation routes (29 routes)
- **Recent Routes**: Current transportation routes (15 routes)

#### Upload Custom Layers
1. Go to the **Layers** tab
2. Click **"Upload Layer"**
3. Provide a name and description
4. Upload a GeoJSON file
5. Click **"Save Layer"**

### Map Export

1. Open the **Export** panel (📥 icon)
2. Enter a **Map Title** (required)
3. Choose **Format**: PNG, JPEG, or PDF
4. Select **Resolution**:
   - 72 DPI (Screen)
   - 150 DPI (Standard)
   - 300 DPI (High)
   - 600 DPI (Very High)
5. Select what to include:
   - ✓ Legend (with categorical items in 3-column layout)
   - ✓ Scale bar
   - ✓ Attribution
6. Click **"Export Map"**

The exported map includes:
- Header with map title, scale, and metadata
- Main map with grid lines
- Legend showing all categorical items
- Index map (Peta Indeks)
- Map information
- References

### Analysis Tools

#### Buffer Analysis
1. Go to **Analysis** tab
2. Select **"Buffer"** analysis type
3. Choose a layer
4. Enter buffer distance (meters)
5. Click **"Run Analysis"**
6. Results appear as a new layer

#### Intersection Analysis
1. Select **"Intersection"** analysis type
2. Choose two layers to intersect
3. Click **"Run Analysis"**
4. Intersection result appears as a new layer

#### Union Analysis
1. Select **"Union"** analysis type
2. Choose two layers to union
3. Click **"Run Analysis"**

### Routing

1. Open the **Routing** panel
2. Click on the map to set:
   - Start point (green marker)
   - End point (red marker)
3. Route will be calculated automatically
4. View distance and estimated time

### Map Tools

#### Draw Polygon
1. Click **"Draw Polygon"** tool
2. Click on map to add vertices
3. Double-click to complete polygon
4. Save as a new layer

#### Measure Distance
1. Click **"Measure Distance"**
2. Click points on the map
3. Distance is shown in real-time
4. Double-click to finish

#### Measure Area
1. Click **"Measure Area"**
2. Draw a polygon
3. Area is calculated and displayed

#### Radius Tool
1. Click **"Radius"**
2. Click a point on the map
3. Enter radius in meters
4. Circle is drawn

---

## Troubleshooting

### Server Won't Start

**Problem**: `Database connection failed`
- **Solution**: Check PostgreSQL is running and credentials in `.env` are correct
```bash
sudo systemctl status postgresql
```

**Problem**: `Port 3000 already in use`
- **Solution**: Kill process using port 3000 or change PORT in `.env`
```bash
lsof -ti:3000 | xargs kill -9
```

### Client Won't Start

**Problem**: `Port 5173 already in use`
- **Solution**: Kill process or Vite will automatically use next available port

**Problem**: `Cannot connect to API`
- **Solution**: Ensure server is running at http://localhost:3000
- Check CORS configuration in server `.env`

### Redis Connection Issues

**Problem**: `Redis connection refused`
- **Solution**: Start Redis server
```bash
sudo systemctl start redis
# or
redis-server
```

### Analysis Not Working

**Problem**: Analysis jobs stuck in queue
- **Solution**: Check Redis is running and worker is started
- The worker starts automatically with `npm run dev`

### Export Fails

**Problem**: "Please enter a map title"
- **Solution**: Enter a title in the export panel before clicking Export

**Problem**: Export produces blank image
- **Solution**: Wait for all map tiles to load before exporting
- Zoom to ensure tiles are loaded

### Database Migrations Failed

**Problem**: Migration errors
- **Solution**: Drop and recreate database
```bash
sudo -u postgres psql
DROP DATABASE mapid_webgis;
CREATE DATABASE mapid_webgis;
\c mapid_webgis
CREATE EXTENSION postgis;
\q
cd server
npm run migrate
```

---

## Default Credentials

After registration, you create your own credentials. There are no default admin accounts.

---

## Important URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **API Health Check**: http://localhost:3000/health

---

## Features Summary

### Visualization
✓ Interactive map with multiple basemaps
✓ Layer management with drag-and-drop ordering
✓ Categorical styling for layers
✓ Custom color schemes
✓ Real-time legend generation

### Analysis
✓ Buffer analysis
✓ Intersection analysis
✓ Union analysis
✓ Queue-based processing
✓ Result layer creation

### Export
✓ High-resolution map export (up to 600 DPI)
✓ Multiple formats (PNG, JPEG, PDF)
✓ Professional layout with header and legend
✓ 3-column categorical legend layout
✓ Grid lines and scale bars

### Data Management
✓ Upload custom GeoJSON layers
✓ Edit and delete layers
✓ Layer metadata management
✓ Feature property viewing

### Tools
✓ Drawing tools (polygon, line, point)
✓ Measurement tools (distance, area)
✓ Radius/buffer tool
✓ Routing with distance calculation

---

## Development

### Build for Production

#### Server
```bash
cd server
npm run build
npm start
```

#### Client
```bash
cd client
npm run build
# Serve the dist folder with a web server
```

### Run Tests
```bash
# Server tests
cd server
npm test

# Client tests
cd client
npm test
```

---

## Technology Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** framework
- **PostgreSQL** with PostGIS
- **Redis** for job queue (BullMQ)
- **Turf.js** for spatial operations

### Frontend
- **TypeScript**
- **Vite** build tool
- **MapLibre GL JS** for map rendering
- **Vanilla JS** (no framework)

---

## Support

For issues and questions:
1. Check this quickstart guide
2. Check the troubleshooting section
3. Review server/client logs for errors
4. Check browser console for frontend errors

---

## License

[Add your license information here]

---

## Version

**Current Version**: 1.0.0
**Last Updated**: November 2025

---

## Quick Command Reference

```bash
# Start everything (3 separate terminals)
Terminal 1: redis-server
Terminal 2: cd server && npm run dev
Terminal 3: cd client && npm run dev

# Stop everything
Ctrl+C in each terminal

# Database operations
cd server
npm run migrate          # Run migrations
npm run migrate:rollback # Rollback last migration
npm run import-layers    # Import default layers

# Development
npm run dev              # Start with hot reload
npm run build            # Build for production
npm run lint             # Run linter

# View logs
# Server logs: Terminal output
# Client logs: Browser console (F12)
```

---

**You're now ready to use MapID WebGIS! 🗺️**
