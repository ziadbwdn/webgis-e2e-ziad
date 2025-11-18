# WebGIS Map Export System

A complete solution for exporting interactive web maps into professional, print-ready layouts. This system captures your current map view and generates a standalone HTML file with proper cartographic elements.

## 📋 Features

- **Professional Layout**: Based on standard cartographic design principles
- **Print-Ready Output**: Optimized for A4 landscape printing
- **Index Map**: Automatic overview map showing the extent of the main map
- **Dynamic Legend**: Auto-generated from map layers
- **Coordinate Labels**: Displays bounding coordinates
- **Scale Information**: Automatic scale calculation
- **Metadata Panel**: Projection, datum, and reference information
- **Client-Side Generation**: No server-side processing required
- **Browser PDF Export**: Users can save directly as PDF using browser print

## 📁 Files Included

1. **map-export-template.html** - The print layout template
2. **map-exporter.js** - JavaScript module for export functionality
3. **demo-map-export.html** - Working demonstration
4. **README.md** - This documentation file

## 🚀 Quick Start

### 1. Include Required Libraries

Add these to your HTML file:

```html
<!-- Leaflet for mapping -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- html2canvas for capturing map -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

<!-- Map Exporter -->
<script src="map-exporter.js"></script>
```

### 2. Initialize the Exporter

```javascript
// After creating your Leaflet map
const map = L.map('map').setView([latitude, longitude], zoom);

// Initialize the exporter
const exporter = new MapExporter(map, {
    mapTitle: 'Your Map Title',
    mapHeader: 'Your Organization Name',
    projection: 'Universal Transverse Mercator',
    datum: 'World Geodetic System 1984 (WGS 84)',
    templateUrl: 'map-export-template.html',
    references: 'Your data sources and references'
});
```

### 3. Add Export Button

```html
<button id="export-btn">Export Map</button>

<script>
document.getElementById('export-btn').addEventListener('click', async () => {
    await exporter.exportMap();
});
</script>
```

## 🔧 Configuration Options

```javascript
const exporter = new MapExporter(map, {
    // Map title (appears in large text at top)
    mapTitle: 'PETA JARINGAN TRANSPORTASI',
    
    // Header text (organization/department name)
    mapHeader: 'PERENCANAAN WILAYAH DAN KOTA<br>INSTITUT TEKNOLOGI',
    
    // Cartographic projection system
    projection: 'Universal Transverse Mercator',
    
    // Geodetic datum
    datum: 'World Geodetic System 1984 (WGS 84)',
    
    // URL to logo image (optional)
    logoUrl: 'assets/logo.png',
    
    // Path to template file
    templateUrl: 'map-export-template.html',
    
    // References text (HTML allowed)
    references: `
        1. Data Source 1<br>
        2. Data Source 2<br>
        3. Analysis Results, 2024
    `
});
```

## 📊 Adding Legend Information to Layers

For automatic legend generation, add legend information when creating layers:

```javascript
// For Leaflet polylines
const route = L.polyline(coordinates, {
    color: '#FF0000',
    weight: 3,
    legendInfo: {
        label: 'Main Route',
        color: '#FF0000',
        width: '3px'
    }
}).addTo(map);

// For polygons
const district = L.polygon(coordinates, {
    color: '#0000FF',
    fillColor: '#0000FF',
    fillOpacity: 0.3,
    legendInfo: {
        label: 'District Boundary',
        color: '#0000FF'
    }
}).addTo(map);
```

## 🎨 Customizing the Template

The template uses CSS Grid for layout. Key sections to customize:

### 1. Header Section
Edit the `sheet-header` grid area for logo and title placement.

### 2. Map Container
Modify `main-map-container` styling for borders and background.

### 3. Legend Styling
Customize `.legend` and `.legend-item` classes for legend appearance.

### 4. Footer
Edit `.sheet-footer` for scale bar and references layout.

### Example CSS Customization:

```css
/* Change map border color */
.main-map-container {
    border: 3px solid #0066cc;
}

/* Adjust title font */
.map-title {
    font-size: 18px;
    color: #003366;
}

/* Customize legend */
.legend {
    background: #f9f9f9;
}
```

## 🔌 Advanced Usage

### Custom Legend Structure

Provide custom legend data programmatically:

