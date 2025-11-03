# Frontend/Client Development Plan

**Project:** MapID Web GIS - Web Application
**Technology Stack:** HTML/CSS/TypeScript + MapLibre GL + Turf.js + Vite
**Last Updated:** 2025-11-02

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Choices](#technology-choices)
3. [Directory Structure](#directory-structure)
4. [UI/UX Design](#uiux-design)
5. [State Management](#state-management)
6. [Map Implementation](#map-implementation)
7. [Implementation Phases](#implementation-phases)
8. [Testing Strategy](#testing-strategy)
9. [Build & Deployment](#build--deployment)

---

## Architecture Overview

### Application Architecture

```
┌────────────────────────────────────────┐
│         Web Application UI             │
│  ┌──────────────────────────────────┐  │
│  │   Authentication Module          │  │
│  │   - Login Form                   │  │
│  │   - Registration Form            │  │
│  └──────────────┬───────────────────┘  │
│  ┌──────────────▼───────────────────┐  │
│  │   Main Dashboard                 │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │  Map Container             │  │  │
│  │  │  (MapLibre GL JS)          │  │  │
│  │  └────────────────────────────┘  │  │
│  │  ┌────────────────────────────┐  │  │
│  │  │  Layer Control Sidebar     │  │  │
│  │  │  - Default Layers          │  │  │
│  │  │  - Upload Layer Button     │  │  │
│  │  └────────────────────────────┘  │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │   Service Layer                  │  │
│  │   - AuthService                  │  │
│  │   - ApiService                   │  │
│  │   - MapService                   │  │
│  └──────────────┬───────────────────┘  │
└─────────────────┼────────────────────────┘
                  │
         ┌────────▼────────┐
         │  Backend API    │
         └─────────────────┘
```

### Design Principles

1. **Progressive Enhancement:** Core functionality works without JavaScript
2. **Vanilla TypeScript:** No framework overhead, maximum control
3. **Modular Code:** Clear separation of concerns
4. **Responsive Design:** Mobile-first approach
5. **Accessibility:** WCAG 2.1 AA compliance
6. **Performance:** Fast initial load, lazy loading for heavy resources

---

## Technology Choices

### Core Technologies

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| **TypeScript** | ^5.0.0 | Type-safe JavaScript | Catch errors at compile time |
| **MapLibre GL JS** | ^4.0.0 | Interactive maps | Open-source, WebGL-based, performant |
| **Turf.js** | ^7.0.0 | Geospatial analysis | Client-side geoprocessing |
| **Vite** | ^5.0.0 | Build tool | Fast HMR, optimized builds |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Vitest** | Unit testing (future) |
| **Playwright** | E2E testing (future) |

### Why This Stack?

- **No Framework:** Faster load times, smaller bundle size
- **MapLibre over Mapbox:** Open-source, no vendor lock-in
- **Vite over Webpack:** 10-100x faster dev server
- **Turf.js:** Industry standard for geospatial operations
- **TypeScript:** Better developer experience, fewer runtime errors

---

## Directory Structure

```
client/
├── public/
│   ├── favicon.ico
│   └── assets/
│       └── logo.svg
│
├── src/
│   ├── index.html               # Main HTML entry point
│   ├── main.ts                  # Application entry point
│   ├── styles/
│   │   ├── main.css            # Global styles
│   │   ├── auth.css            # Authentication page styles
│   │   ├── dashboard.css       # Dashboard styles
│   │   ├── map.css             # Map-specific styles
│   │   └── components/         # Component-specific styles
│   │       ├── sidebar.css
│   │       ├── modal.css
│   │       └── notifications.css
│   │
│   ├── auth/
│   │   ├── login.ts            # Login functionality
│   │   ├── register.ts         # Registration functionality
│   │   └── logout.ts           # Logout functionality
│   │
│   ├── map/
│   │   ├── map-init.ts         # MapLibre initialization
│   │   ├── layer-manager.ts    # Layer add/remove/toggle
│   │   ├── map-controls.ts     # Zoom, pan, fullscreen
│   │   └── map-events.ts       # Click, hover handlers
│   │
│   ├── components/
│   │   ├── sidebar.ts          # Layer list sidebar
│   │   ├── modal.ts            # Generic modal component
│   │   ├── notifications.ts    # Toast notifications
│   │   ├── file-uploader.ts    # File upload component
│   │   └── loading-spinner.ts  # Loading indicator
│   │
│   ├── services/
│   │   ├── api.service.ts      # HTTP client
│   │   ├── auth.service.ts     # Authentication logic
│   │   ├── map.service.ts      # Map state management
│   │   └── storage.service.ts  # LocalStorage wrapper
│   │
│   ├── utils/
│   │   ├── dom.utils.ts        # DOM helpers
│   │   ├── validation.utils.ts # Form validation
│   │   ├── geojson.utils.ts    # GeoJSON helpers
│   │   └── constants.ts        # App constants
│   │
│   └── types/
│       ├── index.ts            # Global type definitions
│       ├── api.types.ts        # API response types
│       ├── map.types.ts        # Map-related types
│       └── geojson.types.ts    # GeoJSON types
│
├── tests/                      # Test files (future)
│   ├── unit/
│   └── e2e/
│
├── .env.example                # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── PLAN.md                     # This file
```

---

## UI/UX Design

### Color Scheme

```css
:root {
  /* Primary Colors */
  --primary-blue: #2563eb;
  --primary-blue-dark: #1d4ed8;
  --primary-blue-light: #60a5fa;

  /* Neutral Colors */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-700: #374151;
  --gray-900: #111827;

  /* Semantic Colors */
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
  --info: #3b82f6;

  /* Map Colors */
  --map-bg: #f0f0f0;
  --layer-stroke: #333333;
  --layer-fill: rgba(37, 99, 235, 0.3);
}
```

### Typography

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
               'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'Courier New', monospace;

  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
}
```

### Layout Structure

#### Authentication Page

```
┌─────────────────────────────────────────┐
│           Header (Logo)                 │
├─────────────────────────────────────────┤
│                                         │
│        ┌─────────────────────┐          │
│        │                     │          │
│        │   Login Form        │          │
│        │   - Email           │          │
│        │   - Password        │          │
│        │   - Submit Button   │          │
│        │   - Register Link   │          │
│        │                     │          │
│        └─────────────────────┘          │
│                                         │
└─────────────────────────────────────────┘
```

#### Main Dashboard

```
┌─────────────────────────────────────────┐
│  Header: Logo | User Name | Logout      │
├────────┬────────────────────────────────┤
│        │                                │
│ Layers │       Map Container            │
│ Panel  │       (MapLibre GL)            │
│        │                                │
│ [ ]L1  │                                │
│ [✓]L2  │                                │
│ [ ]L3  │                                │
│        │                                │
│ Upload │                                │
│ Button │                                │
│        │                                │
└────────┴────────────────────────────────┘
```

### Responsive Breakpoints

```css
/* Mobile: < 640px */
/* Tablet: 640px - 1024px */
/* Desktop: > 1024px */

@media (max-width: 640px) {
  /* Stack sidebar on top or collapse */
}

@media (min-width: 641px) and (max-width: 1024px) {
  /* Narrow sidebar */
}

@media (min-width: 1025px) {
  /* Full sidebar */
}
```

---

## State Management

### Application State

**No external state management library needed.** Use simple TypeScript classes and browser APIs.

#### Auth State

```typescript
class AuthState {
  private token: string | null = null;
  private user: User | null = null;

  setAuth(token: string, user: User): void
  clearAuth(): void
  isAuthenticated(): boolean
  getToken(): string | null
  getUser(): User | null
}
```

#### Map State

```typescript
class MapState {
  private map: maplibregl.Map | null = null;
  private activeLayers: Map<number, Layer> = new Map();

  setMap(map: maplibregl.Map): void
  addLayer(layer: Layer): void
  removeLayer(layerId: number): void
  toggleLayer(layerId: number): void
  getActiveLayers(): Layer[]
}
```

### State Persistence

**LocalStorage for:**
- JWT token
- User preferences (map center, zoom level)
- Last viewed layers

**SessionStorage for:**
- Temporary UI state
- Upload progress

---

## Map Implementation

### MapLibre GL JS Setup

```typescript
// map-init.ts
import maplibregl from 'maplibre-gl';

export function initializeMap(containerId: string): maplibregl.Map {
  const map = new maplibregl.Map({
    container: containerId,
    style: {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    center: [106.8456, -6.2088], // Jakarta, Indonesia
    zoom: 10
  });

  return map;
}
```

### Layer Management

```typescript
// layer-manager.ts
export class LayerManager {
  constructor(private map: maplibregl.Map) {}

  addGeoJSONLayer(id: string, data: GeoJSON.FeatureCollection, color: string): void {
    this.map.addSource(id, {
      type: 'geojson',
      data: data
    });

    // Add appropriate layer based on geometry type
    const geometryType = data.features[0]?.geometry.type;

    if (geometryType === 'Point') {
      this.map.addLayer({
        id: id,
        type: 'circle',
        source: id,
        paint: {
          'circle-radius': 6,
          'circle-color': color
        }
      });
    } else if (geometryType === 'LineString') {
      this.map.addLayer({
        id: id,
        type: 'line',
        source: id,
        paint: {
          'line-color': color,
          'line-width': 3
        }
      });
    } else if (geometryType === 'Polygon') {
      this.map.addLayer({
        id: id,
        type: 'fill',
        source: id,
        paint: {
          'fill-color': color,
          'fill-opacity': 0.5
        }
      });
    }
  }

  toggleLayerVisibility(layerId: string): void {
    const visibility = this.map.getLayoutProperty(layerId, 'visibility');
    this.map.setLayoutProperty(
      layerId,
      'visibility',
      visibility === 'visible' ? 'none' : 'visible'
    );
  }

  removeLayer(layerId: string): void {
    if (this.map.getLayer(layerId)) {
      this.map.removeLayer(layerId);
    }
    if (this.map.getSource(layerId)) {
      this.map.removeSource(layerId);
    }
  }
}
```

### Geospatial Analysis with Turf.js

```typescript
// Example: Calculate area of polygon
import * as turf from '@turf/turf';

function calculateArea(feature: GeoJSON.Feature<GeoJSON.Polygon>): number {
  const area = turf.area(feature);
  return area; // in square meters
}

// Example: Find features within bounds
function featuresWithinBounds(
  features: GeoJSON.FeatureCollection,
  bounds: GeoJSON.Feature<GeoJSON.Polygon>
): GeoJSON.FeatureCollection {
  return turf.featureCollection(
    features.features.filter(feature =>
      turf.booleanWithin(feature, bounds)
    )
  );
}
```

---

## Implementation Phases

### Phase 1: Project Setup (Day 1)

- [ ] Initialize Vite project
- [ ] Configure TypeScript
- [ ] Set up directory structure
- [ ] Install dependencies
- [ ] Create base HTML structure
- [ ] Add global CSS

### Phase 2: Authentication UI (Day 1-2)

- [ ] Create login form
- [ ] Create registration form
- [ ] Add form validation
- [ ] Implement AuthService
- [ ] Connect to backend API
- [ ] Add error notifications

### Phase 3: Map Implementation (Day 2-3)

- [ ] Initialize MapLibre map
- [ ] Add OSM basemap
- [ ] Create LayerManager
- [ ] Test basic map functionality
- [ ] Add map controls (zoom, pan)

### Phase 4: Layer Management (Day 3-4)

- [ ] Create sidebar component
- [ ] Fetch default layers from API
- [ ] Display layers in sidebar
- [ ] Implement layer toggle
- [ ] Add layer features to map
- [ ] Style different geometry types

### Phase 5: Layer Upload (Day 4-5)

- [ ] Create file upload component
- [ ] Add GeoJSON file validation
- [ ] Implement upload functionality
- [ ] Display uploaded layer on map
- [ ] Add upload progress indicator

### Phase 6: Polish & Testing (Day 5-6)

- [ ] Responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Cross-browser testing
- [ ] Performance optimization

---

## Testing Strategy

### Unit Testing (Vitest)

**Test Coverage:**
- Utils functions (validation, GeoJSON parsing)
- Service classes (AuthService, ApiService)
- State management classes

**Example Test:**
```typescript
import { describe, it, expect } from 'vitest';
import { validateEmail } from '../utils/validation.utils';

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

### E2E Testing (Playwright)

**Critical User Flows:**
1. User registration
2. User login
3. View default layers
4. Toggle layer visibility
5. Upload custom layer
6. Logout

**Example Test:**
```typescript
import { test, expect } from '@playwright/test';

test('user can login and view map', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page.locator('#map')).toBeVisible();
});
```

### Manual Testing Checklist

- [ ] All forms validate correctly
- [ ] Authentication flow works
- [ ] Map loads and is interactive
- [ ] Layers can be toggled
- [ ] File upload works
- [ ] Error messages display properly
- [ ] Mobile responsive
- [ ] Works in Chrome, Firefox, Safari

---

## Build & Deployment

### Development

```bash
npm run dev        # Start dev server (localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run format     # Run Prettier
```

### Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'maplibre': ['maplibre-gl'],
          'turf': ['@turf/turf']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

### Environment Variables

```bash
# .env
VITE_API_URL=http://localhost:3000/api
VITE_MAP_CENTER_LNG=106.8456
VITE_MAP_CENTER_LAT=-6.2088
VITE_MAP_ZOOM=10
```

### Deployment Strategy

**Static Hosting Options:**
- Vercel (recommended)
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

**Production Checklist:**
- [ ] Set API URL to production backend
- [ ] Enable HTTPS
- [ ] Minify and bundle assets
- [ ] Add service worker for offline support (future)
- [ ] Configure CSP headers
- [ ] Set up error tracking (Sentry)
- [ ] Add analytics (optional)

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load map only when user is authenticated
const loadMap = async () => {
  const { initializeMap } = await import('./map/map-init');
  return initializeMap('map');
};
```

### Asset Optimization

- Use WebP images with fallbacks
- Lazy load images
- Minify CSS and JS
- Use CDN for MapLibre and Turf

### Map Performance

- Limit number of features rendered
- Use clustering for large datasets
- Implement viewport-based feature loading
- Optimize GeoJSON simplification with Turf

---

## Accessibility

### WCAG 2.1 AA Compliance

- [ ] All interactive elements keyboard accessible
- [ ] Proper ARIA labels
- [ ] Color contrast ratio > 4.5:1
- [ ] Focus indicators visible
- [ ] Alt text for images
- [ ] Form labels associated with inputs
- [ ] Screen reader friendly error messages

---

## Next Steps

1. Set up Vite project structure
2. Create authentication pages
3. Integrate MapLibre GL JS
4. Connect to backend API
5. Implement layer management
6. Add file upload
7. Test and deploy

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-02 | Use Vite instead of Webpack | Faster dev server, simpler config |
| 2025-11-02 | Vanilla TypeScript (no framework) | Smaller bundle, full control |
| 2025-11-02 | MapLibre GL JS over Leaflet | Better WebGL performance, modern API |
