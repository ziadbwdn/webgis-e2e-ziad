
## **Web GIS Development Roadmap (Updated)**

### **What's New in this Version:**

*   **Phase 1 Enhancements:** Added critical production-ready practices like input validation, centralized error handling, and a `docker-compose.yml` for easy setup.
*   **Future Phases Section:** Outlined a clear path forward with four key categories: Advanced UI, Performance, Data Management, and DevOps/Testing.

---

## **SIMPLIFIED TECH STACK** 🎯

### **Frontend:**

*   **HTML/CSS/TypeScript** (VanillaJS as per now)
*   **MapLibre GL JS** (mapping)
*   **Turf.js** (geoprocessing)
*   **Vite** (build tool)

### **Backend:**

*   **Node.js + Express** (simple REST API)
*   **PostgreSQL + PostGIS** (spatial database)
*   **JWT** (authentication)

### **Why This Stack?**

*   ✅ Minimal dependencies
*   ✅ Easy to maintain
*   ✅ Scales to 50K users
*   ✅ Standard industry tools
*   ✅ No framework learning curve

---

## **PHASE 1 ROADMAP: Authentication + Layer Management**

### **Project Foundation**

#### **Phase 1.1: Project Setup**

```bash
# Project structure
webgis-dashboard/
├── frontend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   └── register.ts
│   │   ├── map/
│   │   │   ├── map-init.ts
│   │   │   └── layer-manager.ts
│   │   ├── services/
│   │   │   ├── api.service.ts
│   │   │   └── auth.service.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   ├── index.html
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   └── layers.routes.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── layers.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts # <-- NEW
│   │   │   └── error.middleware.ts      # <-- NEW
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   └── layer.model.ts
│   │   └── db/
│   │       └── connection.ts
│   └── package.json
│
└── docker-compose.yml # <-- NEW
```

#### **Phase 1.1.1: Development Environment (NEW)**

To simplify setup, add a `docker-compose.yml` file to the project root to run PostgreSQL and the backend service.

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_USER: webgisuser
      POSTGRES_PASSWORD: webgispassword
      POSTGRES_DB: webgisdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://webgisuser:webgispassword@db:5432/webgisdb
      JWT_SECRET: your-super-secret-jwt-key
    depends_on:
      - db
    volumes:
      - ./backend:/app
      - /app/node_modules

volumes:
  postgres_data:
```
*You'll also need a `Dockerfile` in the `backend` directory to build the Node.js service.*

#### **Phase 1.2: Database Setup**

*(No changes to the SQL schema. It remains well-designed.)*

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Layers table (metadata only)
CREATE TABLE layers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50), -- 'polyline', 'point', 'polygon'
  is_default BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spatial data stored in PostGIS
CREATE TABLE layer_features (
  id SERIAL PRIMARY KEY,
  layer_id INTEGER REFERENCES layers(id) ON DELETE CASCADE,
  geom GEOMETRY(Geometry, 4326),
  properties JSONB
);

-- Create spatial index
CREATE INDEX idx_layer_features_geom ON layer_features USING GIST(geom);

-- Default Layers (Indonesia):
INSERT INTO layers (name, type, is_default) VALUES
('Indonesia OSM Base', 'raster', TRUE),
('Population Density', 'polygon', TRUE),
('Economic Status', 'polygon', TRUE),
('Old Public Routes', 'polyline', TRUE),
('Recent Public Routes', 'polyline', TRUE);
```

---

### **Phase 1.3: Backend Implementation**

#### **Backend Package.json:**

*(Updated with `zod` for validation)*

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "zod": "^3.22.0" // <-- NEW
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0"
  }
}
```

#### **Phase 1.3.1: Backend Enhancements (Validation & Error Handling) (NEW)**

Before building controllers, add validation and error handling middleware.

**Validation Middleware (`validation.middleware.ts`):**

```typescript
// backend/src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      next(error); // Pass other errors to the error handler
    }
  };
}
```

**Error Handling Middleware (`error.middleware.ts`):**

```typescript
// backend/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
}
```

#### **Simple Auth Controller (Updated with Validation):**

```typescript
// backend/src/controllers/auth.controller.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection';
import { z } from 'zod';

// Define validation schemas with Zod
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  // We will apply validation middleware in the routes
  async register(req, res) {
    const { email, password, full_name } = req.body;
    // ... (rest of the register logic is the same)
    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
      [email, password_hash, full_name]
    );
    res.json({ user: result.rows[0] });
  }

  async login(req, res) {
    const { email, password } = req.body;
    // ... (rest of the login logic is the same)
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  }
}
// Export schemas to be used in routes
export { registerSchema, loginSchema };
```

#### **Express Server (`index.ts`) (Updated):**

```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import { AuthController, registerSchema, loginSchema } from './controllers/auth.controller';
import { LayersController } from './controllers/layers.controller';
import { authMiddleware } from './middleware/auth.middleware';
import { validateBody } from './middleware/validation.middleware';
import { errorHandler } from './middleware/error.middleware'; // <-- NEW