```javascript
const customLegend = [
    {
        title: 'Transportation Routes',
        items: [
            { color: '#FF0000', label: 'Route A', width: '3px' },
            { color: '#00FF00', label: 'Route B', width: '3px' },
            { color: '#0000FF', label: 'Route C', width: '3px' }
        ]
    },
    {
        title: 'Administrative Boundaries',
        items: [
            { color: '#000000', label: 'District Border', width: '2px' },
            { color: '#666666', label: 'Sub-district Border', width: '1px' }
        ]
    }
];

// Override the default legend generation
exporter.generateLegendData = function() {
    return customLegend;
};
```

### Loading Indicator

Add a custom loading indicator:

```javascript
exporter.setLoadingCallback((isLoading) => {
    const loadingDiv = document.getElementById('loading-spinner');
    loadingDiv.style.display = isLoading ? 'block' : 'none';
});
```

### Update Configuration Dynamically

```javascript
// Update any config option at runtime
exporter.updateConfig({
    mapTitle: 'New Title',
    scale: '1:50,000'
});
```

## 📐 Layout Structure

The exported layout follows this structure:

```
┌──────────────────────────────────────────────────────────┬──────────────┐
│ Map Header / Organization                                │  Logo        │
│ MAP TITLE                                                │  Scale       │
│                                                          │  Metadata    │
├───────────────────────────────────────────────────────── ┼──────────────┤
│                                                          │              │
│                                                          │  Index Map   │
│           MAIN MAP VIEW                                  │              │
│                                                          ├──────────────┤
│                                                          │              │
│                                                          │   Legend     │
│                                                          │              │
│                                                          │              │
├──────────────────────────────────────────────────────────┴──────────────┤
│North Arrow | Scale Bar                      | References & Sources      │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🖨️ Printing / PDF Export

After exporting, the generated HTML file can be printed:

1. **Open the exported HTML file** in a web browser
2. **Press Ctrl+P** (Windows) or **Cmd+P** (Mac)
3. **Select destination:**
   - Physical Printer → Prints to paper
   - Save as PDF → Generates PDF file
4. **Settings:**
   - Layout: Landscape
   - Paper size: A4
   - Margins: Default or Custom (10mm recommended)
   - Scale: 100%
5. **Print/Save**

## 🐛 Troubleshooting

### Issue: Map appears blank in export

**Solution:** Ensure tile layers are loaded before exporting. Add a delay:

```javascript
document.getElementById('export-btn').addEventListener('click', async () => {
    // Wait for tiles to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    await exporter.exportMap();
});
```

### Issue: CORS errors with map tiles

**Solution:** Some tile providers don't allow CORS. Use tile providers that support it, or use a proxy.

```javascript
// Use CORS-enabled tile provider
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    crossOrigin: true
}).addTo(map);
```

### Issue: Template not found

**Solution:** Ensure the template file path is correct:

```javascript
const exporter = new MapExporter(map, {
    templateUrl: './map-export-template.html' // Relative path
});
```

### Issue: Legend not showing layers

**Solution:** Add `legendInfo` to your layers:

```javascript
const layer = L.polyline(coords, {
    color: '#FF0000',
    legendInfo: {
        label: 'My Layer',
        color: '#FF0000'
    }
}).addTo(map);
```

## 📦 Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 🤝 Integration Examples

### With OpenLayers

```javascript
// Adapt for OpenLayers
const olExporter = {
    map: olMap, // Your OpenLayers map instance
    exportMap: async function() {
        const mapElement = olMap.getTargetElement();
        const canvas = await html2canvas(mapElement);
        const imageData = canvas.toDataURL();
        // ... continue with export logic
    }
};
```

### With Mapbox GL JS

```javascript
// For Mapbox GL
const mbExporter = new MapExporter(map, config);

// Override capture method for Mapbox
mbExporter.captureMapAsImage = async function() {
    return map.getCanvas().toDataURL('image/png');
};
```

## 📝 License

This code is provided as-is for use in your WebGIS applications.

## 🔗 Dependencies

- [Leaflet](https://leafletjs.com/) - Interactive maps
- [html2canvas](https://html2canvas.hertzen.com/) - HTML to canvas rendering

## 📧 Support

For issues or questions about implementation, refer to the demo file (`demo-map-export.html`) for a working example.

---

**Version:** 1.0  
**Last Updated:** November 2024