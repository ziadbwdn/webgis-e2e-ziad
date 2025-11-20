# MAPID WebGIS - Client Application

Frontend web application for the MAPID WebGIS platform, providing interactive mapping, spatial analysis, and geospatial data visualization.

## Tech Stack

- **Build Tool**: Vite 5
- **Language**: TypeScript
- **Mapping**: MapLibre GL JS 4.0
- **Geospatial**: Turf.js 7.0
- **Export**: html2canvas 1.4

## Features

- 🗺️ **Interactive Map**: Pan, zoom, and navigate with MapLibre GL
- 📊 **Default Layers**:
  - Population Density (calculated from SES data)
  - Economic Status (color-coded by socioeconomic level)
  - Old Public Routes (historical transit routes)
  - Recent Routes (current transit routes)
- 📏 **Map Tools**: Distance measurement, drawing (points, lines, polygons), radius buffer
- 🔍 **Spatial Analysis**: Buffer, intersection, union operations
- 🚗 **Routing**: Find routes between points using pgRouting
- 📍 **Geolocation**: Click to get coordinate information
- 🖼️ **Map Export**: Export map as PNG with legend and attribution
- 🎯 **Grid Overlay**: Dynamic coordinate grid with customizable colors
- 🔐 **Authentication**: JWT-based secure login system

## Prerequisites

- Node.js 20+
- npm or yarn

## Installation

```bash
# Install dependencies
npm install
```

## Environment Variables

Create a `.env` file in the client directory:

```env
# API URL (for production, use your Railway backend URL)
VITE_API_URL=http://localhost:3000/api
```

## Development

```bash
# Start dev server with hot reload
npm run dev

# Server will run on http://localhost:5173
```

## Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Docker (Local Development Only)

**Note:** Vercel deployment does NOT use Docker - it has its own build system.

```bash
# Build and run with Docker (for local testing)
docker-compose up -d

# Access at http://localhost
```

## Vercel Deployment

Vercel automatically builds and deploys the application.

### Deployment Configuration

**Build Settings in Vercel Dashboard:**
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

**Environment Variables in Vercel:**
- `VITE_API_URL`: Your Railway backend URL (e.g., https://your-app.up.railway.app/api)

### Deploy Steps

1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy automatically on push to main branch

## Project Structure

```
client/
├── src/
│   ├── dashboard.ts           # Main dashboard application
│   ├── home.ts               # Landing page
│   └── components/           # Reusable UI components
│       ├── analysis-panel.ts
│       ├── routing-panel.ts
│       └── export-panel.ts
├── public/                   # Static assets
├── data/                     # GeoJSON data files
│   ├── STATUS EKONOMI...geojson  # SES data for Surabaya
│   ├── jalur_lyn_lama.geojson   # Old public routes
│   └── all-routes_v2.geojson    # Recent routes
├── dashboard.html           # Dashboard page
├── home.html               # Landing page
├── index.html              # Login page
├── Dockerfile              # For local Docker testing
├── nginx.conf              # Nginx configuration
├── vite.config.ts          # Vite configuration
└── package.json
```

## Features Overview

### Default Layers

Four built-in layers loaded from local GeoJSON files:

1. **Population Density**
   - Calculated using: `JUMLAH PENDUDUK` / polygon area (km²)
   - Color gradient: light pink → dark red
   - Uses Turf.js for area calculation

2. **Economic Status**
   - Based on `SOCIOECONOMIC STATUS` attribute
   - Colors: Green (Atas/High), Orange (Menengah/Medium), Red (Bawah/Low)

3. **Old Public Routes**
   - Historical transit routes in Surabaya
   - Purple lines, 3px width

4. **Recent Routes**
   - Current transit routes
   - Multi-colored based on route data
   - Uses `link` attribute for route identification

### Map Tools

- **Distance Measurement**: Click points to measure distances
- **Drawing Tools**: Create points, lines, and polygons
- **Radius Buffer**: Create circular buffers around points
- **Edit Mode**: Delete drawn features

### Spatial Analysis

- **Buffer Analysis**: Create buffers around features
- **Intersection**: Find overlapping areas between layers
- **Union**: Combine multiple layers
- Results displayed as new layers on the map

### Map Export

- Export current map view as PNG
- Includes legend with active layers
- Preserves attribution
- Customizable title and scale

### Grid Overlay

- Dynamic coordinate grid
- Auto-adjusting spacing based on zoom level
- Customizable colors (White, Black, Red, Green, Blue, Yellow)
- Adjustable opacity (10-100%)
- Preferences saved to localStorage

## API Integration

The client communicates with the backend server via REST API:

- `/api/auth/*` - Authentication endpoints
- `/api/layers/*` - Layer management
- `/api/analysis/*` - Spatial analysis
- `/api/routing/*` - Route finding

All protected endpoints require JWT authentication token in headers.

## Map Configuration

- **Base Map**: OpenStreetMap tiles
- **Center**: Surabaya, Indonesia (112.7388, -7.2575)
- **Initial Zoom**: 12
- **Controls**: Navigation, scale, geolocate

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers supported

## Performance

- Vite for fast development and optimized production builds
- Code splitting for better loading performance
- Lazy loading of MapLibre GL styles
- Efficient GeoJSON rendering with MapLibre

## Security

- JWT-based authentication
- CORS configured for API requests
- XSS protection headers in Nginx
- Secure cookie handling

## Troubleshooting

### Dev server not starting
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build errors
```bash
# Check TypeScript compilation
npm run build
```

### API connection issues
- Verify `VITE_API_URL` is set correctly
- Check CORS configuration on server
- Ensure backend is running

## License

ISC