const app = express();
const authController = new AuthController();
const layersController = new LayersController();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth routes with validation
app.post('/api/auth/register', validateBody(registerSchema), (req, res) => authController.register(req, res));
app.post('/api/auth/login', validateBody(loginSchema), (req, res) => authController.login(req, res));

// Layer routes (protected)
app.get('/api/layers/default', authMiddleware, (req, res) => layersController.getDefaultLayers(req, res));
app.get('/api/layers/:layerId/features', authMiddleware, (req, res) => layersController.getLayerFeatures(req, res));
app.post('/api/layers/upload', authMiddleware, (req, res) => layersController.uploadLayer(req, res));

// Error handling middleware (must be last)
app.use(errorHandler); // <-- NEW

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

### **Phase 1.4: Frontend Implementation**

This phase involves creating the UI and connecting it to the backend services.

#### **Frontend Package.json:**

*(No changes)*

```json
{
  "dependencies": {
    "maplibre-gl": "^4.0.0",
    "@turf/turf": "^7.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### **UI & Service Integration:**

1.  **Create Basic UI:** Build the HTML structure in `index.html` for a login/register form and a main dashboard view (hidden until authenticated). The dashboard will contain the map container (`<div id="map"></div>`) and a layer list sidebar.
2.  **Auth Service:** The `auth.service.ts` remains the same. It will handle token storage and user state.
3.  **API Service (Updated with Error Handling):**

```typescript
// frontend/src/services/api.service.ts
import { AuthService } from './auth.service';

const API_URL = 'http://localhost:3000/api';
const authService = new AuthService();

export class ApiService {
  private getHeaders(): HeadersInit {
    const token = authService.getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Generic request wrapper for error handling
  private async request(url: string, options?: RequestInit) {
    try {
      const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: { ...this.getHeaders(), ...options?.headers },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Service Error:', error);
      // Here you would dispatch a global notification or error state
      throw error; // Re-throw to be handled by the calling component
    }
  }

  async getDefaultLayers() {
    return this.request('/layers/default');
  }

  async getLayerFeatures(layerId: number) {
    return this.request(`/layers/${layerId}/features`);
  }

  async uploadLayer(name: string, description: string, geojson: any) {
    return this.request('/layers/upload', {
      method: 'POST',
      body: JSON.stringify({ name, description, geojson }),
    });
  }
}
```

---

## **PHASE 2 ROADMAP & BEYOND** 🚀

Once Phase 1 is complete and stable, you can expand the application's capabilities.

### **Category 1: Advanced Map Interaction & UI**

*   **Drawing & Editing Tools:** Allow users to create, modify, and delete geometries directly on the map.
    *   **Recommended Tech:** `@mapbox/mapbox-gl-draw` (adaptable for MapLibre) or a custom implementation.
*   **Dynamic Styling:** Enable users to change layer appearance (color, opacity, line width) based on feature properties or user input.
*   **Pop-ups & Info Panels:** Display feature attributes when a user clicks on them, using MapLibre's pop-ups or a custom side panel.

### **Category 2: Performance & Scalability**

*   **Implement Vector Tiles:** Move from serving large GeoJSON files to serving vector tiles for handling large datasets efficiently.
    *   **Recommended Tech:** `pg_tileserv` for dynamic tiles or `tippecanoe` for pre-generated tiles.
*   **Add a Caching Layer:** Cache frequently accessed data (e.g., user session info, default layer metadata) to reduce database load.
    *   **Recommended Tech:** Redis.
*   **Use Background Job Processing:** Offload heavy tasks (like processing a large uploaded file) to background workers to prevent API timeouts.
    *   **Recommended Tech:** BullMQ with Redis.

### **Category 3: Advanced Data Management**

*   **Support Multi-Format File Upload:** Allow uploads of common GIS formats beyond GeoJSON.
    *   **Recommended Tech:** `node-shp` for Shapefiles, or leverage GDAL/OGR.
*   **Implement User-Specific Layers:** Expand the system to allow users to create, manage, and set permissions for their own layers, not just upload to a general pool.

### **Category 4: Testing & DevOps**

*   **Create a Testing Suite:**
    *   **Backend:** Use **Jest** or **Mocha** for unit and integration tests for your controllers and services.
    *   **Frontend:** Use **Vitest** for unit tests and **Playwright** or **Cypress** for end-to-end testing of critical user flows (login, view map, upload layer).
*   **Set Up CI/CD & Deployment:** Automate testing and deployment on every code push to the main branch.
    *   **Recommended Tech:** GitHub Actions for CI/CD; **Render**, **Railway**, or a cloud provider for deployment.
