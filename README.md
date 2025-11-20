# MAPID WebGIS

![MAPID WebGIS](https://img.shields.io/badge/Status-Production%20Ready-green)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-ISC-yellow)

A modern, full-stack geospatial web application for interactive mapping, spatial analysis, and data visualization. Specifically designed for Surabaya, Indonesia with comprehensive GIS capabilities.

**🌐 Live Demo:** Coming Soon
**📦 Repository:** [webgis-e2e-ziad](https://github.com/ziadbwdn/webgis-e2e-ziad)
**📖 Documentation:** See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed technical docs

---

## 🎯 Features

### 🗺️ Interactive Mapping
- Real-time map with MapLibre GL JS
- Pan, zoom, and navigate with smooth controls
- Multiple basemap layers
- Dynamic coordinate grid overlay with customizable colors

### 📊 Default Layers
Four built-in geospatial layers for Surabaya:

1. **Population Density** - Calculated from demographic data
2. **Economic Status** - Color-coded socioeconomic classification
3. **Old Public Routes** - Historical transit routes (purple)
4. **Recent Routes** - Current transit routes (multi-colored)

### 🔍 Spatial Analysis
- **Buffer Analysis** - Create circular/arbitrary buffers around features
- **Intersection** - Find overlapping areas between layers
- **Union** - Combine multiple layers into one
- Asynchronous processing with job queue

### 🚗 Routing & Navigation
- Route calculation between two points
- Distance and time estimation
- Isochrone analysis (reachable areas)
- Multiple transport modes support

### 🛠️ Map Tools
- **Distance Measurement** - Click points to measure distances
- **Drawing Tools** - Create and edit points, lines, polygons
- **Radius Buffer** - Draw circular buffers around points
- **Geolocation** - Get precise coordinates for any location
- **Feature Editing** - Delete or modify drawn features

### 🖼️ Export & Sharing
- Export map as PNG with legend
- Preserve attribution and scale
- Custom titles and branding
- High-quality output

### 📁 Layer Management
- Upload custom GeoJSON files
- Organize user and default layers
- Store layer metadata in database
- Spatial feature indexing with PostGIS

### 🔐 Authentication
- Secure user registration and login
- JWT-based authentication
- Password hashing with bcrypt
- 7-day token expiration

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ with PostGIS 3.4
- Redis 7+ (optional, for async processing)

### Installation

```bash
# Clone repository
git clone https://github.com/ziadbwdn/webgis-e2e-ziad.git
cd webgis-e2e-ziad
git checkout development

# Install dependencies
npm install --workspaces

# Configure environment
# Server
cd server
cp .env.example .env
# Edit .env with your database credentials

# Client
cd ../client
# Create .env if needed
```

### Development

```bash
# Start all services with docker-compose (recommended)
cd server
docker-compose up -d

# In another terminal, start the client
cd client
npm run dev

# Server runs on: http://localhost:3000
# Client runs on: http://localhost:5173
```

### Local Development Without Docker

```bash
# Terminal 1: Start PostgreSQL and Redis
# (Ensure they're running on default ports)

# Terminal 2: Start server
cd server
npm run dev

# Terminal 3: Start client
cd client
npm run dev
```

---

## 📦 Project Structure

```
mapid-webgis/
├── server/                      # Backend API
│   ├── src/
│   │   ├── routes/             # API endpoints
│   │   ├── controllers/        # Business logic
│   │   ├── models/             # Data layer
│   │   ├── queues/             # BullMQ async jobs
│   │   └── db/                 # Database connection
│   ├── Dockerfile              # Production image
│   ├── docker-compose.yml      # Local stack
│   └── README.md               # Server documentation
│
├── client/                      # Frontend SPA
│   ├── src/
│   │   ├── dashboard.ts        # Main application
│   │   ├── home.ts             # Landing page
│   │   └── components/         # UI components
│   ├── data/                   # GeoJSON files
│   ├── Dockerfile              # Development image
│   ├── nginx.conf              # Production config
│   └── README.md               # Client documentation
│
├── DEVELOPMENT.md              # Technical architecture
├── README.md                   # This file
└── .gitignore                  # Git exclusions
```

---

## 🛠️ Technology Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20+ | Runtime |
| TypeScript | 5.9+ | Language |
| Express.js | 5.1+ | Framework |
| PostgreSQL | 16+ | Database |
| PostGIS | 3.4+ | Spatial database |
| Redis | 7+ | Cache/Queue |
| BullMQ | 5.63+ | Job processing |
| JWT | 9.0+ | Authentication |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| TypeScript | 5.0+ | Language |
| Vite | 5.0+ | Build tool |
| MapLibre GL | 4.0+ | Mapping library |
| Turf.js | 7.0+ | Geospatial analysis |
| html2canvas | 1.4+ | Map export |

### DevOps
| Tool | Purpose |
|------|---------|
| Docker | Containerization |
| docker-compose | Local development |
| Railway | Server deployment |
| Vercel | Client deployment |

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register        # Register new user
POST   /api/auth/login           # User login
GET    /api/auth/profile         # Get user profile
POST   /api/auth/logout          # Logout user
```

### Layers (Protected)
```
GET    /api/layers/default       # Get default layers
GET    /api/layers/all/list      # Get all layers
POST   /api/layers/upload        # Upload GeoJSON
GET    /api/layers/:id/features  # Get layer features
DELETE /api/layers/:id           # Delete layer
```

### Spatial Analysis (Protected)
```
POST   /api/analysis/buffer      # Create buffer
POST   /api/analysis/intersection # Intersect layers
POST   /api/analysis/union       # Union layers
GET    /api/analysis/status/:jobId    # Job status
GET    /api/analysis/result/:jobId    # Get result
```

### Routing (Protected)
```
POST   /api/routing/route        # Calculate route
POST   /api/routing/isochrone    # Calculate isochrone
```

### Health
```
GET    /health                   # Server health check
```

---

## 🚀 Deployment

### Production Deployment

#### Server (Railway)

1. **Repository Setup**
   ```bash
   git push origin development
   ```

2. **Railway Configuration**
   - Connect GitHub repository
   - Select PostgreSQL + PostGIS plugin
   - Add Redis plugin
   - Set environment variables:
     ```
     DATABASE_URL=<railway-postgres>
     REDIS_HOST=<railway-redis>
     JWT_SECRET=<secure-random>
     CORS_ORIGIN=<vercel-url>
     NODE_ENV=production
     ```

3. **Deploy**
   - Railway auto-detects `Dockerfile`
   - Automatic deployment on push

#### Client (Vercel)

1. **Vercel Configuration**
   - Connect GitHub repository
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Set environment variables:
     ```
     VITE_API_URL=<railway-api-url>
     ```

2. **Deploy**
   - Automatic deployment on push to main branch
   - **Note:** Vercel does NOT use Docker

---

## 🔧 Configuration

### Server Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Authentication
JWT_SECRET=your-super-secret-key-change-in-production

# Server
PORT=3000
NODE_ENV=development

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Client Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:3000/api
```

---

## 📚 Documentation

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Technical architecture and implementation details
- **[server/README.md](server/README.md)** - Server setup, API documentation, and deployment
- **[client/README.md](client/README.md)** - Client setup, features, and Vercel deployment

---

## 🧪 Development Workflow

### Setting Up Development Environment

```bash
# 1. Clone repository
git clone https://github.com/ziadbwdn/webgis-e2e-ziad.git
cd webgis-e2e-ziad

# 2. Checkout development branch
git checkout development

# 3. Install dependencies (both server and client)
npm install --workspaces

# 4. Start docker-compose stack
cd server
docker-compose up -d

# 5. Run migrations (if needed)
npm run migrate

# 6. Start dev servers
# Terminal 1: Server
npm run dev

# Terminal 2: Client
cd ../client
npm run dev
```

### Code Style

- **TypeScript** with strict mode enabled
- **ESLint** for linting (if configured)
- **Prettier** for formatting (if configured)
- Consistent naming conventions

### Making Changes

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test thoroughly
3. Commit with clear messages: `git commit -m "describe changes"`
4. Push to feature branch: `git push origin feature/my-feature`
5. Create Pull Request to `development` branch
6. Request code review before merging

---

## 🐛 Known Issues & Limitations

1. **Grid Labels Missing**
   - Coordinate lines display without text labels
   - Workaround: Use Geolocation tool for precise coordinates

2. **pgRouting Optional**
   - Routing requires pgRouting extension installation
   - Current implementation works without it (placeholder)

3. **Mobile Responsiveness**
   - Primary desktop design
   - Mobile support is limited

---

## ✨ Future Enhancements

- [ ] Mobile-responsive design
- [ ] Advanced spatial analysis tools
- [ ] Real-time collaboration features
- [ ] Raster layer support
- [ ] Custom styling tools
- [ ] Data import/export formats (KML, Shapefile)
- [ ] User permission system
- [ ] Layer versioning
- [ ] Historical analysis tools

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a Pull Request

---

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

## 🆘 Support & Troubleshooting

### Common Issues

**Database Connection Error**
```
Error: Failed to connect to database
Solution: Check DATABASE_URL and ensure PostgreSQL is running
```

**CORS Error**
```
Error: CORS policy blocked request
Solution: Verify CORS_ORIGIN matches client URL in .env
```

**Port Already in Use**
```
Error: EADDRINUSE: address already in use
Solution: Change PORT in .env or kill existing process
```

### Getting Help

- Check [DEVELOPMENT.md](DEVELOPMENT.md) for architecture details
- Review [server/README.md](server/README.md) for API documentation
- Check [client/README.md](client/README.md) for frontend setup
- Open an issue on GitHub repository

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| **Backend Files** | 15+ |
| **Frontend Files** | 10+ |
| **Total Lines of Code** | 8,000+ |
| **Dependencies** | 50+ |
| **API Endpoints** | 20+ |
| **Supported Features** | 15+ |

---

## 🔒 Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with 7-day expiration
- SQL injection protection via parameterized queries
- CORS configuration for API access
- Input validation with Zod schemas
- Environment variable security (no secrets in code)

---

## 📞 Contact & Community

**Project Lead:** [Ziad Budi Wildan](https://github.com/ziadbwdn)

**Repository:** [webgis-e2e-ziad](https://github.com/ziadbwdn/webgis-e2e-ziad)

**Issues:** [GitHub Issues](https://github.com/ziadbwdn/webgis-e2e-ziad/issues)

---

## 🎉 Acknowledgments

- MapLibre GL for excellent mapping library
- Turf.js for geospatial analysis
- PostGIS team for powerful spatial database
- Railway and Vercel for hosting platforms

---

## 📋 Changelog

### Version 1.0.0 (November 20, 2025)
- ✅ Default layers system implementation
- ✅ Docker and deployment configuration
- ✅ Comprehensive documentation
- ✅ Production-ready state

---

**Last Updated:** November 20, 2025
**Current Version:** 1.0.0
**Status:** Production Ready
**Branch:** development

---

## 🚀 Getting Started NOW

### 30-Second Quick Start

```bash
# Clone and setup
git clone https://github.com/ziadbwdn/webgis-e2e-ziad.git
cd webgis-e2e-ziad && git checkout development

# Start with Docker (easiest)
cd server && docker-compose up -d
cd ../client && npm install && npm run dev

# Open browser to http://localhost:5173
# Login with your credentials
# Start mapping!
```

---

**Made with ❤️ for Surabaya**
