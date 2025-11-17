# MAPID Landing Page → WebGIS Integration Guide

**Document Version**: 1.0
**Date**: 2025-11-17
**Purpose**: Comprehensive guide for integrating the MAPID landing page codebase and features into the existing WebGIS project

---

## Executive Summary

This guide provides a complete roadmap for integrating the MAPID landing page (built with Vite, TypeScript, and Tailwind CSS v4) into the WebGIS project (currently using vanilla TypeScript with custom CSS). The integration can follow one of three architectural approaches, each with distinct trade-offs regarding build complexity, code reuse, and deployment flexibility.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Integration Strategies](#integration-strategies)
3. [Detailed Implementation Steps](#detailed-implementation-steps)
4. [Feature Integration](#feature-integration)
5. [Build & Deployment](#build--deployment)
6. [Testing & Validation](#testing--validation)
7. [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## Current State Analysis

### Landing Page Project (`landing-trial/`)

**Stack:**
- Build Tool: Vite 7.2.2
- Language: TypeScript 5.9.3 (strict mode)
- CSS: Tailwind CSS 4.1.17 + PostCSS
- Key Files:
  - `index.html` - Navbar + Hero section (responsive)
  - `src/main.ts` - Event handlers for CTA buttons
  - `src/style.css` - Single `@import "tailwindcss"`
  - `tailwind.config.js` - Tailwind configuration
  - `postcss.config.js` - **CRITICAL** for Tailwind v4
  - Assets: `landing-globe.jpg`, `1968_Earthrise_297755main_GPN-2001-000009_full.jpeg`

**Features:**
- Responsive navbar (mobile hamburger menu)
- Full-page hero section with CTA button
- Mobile-first responsive design (breakpoints: 768px, 1024px)
- TypeScript event binding for navigation
- Tailwind CSS utility-first styling

### WebGIS Project (`webgis-homepage/`)

**Stack:**
- Build Tool: Vite 7.2.2
- Language: TypeScript 5.9.3 (strict mode)
- CSS: Custom CSS (no Tailwind)
- Key Files:
  - `index.html` - Basic template with `#app` div
  - `src/main.ts` - Counter demo and HTML rendering
  - `src/counter.ts` - Utility function
  - `src/style.css` - Custom component styles

**Current State:**
- Basic demo project with counter functionality
- No Tailwind CSS integration
- Minimal styling infrastructure
- Lightweight dependencies

---

## Integration Strategies

### Strategy 1: Full Migration (Recommended for Complete Overhaul)

**Overview:** Replace WebGIS's custom CSS and HTML with the landing page's Tailwind-based approach.

**Pros:**
- Clean, unified styling approach
- Consistent design system across both projects
- Modern utility-first CSS workflow
- Easier future maintenance and updates
- Single Tailwind configuration to manage

**Cons:**
- Requires migrating all existing WebGIS CSS
- Bigger breaking change to existing codebase
- Tailwind learning curve for team

**Best For:**
- Teams wanting to standardize on Tailwind
- Projects where WebGIS is still in early development
- Organizations prioritizing consistent design systems

---

### Strategy 2: Coexistence (Recommended for Established Projects)

**Overview:** Keep both projects independent with separate build systems, but share design patterns and assets at runtime.

**Pros:**
- No refactoring of existing WebGIS code
- Landing page can be deployed/updated independently
- Clear separation of concerns
- Minimal risk to WebGIS functionality
- Can be implemented immediately

**Cons:**
- Two separate build systems to maintain
- Potential CSS conflicts if both frameworks loaded
- Duplicated configuration/tooling overhead
- Slightly more complex deployment

**Best For:**
- Projects with established WebGIS codebase
- Teams that want zero disruption to existing code
- Organizations planning phased modernization
- Multi-team deployments with independent cadences

---

### Strategy 3: Hybrid Approach (Recommended for Flexibility)

**Overview:** Integrate Tailwind into WebGIS project while maintaining custom CSS for legacy components.

**Pros:**
- Gradual migration path
- Use Tailwind for new features, custom CSS for old
- Less risk than full migration
- Flexibility to modernize incrementally
- Can deprecate custom CSS over time

**Cons:**
- Mixed styling approaches increase complexity
- Potential for CSS specificity conflicts
- Requires careful namespace management
- More complex to reason about styles

**Best For:**
- Large established projects with lots of custom CSS
- Teams wanting to modernize incrementally
- Projects needing backward compatibility
- Organizations with parallel development teams

---

## Detailed Implementation Steps

### Strategy 1: Full Migration Implementation

#### Phase 1: Prepare WebGIS for Tailwind

**1.1 Add Tailwind Dependencies**

```bash
cd webgis-homepage/
npm install -D tailwindcss postcss autoprefixer @tailwindcss/postcss
```

**1.2 Create Tailwind Configuration**

Create `webgis-homepage/postcss.config.js`:
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

Create `webgis-homepage/tailwind.config.js`:
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**1.3 Update src/style.css**

Replace the content of `webgis-homepage/src/style.css`:
```css
@import "tailwindcss";
```

**1.4 Remove Old CSS**

- Delete custom CSS rules from `src/style.css` (after migrating to Tailwind classes)
- Remove inline styles from `index.html`

#### Phase 2: Port Landing Page Components

**2.1 Copy HTML Structure**

Copy navbar from `landing-trial/index.html` to `webgis-homepage/index.html`:

```html
<header class="sticky top-0 bg-white shadow-md">
  <!-- Navbar structure from landing-trial -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Brand, nav links, user controls -->
  </div>
</header>
```

**2.2 Migrate Styling Classes**

From `landing-trial/index.html`, identify all Tailwind utility classes:
- Spacing: `p-4`, `m-2`, `gap-4`
- Display: `flex`, `grid`, `hidden`
- Colors: `bg-blue-900`, `text-white`
- Responsive: `md:flex`, `lg:w-1/2`

Apply these same classes to WebGIS components.

**2.3 Update TypeScript Event Handlers**

Merge event handlers from `landing-trial/src/main.ts` into `webgis-homepage/src/main.ts`:

```typescript
import './style.css'

// Existing counter logic...

// Add landing page handlers
const mapBtn = document.getElementById('mapBtn')
mapBtn?.addEventListener('click', () => {
  // Navigation logic
  window.location.href = '/map'
})

const mobileMenuBtn = document.getElementById('mobileMenuBtn')
mobileMenuBtn?.addEventListener('click', () => {
  const menu = document.getElementById('mobileMenu')
  menu?.classList.toggle('hidden')
})
```

#### Phase 3: Verify & Test

**3.1 Start Development Server**

```bash
npm run dev
```

**3.2 Check Tailwind Output**

- Styles should load without warnings
- Responsive breakpoints should work (test with browser dev tools)
- No flash of unstyled content (FOUC)

**3.3 Test Responsiveness**

- Mobile (< 768px): Menu collapses, layout stacks
- Tablet (≥ 768px): Two-column layout appears
- Desktop (> 1024px): Full layout with max-width constraints

---

### Strategy 2: Coexistence Implementation

#### Phase 1: Maintain Separate Projects

**1.1 Keep Both Projects Independent**

- Landing page: `landing-trial/` (Vite + Tailwind)
- WebGIS: `webgis-homepage/` (Vite + Custom CSS)
- Each has separate `package.json`, `node_modules`, build config

**1.2 Establish Deployment Boundaries**

Create clear URL routing:

```
├── `/` → Landing Page (landing-trial)
├── `/map` → WebGIS App (webgis-homepage)
└── `/about` → Other landing pages
```

**1.3 Configure for Monorepo-like Deployment** (Optional)

If deploying from single server, update `vite.config.ts` in each project:

```typescript
// webgis-homepage/vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: '../dist/map', // Output to parent dist/map
  }
})
```

```typescript
// landing-trial/vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist', // Output to root dist
  }
})
```

#### Phase 2: Share Assets & Design Patterns

**2.1 Create Shared Assets Directory** (Optional)

```
landing-trial/
├── public/
│   ├── shared/  # Shared across projects
│   │   ├── logo.png
│   │   ├── favicon.ico
│   │   └── landing-globe.jpg
│   └── landing-specific/
│       └── 1968_Earthrise_297755main_GPN-2001-000009_full.jpeg
```

Update `index.html` references:
```html
<img src="/shared/logo.png" alt="MAPID Logo">
<img src="/landing-specific/earthrise.jpg" alt="Background">
```

**2.2 Document Design System**

Create `DESIGN-SYSTEM.md`:
```markdown
# MAPID Design System

## Colors
- Primary Background: #0a192f
- Text: #ffffff
- CTA: #64ffda

## Typography
- Font: Inter, Poppins, Lato (sans-serif)
- Heading: 3rem bold
- Body: 1rem normal

## Spacing Scale
- xs: 0.5rem
- sm: 1rem
- md: 2rem
- lg: 4rem
```

**2.3 Share Navigation Component**

Create reusable navbar in `landing-trial/src/navbar.ts`:

```typescript
export function initNavbar() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn')
  const mobileMenu = document.getElementById('mobileMenu')

  mobileMenuBtn?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('hidden')
  })
}
```

In WebGIS, import and use:
```typescript
import { initNavbar } from '../../src/navbar'
initNavbar()
```

#### Phase 3: Runtime Integration

**3.1 Configure Server Routing**

If using Express or similar:

```javascript
const express = require('express')
const app = express()

// Landing page (landing-trial)
app.use('/', express.static('landing-trial/dist'))

// WebGIS app (webgis-homepage)
app.use('/map', express.static('webgis-homepage/dist'))

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile('landing-trial/dist/index.html')
})
```

**3.2 Add Navigation Handlers**

In landing page CTA button:
```html
<button id="mapBtn" class="...">Go to Map</button>
```

In `src/main.ts`:
```typescript
const mapBtn = document.getElementById('mapBtn')
mapBtn?.addEventListener('click', () => {
  window.location.href = '/map'
})
```

---

### Strategy 3: Hybrid Approach Implementation

#### Phase 1: Add Tailwind to WebGIS

Follow "Full Migration" Phase 1 (install dependencies, create configs).

#### Phase 2: Gradual Component Migration

**2.1 Establish CSS Namespace**

In `tailwind.config.js`, add layer:
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**2.2 Migrate Components Incrementally**

Choose one component at a time:

**Old CSS (to deprecate):**
```css
.navbar {
  display: flex;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: white;
}
```

**New Tailwind:**
```html
<nav class="flex justify-between p-4 md:p-8 bg-white">
  <!-- content -->
</nav>
```

**2.3 Mark Legacy CSS**

In old `src/style.css`, add comments:
```css
/* DEPRECATED: Use Tailwind classes instead */
/* Target removal: Version 2.0 */
.old-component {
  /* ... */
}
```

**2.4 Create Migration Checklist**

Track progress:
```markdown
## Component Migration Status

- [ ] Navbar
- [ ] Hero Section
- [ ] Cards
- [ ] Buttons
- [ ] Forms
- [ ] Footer
```

---

## Feature Integration

### Feature 1: Responsive Navigation

**Landing Page Implementation:**
- Navbar with logo, nav links, user controls
- Mobile hamburger menu (hidden on md+ screens)
- Sticky positioning

**Integration into WebGIS:**

**Option A: Copy-Paste (Quick)**
```html
<!-- From landing-trial/index.html -->
<header class="sticky top-0 bg-white shadow">
  <div class="max-w-7xl mx-auto">
    <!-- navbar structure -->
  </div>
</header>
```

**Option B: Create Shared Component (Better)**
Create `src/components/navbar.ts`:
```typescript
export function createNavbar(options?: NavbarOptions): HTMLElement {
  const navbar = document.createElement('header')
  navbar.className = 'sticky top-0 bg-white shadow'
  // Build navbar structure
  return navbar
}

interface NavbarOptions {
  logo?: string
  links?: { label: string; href: string }[]
  user?: { name: string; onLogout: () => void }
}
```

### Feature 2: Hero Section with CTA

**Landing Page Implementation:**
- Two-column layout (globe graphic + text)
- Deep blue background (#0a192f)
- "Go to Map" CTA button
- Responsive stacking on mobile

**Integration into WebGIS:**

**HTML Structure:**
```html
<section class="hero-section bg-slate-900 text-white py-20">
  <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8">
    <!-- Left: Globe graphic -->
    <div class="md:w-1/2">
      <img src="/shared/landing-globe.jpg" alt="Globe" class="max-w-md">
    </div>

    <!-- Right: Content -->
    <div class="md:w-1/2">
      <p class="text-sm text-slate-300">in collaboration with</p>
      <h1 class="text-4xl font-bold mb-4">MAPID</h1>
      <p class="text-lg text-slate-200 mb-6">Value proposition...</p>
      <button class="bg-cyan-400 text-slate-900 px-6 py-3 rounded">
        Go to Map
      </button>
    </div>
  </div>
</section>
```

**TypeScript Event Handler:**
```typescript
const ctaButton = document.querySelector('.hero-section button')
ctaButton?.addEventListener('click', () => {
  window.location.href = '/map'
})
```

### Feature 3: Responsive Design System

**Landing Page Approach:**
- Mobile-first (classes for smallest screens)
- Breakpoint prefixes: `md:` (768px), `lg:` (1024px)
- Utility classes for spacing, sizing, colors

**Integration Strategy:**

**Create Design Tokens File:**
```typescript
// src/design-tokens.ts
export const tokens = {
  breakpoints: {
    mobile: '< 768px',
    tablet: '>= 768px',
    desktop: '> 1024px',
  },
  colors: {
    primary: '#0a192f',
    text: '#ffffff',
    accent: '#64ffda',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '2rem',
    lg: '4rem',
  },
}
```

**Use in Components:**
```html
<div class="p-4 md:p-8 lg:p-12">
  <!-- Responsive padding -->
</div>
```

---

## Build & Deployment

### Single Project Build (Full Migration)

**Development:**
```bash
cd webgis-homepage/
npm run dev
```

**Production Build:**
```bash
npm run build
# Outputs to: dist/
```

**Preview:**
```bash
npm run preview
```

### Multiple Projects Build (Coexistence)

**Development (Terminal 1):**
```bash
cd landing-trial/
npm run dev
# Runs on localhost:5173
```

**Development (Terminal 2):**
```bash
cd webgis-homepage/
npm run dev
# Runs on localhost:5174
```

**Production Build Script:**

Create `build.sh` in root:
```bash
#!/bin/bash

echo "Building landing page..."
cd landing-trial
npm run build
cd ..

echo "Building WebGIS app..."
cd webgis-homepage
npm run build
cd ..

echo "Builds complete!"
echo "Landing page: dist/"
echo "WebGIS app: webgis-homepage/dist/"
```

Run with:
```bash
chmod +x build.sh
./build.sh
```

**Monorepo Build Script (Advanced):**

Create `package.json` in root with workspace configuration:
```json
{
  "private": true,
  "workspaces": [
    "landing-trial",
    "webgis-homepage"
  ],
  "scripts": {
    "dev:landing": "cd landing-trial && npm run dev",
    "dev:webgis": "cd webgis-homepage && npm run dev",
    "build:all": "npm run build --workspaces",
    "build:landing": "cd landing-trial && npm run build",
    "build:webgis": "cd webgis-homepage && npm run build"
  }
}
```

### Deployment Options

#### Option 1: Static Hosting (Recommended for Coexistence)

**Netlify:**
```toml
# netlify.toml (in root)

[[redirects]]
from = "/*"
to = "/index.html"
status = 200

[[redirects]]
from = "/map/*"
to = "/map/index.html"
status = 200
```

**Vercel:**
```json
// vercel.json (in root)
{
  "rewrites": [
    { "source": "/map/(.*)", "destination": "/map/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Option 2: Server-Side Routing (Advanced)

Express.js setup:
```javascript
const express = require('express')
const path = require('path')

const app = express()

// Serve landing page as default
app.use(express.static(path.join(__dirname, 'landing-trial/dist')))

// Serve WebGIS app at /map
app.use('/map', express.static(path.join(__dirname, 'webgis-homepage/dist')))

// Fallback to landing page index for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/map')) {
    res.sendFile(path.join(__dirname, 'webgis-homepage/dist/index.html'))
  } else {
    res.sendFile(path.join(__dirname, 'landing-trial/dist/index.html'))
  }
})

app.listen(3000, () => console.log('Server running on port 3000'))
```

---

## Testing & Validation

### Unit Tests

**Setup Jest in WebGIS:**
```bash
npm install -D jest @types/jest ts-jest
```

**jest.config.js:**
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
}
```

**Test Example:**
```typescript
// src/__tests__/navbar.test.ts
import { initNavbar } from '../navbar'

describe('Navbar', () => {
  it('should toggle mobile menu on button click', () => {
    document.body.innerHTML = `
      <button id="mobileMenuBtn"></button>
      <div id="mobileMenu" class="hidden"></div>
    `

    initNavbar()
    const button = document.getElementById('mobileMenuBtn') as HTMLButtonElement
    button.click()

    const menu = document.getElementById('mobileMenu')
    expect(menu?.classList.contains('hidden')).toBe(false)
  })
})
```

### Integration Tests

**Test Cross-Project Navigation:**
```typescript
describe('Navigation Between Landing and WebGIS', () => {
  it('should navigate to /map when CTA button clicked', () => {
    const originalLocation = window.location.href
    const mapBtn = document.getElementById('mapBtn') as HTMLButtonElement
    mapBtn.click()

    expect(window.location.href).toContain('/map')
  })
})
```

### E2E Tests (Playwright/Cypress)

**Create `e2e/landing.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should load and display hero section', async ({ page }) => {
    await page.goto('http://localhost:5173')

    const heroSection = page.locator('.hero-section')
    await expect(heroSection).toBeVisible()
  })

  test('should navigate to map on CTA click', async ({ page }) => {
    await page.goto('http://localhost:5173')

    await page.click('#mapBtn')
    await page.waitForURL('**/map**')

    expect(page.url()).toContain('/map')
  })

  test('should show mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.click('#mobileMenuBtn')
    const menu = page.locator('#mobileMenu')
    await expect(menu).not.toHaveClass('hidden')
  })
})
```

### Browser Compatibility Testing

Test across browsers:
```bash
# Chrome
npm run preview

# Firefox - install and test
# Safari - test on macOS

# Mobile
# - iPhone Safari
# - Android Chrome
```

### Responsive Design Validation

**Breakpoints to Test:**
- Mobile: 320px, 375px, 425px
- Tablet: 768px, 1024px
- Desktop: 1440px, 1920px

**Checklist:**
- [ ] Navigation collapses to hamburger at < 768px
- [ ] Two-column layout appears at ≥ 768px
- [ ] Text is readable on all sizes
- [ ] Images scale proportionally
- [ ] Touch targets are ≥ 44px × 44px

---

## Troubleshooting & FAQs

### Issue: Tailwind Styles Not Loading (Full Migration)

**Symptoms:** Page shows plain HTML without styling

**Diagnosis:**
```bash
# Check if @tailwindcss/postcss is installed
npm list @tailwindcss/postcss

# Check PostCSS config
cat postcss.config.js

# Check style.css
cat src/style.css
```

**Solution:**
```bash
# 1. Ensure package is installed
npm install -D @tailwindcss/postcss

# 2. Verify postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

# 3. Verify src/style.css
@import "tailwindcss";

# 4. Clear cache and restart
rm -rf node_modules/.vite
npm run dev
```

### Issue: CSS Conflicts (Coexistence)

**Symptoms:** Styles from one project affecting another

**Solution:**
1. Ensure projects are served from different origins
2. Use CSS namespacing if on same domain:
   ```css
   /* In webgis-homepage */
   .webgis-app { /* All styles nested here */ }
   ```
3. Use CSS modules if bundled together:
   ```typescript
   import styles from './component.module.css'
   element.className = styles.container
   ```

### Issue: Build Size Increases with Tailwind (Full Migration)

**Symptoms:** `dist/` folder significantly larger after adding Tailwind

**Note:** This is temporary. Tailwind purges unused CSS in production.

**Optimization:**
```bash
# Ensure content paths are correct in tailwind.config.js
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
]

# Build and check size
npm run build
ls -lh dist/assets/
```

### Issue: TypeScript Errors with Dynamic DOM Elements

**Symptoms:** `Property 'click' does not exist on type 'Element'`

**Solution:**
```typescript
// Before (wrong)
const button = document.getElementById('myBtn')
button.addEventListener('click', ...) // TS error

// After (correct)
const button = document.getElementById('myBtn') as HTMLButtonElement
button?.addEventListener('click', ...)

// Or with type guard
if (button instanceof HTMLElement) {
  button.addEventListener('click', ...)
}
```

### FAQ: Can I Use Both Tailwind and Custom CSS?

**Yes, the Hybrid Approach** (Strategy 3) supports this. However:
- Avoid conflicts by using different selectors
- Gradually migrate custom CSS to Tailwind
- Use CSS specificity wisely to prevent cascading issues

Example:
```css
/* Custom CSS (legacy) */
.old-button { padding: 10px 20px; }

/* Tailwind (new) */
<button class="px-5 py-2 ...">New Button</button>
```

### FAQ: How Do I Share Components Between Projects?

**Option 1: Code Duplication (Simple)**
- Copy-paste HTML structure and TypeScript logic
- Update paths/identifiers as needed
- Maintain separately

**Option 2: Shared Module (Recommended)**
```typescript
// src/shared/navbar.ts (in landing-trial)
export function initNavbar() { ... }
```

```typescript
// src/main.ts (in webgis-homepage)
import { initNavbar } from '../../src/shared/navbar'
initNavbar()
```

**Option 3: NPM Package (Advanced)**
- Publish landing-trial components as npm package
- Install in webgis-homepage
- Version and maintain separately

### FAQ: What's the Best Approach for My Team?

| Scenario | Recommendation |
|----------|-----------------|
| Fresh start, greenfield | Strategy 1: Full Migration |
| Established WebGIS, slow modernization | Strategy 3: Hybrid |
| Independent deployment teams | Strategy 2: Coexistence |
| Complex legacy code | Strategy 3: Hybrid |
| Time-constrained | Strategy 2: Coexistence |

---

## Migration Checklist

Use this checklist to track integration progress:

### Pre-Integration
- [ ] Review all three strategies with team
- [ ] Choose integration approach
- [ ] Backup existing WebGIS code
- [ ] Document current architecture

### Core Integration
- [ ] (Full/Hybrid) Install Tailwind dependencies
- [ ] (Full/Hybrid) Create Tailwind config files
- [ ] (Full/Hybrid) Update CSS imports
- [ ] Copy navbar HTML structure
- [ ] Copy hero section structure
- [ ] Integrate TypeScript event handlers
- [ ] Update navigation routes

### Styling Migration
- [ ] Convert HTML to use Tailwind classes
- [ ] Test responsive breakpoints
- [ ] Test dark mode (if needed)
- [ ] Validate color contrast (WCAG)
- [ ] Optimize images

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Browser compatibility verified
- [ ] Mobile responsiveness verified
- [ ] Accessibility audit passed

### Deployment
- [ ] Build scripts configured
- [ ] Production URLs verified
- [ ] Build size optimized
- [ ] Deploy to staging
- [ ] Smoke testing on staging
- [ ] Deploy to production
- [ ] Monitor performance metrics

### Documentation
- [ ] Update README
- [ ] Document design system
- [ ] Create component library docs
- [ ] Add migration notes
- [ ] Team training completed

---

## Resources & References

### Official Documentation
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostCSS Documentation](https://postcss.org/)

### Design Files
- `GUIDELINE.md` - Original design specifications
- `landing-globe.jpg` - Hero section graphic
- `1968_Earthrise_297755main_GPN-2001-000009_full.jpeg` - Background asset

### Code References
- `landing-trial/index.html` - HTML structure template
- `landing-trial/src/main.ts` - Event handler examples
- `landing-trial/tailwind.config.js` - Tailwind configuration
- `landing-trial/src/style.css` - CSS import pattern

### Related Documents
- `INTEGRATION-GUIDE.md` - Landing page setup guide
- `UI-DESIGN-GUIDE.md` - UI implementation details
- `CLAUDE.md` - Project instructions

---

## Support & Next Steps

### Getting Help
1. Check **Troubleshooting & FAQs** section
2. Review original documentation in `GUIDELINE.md`
3. Test with `npm run dev` to isolate issues
4. Check browser console for error messages

### Next Steps After Integration
1. Customize colors and fonts to match brand
2. Add missing pages (About, Documentation)
3. Implement user authentication flow
4. Set up analytics tracking
5. Optimize images and assets
6. Deploy to production
7. Monitor performance and user feedback

---

**Document Maintained By:** Development Team
**Last Updated:** 2025-11-17
**Version:** 1.0

*For questions or updates to this guide, please refer to project documentation or contact the development team.*
