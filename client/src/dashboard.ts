import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AnalysisPanel } from './components/analysis-panel';
import { RoutingPanel } from './components/routing-panel';
import { ExportPanel } from './components/export-panel';
import { LayerStyleParser } from './components/layer-style-parser';
import { LegendGenerator } from './components/legend-generator';

// Types
interface User {
  id: number;
  email: string;
  full_name: string;
}

interface Layer {
  id: number;
  name: string;
  description: string;
  type: string;
  is_default: boolean;
  style_config?: any; // Style configuration JSON
}

// API Configuration
const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api';

class Dashboard {
  private map!: maplibregl.Map;
  private authToken: string | null = null;
  private currentUser: User | null = null;
  private activeLayers: Map<number, string> = new Map();
  private layerMetadata: Map<number, Layer> = new Map(); // Store full layer info for legends
  private layerColors: string[] = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
  private analysisPanel: AnalysisPanel | null = null;
  private routingPanel: RoutingPanel | null = null;
  private exportPanel: ExportPanel | null = null;
  private geolocationMode: boolean = false;
  private leftSidebarCollapsed: boolean = false;
  private rightPanelCollapsed: boolean = false;

  // Map tools state
  private activeTool: string | null = null;
  private drawingFeatures: GeoJSON.Feature[] = [];
  private measurementPoints: number[][] = [];
  private measurementMarkers: maplibregl.Marker[] = [];
  private editMode: boolean = false;

  // Event handler references for cleanup
  private mapClickHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;
  private mapDblClickHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;

  // Drawing state
  private currentDrawCoordinates: number[][] = [];
  private currentDrawMarkers: maplibregl.Marker[] = [];

  // Grid state
  private gridEnabled: boolean = false;
  private gridColor: string = 'rgba(255, 255, 255, 0.8)';
  private gridOpacity: number = 0.8;

  constructor() {
    this.init();
  }

  private async init() {
    // Check authentication
    if (!this.loadAuthState()) {
      window.location.href = '/';
      return;
    }

    // Initialize components
    this.displayUserInfo();
    this.initMap();
    this.initAnalysisPanel();
    this.initEventListeners();
    this.initCollapsibleSidebars();
    this.initTabs();
    this.initMapTools();
    this.loadSidebarState();
    await this.loadDefaultLayers();
  }

  private initAnalysisPanel() {
    if (!this.authToken) return;

    // Create and mount analysis panel
    this.analysisPanel = new AnalysisPanel(this.authToken);
    const panelElement = this.analysisPanel.render();
    document.body.appendChild(panelElement);

    // Connect result visualization callback
    this.analysisPanel.setOnResultCreated((layerId) => {
      this.loadResultLayer(layerId);
    });

    // Create and mount routing panel
    this.routingPanel = new RoutingPanel(this.authToken, this.map);
    const routingPanelElement = this.routingPanel.render();
    document.body.appendChild(routingPanelElement);

    // Create and mount export panel
    this.exportPanel = new ExportPanel();
    const exportPanelElement = this.exportPanel.render();
    document.body.appendChild(exportPanelElement);

    // Connect export callback to existing export function
    this.exportPanel.setExportCallback(() => this.exportMap());
  }

  /**
   * Load and display analysis result layer on map
   */
  private async loadResultLayer(layerId: number) {
    try {
      console.log(`Loading result layer ${layerId} to map...`);

      // Fetch features directly (no need for layer metadata endpoint)
      const featuresResponse = await this.apiRequest(`/layers/${layerId}/features`);

      if (!featuresResponse || !featuresResponse.features || featuresResponse.features.length === 0) {
        console.error('No features found for result layer');
        return;
      }

      const sourceId = `layer-${layerId}`;
      const fillLayerId = `${sourceId}-fill`;
      const outlineLayerId = `${sourceId}-outline`;

      // Remove existing layers/sources if they exist
      if (this.map.getLayer(outlineLayerId)) {
        this.map.removeLayer(outlineLayerId);
      }
      if (this.map.getLayer(fillLayerId)) {
        this.map.removeLayer(fillLayerId);
      }
      if (this.map.getSource(sourceId)) {
        this.map.removeSource(sourceId);
      }

      // Add source
      this.map.addSource(sourceId, {
        type: 'geojson',
        data: featuresResponse
      });

      // Get a color for this layer (use result layer color - orange)
      const fillColor = '#e67e22'; // Result layer color
      const outlineColor = '#d35400';

      // Add fill layer with 50% opacity
      this.map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': fillColor,
          'fill-opacity': 0.5
        }
      });

      // Add outline layer
      this.map.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': outlineColor,
          'line-width': 2
        }
      });

      this.activeLayers.set(layerId, sourceId);

      // Zoom to layer bounds
      const bounds = this.calculateBounds(featuresResponse);
      if (bounds) {
        this.map.fitBounds(bounds, { padding: 50 });
      }

      console.log(`Result layer ${layerId} displayed on map with ${featuresResponse.features.length} features`);

      // Reload layer list to show new result layer
      await this.loadDefaultLayers();
    } catch (error) {
      console.error('Failed to load result layer:', error);
    }
  }

  /**
   * Calculate bounds from GeoJSON
   */
  private calculateBounds(geojson: any): [[number, number], [number, number]] | null {
    if (!geojson.features || geojson.features.length === 0) return null;

    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;

    geojson.features.forEach((feature: any) => {
      const coords = this.extractCoordinates(feature.geometry);
      coords.forEach(([lng, lat]: [number, number]) => {
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      });
    });

    return [[minLng, minLat], [maxLng, maxLat]];
  }

  /**
   * Extract all coordinates from geometry
   */
  private extractCoordinates(geometry: any): [number, number][] {
    if (geometry.type === 'Point') {
      return [geometry.coordinates];
    } else if (geometry.type === 'LineString') {
      return geometry.coordinates;
    } else if (geometry.type === 'Polygon') {
      return geometry.coordinates[0];
    } else if (geometry.type === 'MultiPoint') {
      return geometry.coordinates;
    } else if (geometry.type === 'MultiLineString') {
      return geometry.coordinates.flat();
    } else if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.flat(2);
    }
    return [];
  }

  private loadAuthState(): boolean {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');

    if (token && user) {
      this.authToken = token;
      this.currentUser = JSON.parse(user);
      return true;
    }
    return false;
  }

  private displayUserInfo() {
    const userNameEl = document.getElementById('user-name')!;
    if (this.currentUser) {
      userNameEl.textContent = this.currentUser.full_name;
    }
  }

  private initMap() {
    this.map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }]
      },
      center: [112.7388, -7.2575], // Surabaya, Indonesia
      zoom: 12,
      preserveDrawingBuffer: true // Enable canvas export capability
    });

    // Add controls
    this.map.addControl(new maplibregl.NavigationControl(), 'top-left');
    this.map.addControl(new maplibregl.ScaleControl(), 'bottom-right');
    this.map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-left');

    // Initialize grid system after map loads
    this.map.on('load', () => {
      this.initGrid();
    });

    // Update grid on map movement
    this.map.on('moveend', () => {
      if (this.gridEnabled) {
        this.updateGrid();
      }
    });
  }

  // ===== GRID SYSTEM FUNCTIONS =====

  private initGrid() {
    // Add grid source (empty initially)
    this.map.addSource('grid-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    // Add grid lines layer
    this.map.addLayer({
      id: 'grid-lines',
      type: 'line',
      source: 'grid-source',
      paint: {
        'line-color': this.gridColor,
        'line-width': 1.2
      },
      layout: {
        'visibility': 'none' // Hidden by default
      }
    });
  }

  private calculateGridSpacing(zoom: number): number {
    // Automatic grid spacing based on zoom level
    if (zoom >= 16) return 0.01;   // ~1 km
    if (zoom >= 14) return 0.05;   // ~5 km
    if (zoom >= 12) return 0.1;    // ~10 km
    if (zoom >= 10) return 0.25;   // ~25 km
    if (zoom >= 8) return 0.5;     // ~50 km
    if (zoom >= 6) return 1;       // ~100 km
    return 2;                      // ~200 km
  }

  private generateGridGeoJSON(): GeoJSON.FeatureCollection {
    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();
    const spacing = this.calculateGridSpacing(zoom);

    const west = bounds.getWest();
    const east = bounds.getEast();
    const south = bounds.getSouth();
    const north = bounds.getNorth();

    const minLng = Math.floor(west / spacing) * spacing;
    const maxLng = Math.ceil(east / spacing) * spacing;
    const minLat = Math.floor(south / spacing) * spacing;
    const maxLat = Math.ceil(north / spacing) * spacing;

    const features: GeoJSON.Feature[] = [];

    // Generate vertical lines (longitude)
    for (let lng = minLng; lng <= maxLng; lng += spacing) {
      if (lng >= west && lng <= east) {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [lng, south],
              [lng, north]
            ]
          }
        });
      }
    }

    // Generate horizontal lines (latitude)
    for (let lat = minLat; lat <= maxLat; lat += spacing) {
      if (lat >= south && lat <= north) {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [west, lat],
              [east, lat]
            ]
          }
        });
      }
    }

    return {
      type: 'FeatureCollection',
      features
    };
  }

  private updateGrid() {
    const source = this.map.getSource('grid-source') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(this.generateGridGeoJSON());
    }
  }

  public toggleGrid(enabled: boolean) {
    this.gridEnabled = enabled;
    const visibility = enabled ? 'visible' : 'none';

    if (this.map.getLayer('grid-lines')) {
      this.map.setLayoutProperty('grid-lines', 'visibility', visibility);
    }

    if (enabled) {
      this.updateGrid();
    }

    // Save preference
    localStorage.setItem('gridEnabled', enabled.toString());
  }

  public updateGridStyle(color: string, opacity: number) {
    this.gridColor = color;
    this.gridOpacity = opacity;

    const colorWithOpacity = color.replace(/[\d.]+\)$/g, `${opacity})`);

    if (this.map.getLayer('grid-lines')) {
      this.map.setPaintProperty('grid-lines', 'line-color', colorWithOpacity);
    }

    // Save preferences
    localStorage.setItem('gridColor', color);
    localStorage.setItem('gridOpacity', opacity.toString());
  }

  // ===== END GRID SYSTEM FUNCTIONS =====

  private initEventListeners() {
    // Logout
    document.getElementById('logout-btn')!.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      window.location.href = '/';
    });

    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // Handle page navigation
        const page = item.getAttribute('data-page');

        // Hide all panels first
        if (this.analysisPanel) this.analysisPanel.hide();
        if (this.routingPanel) this.routingPanel.hide();
        if (this.exportPanel) this.exportPanel.hide();
        this.disableGeolocationMode();

        // Show appropriate panel based on selection
        if (page === 'spatial-analysis' && this.analysisPanel) {
          this.analysisPanel.show();
        } else if (page === 'find-routes' && this.routingPanel) {
          this.routingPanel.show();
        } else if (page === 'geolocation') {
          this.enableGeolocationMode();
        } else if (page === 'export-map' && this.exportPanel) {
          this.exportPanel.show();
        }
      });
    });

    // Basemap selector
    document.querySelectorAll('input[name="basemap"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const value = (e.target as HTMLInputElement).value;
        this.changeBasemap(value);
      });
    });

    // Upload layer
    document.getElementById('upload-layer-btn')!.addEventListener('click', () => {
      document.getElementById('file-input')!.click();
    });

    document.getElementById('file-input')!.addEventListener('change', (e) => {
      this.handleFileUpload(e);
    });

    // Refresh layers button
    document.getElementById('refresh-layers-btn')!.addEventListener('click', async () => {
      await this.loadDefaultLayers();
    });

    // Grid toggle - with null check to prevent breaking other event listeners
    const gridToggle = document.getElementById('grid-toggle') as HTMLInputElement;
    const gridCustomization = document.getElementById('grid-customization');

    if (gridToggle && gridCustomization) {
      gridToggle.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        this.toggleGrid(enabled);
        gridCustomization.style.display = enabled ? 'block' : 'none';
      });

      // Grid color selector
      const gridColor = document.getElementById('grid-color');
      if (gridColor) {
        gridColor.addEventListener('change', (e) => {
          const color = (e.target as HTMLSelectElement).value;
          const gridOpacityEl = document.getElementById('grid-opacity') as HTMLInputElement;
          const opacity = gridOpacityEl ? parseInt(gridOpacityEl.value) / 100 : 0.8;
          this.updateGridStyle(color, opacity);
        });
      }

      // Grid opacity slider
      const gridOpacity = document.getElementById('grid-opacity') as HTMLInputElement;
      const gridOpacityValue = document.getElementById('grid-opacity-value');

      if (gridOpacity && gridOpacityValue) {
        gridOpacity.addEventListener('input', (e) => {
          const opacity = parseInt((e.target as HTMLInputElement).value) / 100;
          gridOpacityValue.textContent = `${Math.round(opacity * 100)}%`;

          const gridColorEl = document.getElementById('grid-color') as HTMLSelectElement;
          const color = gridColorEl ? gridColorEl.value : 'rgba(255, 255, 255, 0.8)';
          this.updateGridStyle(color, opacity);
        });
      }

      // Load saved grid preferences
      const savedGridEnabled = localStorage.getItem('gridEnabled') === 'true';
      if (savedGridEnabled) {
        gridToggle.checked = true;
        gridCustomization.style.display = 'block';
        this.toggleGrid(true);
      }

      const savedGridColor = localStorage.getItem('gridColor');
      const gridColorEl = document.getElementById('grid-color') as HTMLSelectElement;
      if (savedGridColor && gridColorEl) {
        gridColorEl.value = savedGridColor;
      }

      const savedGridOpacity = localStorage.getItem('gridOpacity');
      if (savedGridOpacity && gridOpacity && gridOpacityValue) {
        const opacityPercent = Math.round(parseFloat(savedGridOpacity) * 100);
        gridOpacity.value = opacityPercent.toString();
        gridOpacityValue.textContent = `${opacityPercent}%`;
      }
    }
  }

  private initCollapsibleSidebars() {
    // Left sidebar toggle
    const leftSidebar = document.getElementById('left-sidebar');
    const toggleLeftBtn = document.getElementById('toggle-left-sidebar');

    console.log('Left sidebar element:', leftSidebar);
    console.log('Left toggle button:', toggleLeftBtn);

    if (!leftSidebar || !toggleLeftBtn) {
      console.error('Left sidebar elements not found!');
      return;
    }

    toggleLeftBtn.addEventListener('click', () => {
      console.log('Left button clicked!');
      this.leftSidebarCollapsed = !this.leftSidebarCollapsed;
      leftSidebar.classList.toggle('collapsed', this.leftSidebarCollapsed);
      this.saveSidebarState();

      // Update button icon
      const icon = toggleLeftBtn.querySelector('.icon');
      if (icon) {
        icon.textContent = this.leftSidebarCollapsed ? '▶' : '◀';
      }
    });

    // Right panel toggle
    const rightPanel = document.getElementById('right-panel');
    const toggleRightBtn = document.getElementById('toggle-right-panel');

    console.log('Right panel element:', rightPanel);
    console.log('Right toggle button:', toggleRightBtn);

    if (!rightPanel || !toggleRightBtn) {
      console.error('Right panel elements not found!');
      return;
    }

    toggleRightBtn.addEventListener('click', () => {
      console.log('Right button clicked!');
      this.rightPanelCollapsed = !this.rightPanelCollapsed;
      rightPanel.classList.toggle('collapsed', this.rightPanelCollapsed);
      this.saveSidebarState();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Press '[' to toggle left sidebar
      if (e.key === '[') {
        toggleLeftBtn.click();
      }
      // Press ']' to toggle right panel
      if (e.key === ']') {
        toggleRightBtn.click();
      }
    });
  }

  private saveSidebarState() {
    localStorage.setItem('leftSidebarCollapsed', String(this.leftSidebarCollapsed));
    localStorage.setItem('rightPanelCollapsed', String(this.rightPanelCollapsed));
  }

  private loadSidebarState() {
    // Restore previous state
    const leftCollapsed = localStorage.getItem('leftSidebarCollapsed') === 'true';
    const rightCollapsed = localStorage.getItem('rightPanelCollapsed') === 'true';

    if (leftCollapsed) {
      document.getElementById('toggle-left-sidebar')!.click();
    }
    if (rightCollapsed) {
      document.getElementById('toggle-right-panel')!.click();
    }
  }

  private initTabs() {
    // Tab switching functionality
    const tabHeaders = document.querySelectorAll('.tab-header');
    const tabContents = document.querySelectorAll('.tab-content');

    tabHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const targetTab = header.getAttribute('data-tab');

        // Remove active class from all headers and contents
        tabHeaders.forEach(h => h.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked header and corresponding content
        header.classList.add('active');
        document.getElementById(targetTab!)?.classList.add('active');
      });
    });
  }

  private initMapTools() {
    // Distance measurement
    document.getElementById('measure-distance-btn')!.addEventListener('click', () => {
      this.toggleTool('measure-distance');
    });

    // Drawing tools
    document.getElementById('draw-point-btn')!.addEventListener('click', () => {
      this.toggleTool('draw-point');
    });

    document.getElementById('draw-line-btn')!.addEventListener('click', () => {
      this.toggleTool('draw-line');
    });

    document.getElementById('draw-polygon-btn')!.addEventListener('click', () => {
      this.toggleTool('draw-polygon');
    });

    document.getElementById('radius-tool-btn')!.addEventListener('click', () => {
      this.toggleTool('radius-tool');
    });

    document.getElementById('edit-features-btn')!.addEventListener('click', () => {
      this.toggleTool('edit-features');
    });

    // Clear all drawings
    document.getElementById('clear-drawings-btn')!.addEventListener('click', () => {
      this.clearAllDrawings();
    });

    // Map export (optional button, ExportPanel handles its own UI)
    const exportMapBtn = document.getElementById('export-map-btn');
    if (exportMapBtn) {
      exportMapBtn.addEventListener('click', () => {
        this.exportMap();
      });
    }

    // Initialize drawing sources and layers
    this.map.on('load', () => {
      this.initDrawingSources();
    });
  }

  private toggleTool(tool: string) {
    const toolButtons = document.querySelectorAll('.tool-btn:not(.tool-btn-danger)');

    // If clicking same tool, deactivate it
    if (this.activeTool === tool) {
      this.deactivateCurrentTool();
      return;
    }

    // Deactivate previous tool first
    this.deactivateCurrentTool();

    // Activate new tool
    this.activeTool = tool;
    toolButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tool}-btn`)?.classList.add('active');

    // Set cursor and handlers based on tool
    switch (tool) {
      case 'measure-distance':
        this.map.getCanvas().style.cursor = 'crosshair';
        this.startMeasurement();
        break;
      case 'draw-point':
      case 'draw-line':
      case 'draw-polygon':
        this.map.getCanvas().style.cursor = 'crosshair';
        this.startDrawing(tool);
        break;
      case 'radius-tool':
        this.map.getCanvas().style.cursor = 'crosshair';
        this.startRadiusTool();
        break;
      case 'edit-features':
        this.map.getCanvas().style.cursor = 'pointer';
        this.startEditing();
        break;
    }
  }

  private deactivateCurrentTool() {
    // Remove event handlers
    if (this.mapClickHandler) {
      this.map.off('click', this.mapClickHandler);
      this.mapClickHandler = null;
    }
    if (this.mapDblClickHandler) {
      this.map.off('dblclick', this.mapDblClickHandler);
      this.mapDblClickHandler = null;
    }

    // Clean up drawing state
    this.currentDrawMarkers.forEach(m => m.remove());
    this.currentDrawMarkers = [];
    this.currentDrawCoordinates = [];

    // Clear active states
    this.activeTool = null;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    this.map.getCanvas().style.cursor = '';
  }

  private initDrawingSources() {
    // Add source for drawings if not exists
    if (!this.map.getSource('drawings')) {
      this.map.addSource('drawings', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: this.drawingFeatures
        }
      });

      // Add layers for different geometry types
      this.map.addLayer({
        id: 'drawings-fill',
        type: 'fill',
        source: 'drawings',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': '#088',
          'fill-opacity': 0.4
        }
      });

      this.map.addLayer({
        id: 'drawings-line',
        type: 'line',
        source: 'drawings',
        filter: ['in', '$type', 'LineString', 'Polygon'],
        paint: {
          'line-color': '#088',
          'line-width': 3
        }
      });

      this.map.addLayer({
        id: 'drawings-point',
        type: 'circle',
        source: 'drawings',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#088',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Add popups for drawing features
      this.setupDrawingPopups();
    }

    // Add source for measurement line
    if (!this.map.getSource('measurement-line')) {
      this.map.addSource('measurement-line', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      this.map.addLayer({
        id: 'measurement-line',
        type: 'line',
        source: 'measurement-line',
        paint: {
          'line-color': '#f00',
          'line-width': 3,
          'line-dasharray': [2, 2]
        }
      });
    }
  }

  private startMeasurement() {
    this.measurementPoints = [];
    this.clearMeasurement();

    this.mapClickHandler = (e: maplibregl.MapMouseEvent) => {
      if (this.activeTool !== 'measure-distance') return;

      this.measurementPoints.push([e.lngLat.lng, e.lngLat.lat]);

      // Add marker
      const el = document.createElement('div');
      el.className = 'measurement-marker';
      el.style.cssText = 'background: red; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(e.lngLat)
        .addTo(this.map);

      this.measurementMarkers.push(marker);

      // Update line
      if (this.measurementPoints.length > 1) {
        const lineSource = this.map.getSource('measurement-line') as maplibregl.GeoJSONSource;
        lineSource.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: this.measurementPoints
            },
            properties: {}
          }]
        });

        // Calculate and display distance
        const distance = this.calculateDistance(this.measurementPoints);
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="padding: 5px; font-size: 12px;"><strong>Distance:</strong> ${distance.toFixed(2)} km</div>`)
          .addTo(this.map);
      }
    };

    this.map.on('click', this.mapClickHandler);
  }

  private calculateDistance(coordinates: number[][]): number {
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lng1, lat1] = coordinates[i];
      const [lng2, lat2] = coordinates[i + 1];

      // Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }
    return totalDistance;
  }

  private clearMeasurement() {
    this.measurementMarkers.forEach(marker => marker.remove());
    this.measurementMarkers = [];
    this.measurementPoints = [];

    const lineSource = this.map.getSource('measurement-line') as maplibregl.GeoJSONSource;
    if (lineSource) {
      lineSource.setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  }

  private startDrawing(tool: string) {
    // Reset drawing state
    this.currentDrawCoordinates = [];
    this.currentDrawMarkers = [];

    this.mapClickHandler = (e: maplibregl.MapMouseEvent) => {
      if (!this.activeTool || !this.activeTool.startsWith('draw-')) return;

      this.currentDrawCoordinates.push([e.lngLat.lng, e.lngLat.lat]);

      // Add temporary marker
      const el = document.createElement('div');
      el.style.cssText = 'background: #088; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white;';
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(e.lngLat)
        .addTo(this.map);
      this.currentDrawMarkers.push(marker);

      // Finish drawing immediately for points
      if (tool === 'draw-point') {
        this.finishDrawing(tool);
      }
    };

    this.mapDblClickHandler = (e: maplibregl.MapMouseEvent) => {
      if (!this.activeTool || !this.activeTool.startsWith('draw-')) return;
      e.preventDefault();

      // For line and polygon, finish on double-click
      if (this.currentDrawCoordinates.length >= 2) {
        this.finishDrawing(tool);
      }
    };

    this.map.on('click', this.mapClickHandler);
    this.map.on('dblclick', this.mapDblClickHandler);
  }

  private finishDrawing(tool: string) {
    let geometry: any;

    if (tool === 'draw-point') {
      geometry = { type: 'Point', coordinates: this.currentDrawCoordinates[0] };
    } else if (tool === 'draw-line') {
      geometry = { type: 'LineString', coordinates: this.currentDrawCoordinates };
    } else if (tool === 'draw-polygon') {
      // Close the polygon
      const closedCoords = [...this.currentDrawCoordinates, this.currentDrawCoordinates[0]];
      geometry = { type: 'Polygon', coordinates: [closedCoords] };
    }

    const feature: GeoJSON.Feature = {
      type: 'Feature',
      geometry,
      properties: {
        id: Date.now(),
        createdAt: new Date().toISOString()
      }
    };

    this.drawingFeatures.push(feature);

    // Update source
    const drawingsSource = this.map.getSource('drawings') as maplibregl.GeoJSONSource;
    if (drawingsSource) {
      drawingsSource.setData({
        type: 'FeatureCollection',
        features: this.drawingFeatures
      });
    }

    // Ask if user wants to save as layer
    const saveToServer = confirm('Save this feature as a new layer on the server?');
    if (saveToServer) {
      this.saveDrawingAsLayer(feature);
    }

    // Deactivate tool
    this.deactivateCurrentTool();
  }

  private startEditing() {
    // Enable click on drawings to delete them
    this.mapClickHandler = (e: maplibregl.MapMouseEvent) => {
      if (this.activeTool !== 'edit-features') return;

      const features = this.map.queryRenderedFeatures(e.point, {
        layers: ['drawings-fill', 'drawings-line', 'drawings-point']
      });

      if (features.length > 0) {
        const featureId = features[0].properties?.id;
        if (featureId && confirm('Delete this feature?')) {
          this.drawingFeatures = this.drawingFeatures.filter(f => f.properties?.id !== featureId);

          const drawingsSource = this.map.getSource('drawings') as maplibregl.GeoJSONSource;
          if (drawingsSource) {
            drawingsSource.setData({
              type: 'FeatureCollection',
              features: this.drawingFeatures
            });
          }
        }
      }
    };

    this.map.on('click', this.mapClickHandler);
  }

  private async saveDrawingAsLayer(feature: GeoJSON.Feature) {
    const layerName = prompt('Enter layer name:', `Drawing_${Date.now()}`);
    if (!layerName) return;

    try {
      // Create GeoJSON with the feature
      const geojson = {
        type: 'FeatureCollection',
        features: [feature]
      };

      // Upload as new layer
      const response = await this.apiRequest('/layers/upload', 'POST', {
        name: layerName,
        description: 'Created from map drawing tool',
        geojson
      });

      if (response && response.layer) {
        alert(`Layer "${layerName}" saved successfully! (ID: ${response.layer.id})`);
        // Reload layers to show the new one
        await this.loadDefaultLayers();

        // Auto-load the new layer to map (convert response to Layer object)
        await this.addLayerToMap({
          id: response.layer.id,
          name: response.layer.name,
          description: '',
          type: response.layer.type || 'unknown',
          is_default: false
        });
      } else {
        console.error('Unexpected response format:', response);
        alert('Layer may have been saved, but could not confirm. Please refresh the page.');
      }
    } catch (error) {
      console.error('Failed to save layer:', error);
      alert(`Failed to save layer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start radius tool - click on map to create circular buffer
   */
  private startRadiusTool() {
    this.mapClickHandler = async (e: maplibregl.MapMouseEvent) => {
      if (this.activeTool !== 'radius-tool') return;

      const { lng, lat } = e.lngLat;

      // Prompt for radius parameters
      const radiusInput = prompt('Enter radius distance (e.g., 1000):', '1000');
      if (!radiusInput) return;

      const radius = parseFloat(radiusInput);
      if (isNaN(radius) || radius <= 0) {
        alert('Invalid radius. Please enter a positive number.');
        return;
      }

      const units = prompt('Enter units (meters, kilometers, miles):', 'meters');
      if (!units || !['meters', 'kilometers', 'miles'].includes(units)) {
        alert('Invalid units. Please use: meters, kilometers, or miles.');
        return;
      }

      const name = prompt('Enter optional layer name:', `Radius ${radius}${units}`);

      try {
        // Call radius API
        const response = await this.apiRequest('/analysis/radius', 'POST', {
          longitude: lng,
          latitude: lat,
          radius,
          units,
          name: name || undefined
        });

        if (response.jobId) {
          alert(`Radius analysis job created!\nJob ID: ${response.jobId}\n\nCheck the Analysis Panel to monitor progress.`);

          // Deactivate tool after successful creation
          this.deactivateCurrentTool();

          // Optionally poll for job completion and auto-load result
          this.pollJobAndLoadResult(response.jobId);
        }
      } catch (error) {
        console.error('Radius analysis failed:', error);
        alert(`Failed to create radius: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    this.map.on('click', this.mapClickHandler);
  }

  /**
   * Poll job status and auto-load result when complete
   */
  private async pollJobAndLoadResult(jobId: string) {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        const status = await this.apiRequest(`/analysis/${jobId}`);

        if (status.status === 'completed' && status.resultLayerId) {
          console.log(`Job ${jobId} completed. Loading result layer ${status.resultLayerId}`);
          await this.loadResultLayer(status.resultLayerId);
          return;
        }

        if (status.status === 'failed') {
          console.error(`Job ${jobId} failed:`, status.error);
          return;
        }

        // Continue polling if still running
        if (status.status === 'waiting' || status.status === 'active') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000); // Poll every second
          }
        }
      } catch (error) {
        console.error('Failed to poll job status:', error);
      }
    };

    // Start polling
    setTimeout(poll, 1000);
  }

  private clearAllDrawings() {
    if (!confirm('Clear all drawings and measurements?')) return;

    this.drawingFeatures = [];
    this.clearMeasurement();

    const drawingsSource = this.map.getSource('drawings') as maplibregl.GeoJSONSource;
    if (drawingsSource) {
      drawingsSource.setData({
        type: 'FeatureCollection',
        features: []
      });
    }

    // Deactivate any active tool
    this.deactivateCurrentTool();
  }

  private async exportMap() {
    console.log('=== EXPORT MAP STARTED ===');
    console.log('Active layers:', Array.from(this.activeLayers.keys()));
    console.log('Layer metadata:', Array.from(this.layerMetadata.keys()));

    // Get user's map title input - this is used for BOTH header title AND filename
    // Validation happens in the export panel before this function is called
    const titleElement = document.getElementById('export-title') as HTMLInputElement;
    console.log('Title element in exportMap:', titleElement);
    console.log('Title element value:', titleElement?.value);
    const userTitle = titleElement?.value?.trim() || 'Untitled Map';
    console.log('Final userTitle:', userTitle);

    // Use the same user input for both map title (in header) and filename
    const mapTitle = userTitle;
    const imageName = userTitle;
    const format = (document.getElementById('export-format') as HTMLSelectElement)?.value || 'png';
    const dpi = parseInt((document.getElementById('export-resolution') as HTMLSelectElement)?.value || '300');
    const includeLegend = (document.getElementById('export-legend') as HTMLInputElement)?.checked ?? true;
    const includeScale = (document.getElementById('export-scale') as HTMLInputElement)?.checked ?? true;
    const includeAttribution = (document.getElementById('export-attribution') as HTMLInputElement)?.checked ?? true;

    console.log('Export configuration:', { imageName, format, dpi, includeLegend, includeScale, includeAttribution });

    try {
      // Wait for map to be fully loaded
      await new Promise<void>(resolve => {
        if (this.map.loaded()) {
          resolve();
        } else {
          this.map.once('load', () => {
            resolve();
          });
        }
      });

      // Wait for all sources and layers to be rendered
      let maxWaitTime = 5000;
      let elapsedTime = 0;
      const checkInterval = 200;

      await new Promise<void>(resolve => {
        const checkAllLoaded = () => {
          let allLoaded = true;

          const sources = this.map.getStyle().sources || {};
          for (const sourceId of Object.keys(sources)) {
            try {
              if (!this.map.isSourceLoaded(sourceId)) {
                allLoaded = false;
                break;
              }
            } catch (e) {
              allLoaded = false;
              break;
            }
          }

          if (allLoaded && this.map.areTilesLoaded()) {
            this.map.off('sourcedata', checkAllLoaded);
            resolve();
          } else if (elapsedTime >= maxWaitTime) {
            console.warn('Export timeout: some sources may not be fully loaded');
            this.map.off('sourcedata', checkAllLoaded);
            resolve();
          } else {
            elapsedTime += checkInterval;
          }
        };

        checkAllLoaded();

        if (!this.map.areTilesLoaded()) {
          this.map.on('sourcedata', checkAllLoaded);
        }
      });

      // Force a render
      this.map.triggerRepaint();
      await new Promise<void>(resolve => setTimeout(resolve, 500));

      // Get current map canvas
      const mainCanvas = this.map.getCanvas() as HTMLCanvasElement;
      console.log('Main map canvas size:', mainCanvas.width, 'x', mainCanvas.height);

      // Layout dimensions
      const totalWidth = 1500;  // Total available width
      const totalHeight = 1000; // Total available height
      const headerHeight = 80;
      const sidebarWidth = 350;  // Sidebar width
      const padding = 15;
      const borderWidth = 2;

      // Main map: Use all available space, maintain ORIGINAL aspect ratio (not 4:3)
      // Calculate map dimensions to use all available space while maintaining actual aspect ratio
      const availableMapWidth = totalWidth - sidebarWidth - (2 * borderWidth);
      const availableMapHeight = totalHeight - headerHeight - (2 * borderWidth);

      // Get the actual map's aspect ratio from the main canvas
      const mapAspectRatio = mainCanvas.width / mainCanvas.height;

      let mapWidth = availableMapWidth;
      let mapHeight = availableMapHeight;

      // Adjust to maintain ACTUAL aspect ratio
      if (mapWidth / mapHeight > mapAspectRatio) {
        // Available space is too wide, constrain by height
        mapWidth = mapHeight * mapAspectRatio;
      } else {
        // Available space is too tall, constrain by width
        mapHeight = mapWidth / mapAspectRatio;
      }

      // Index map: enforce 4:3 ratio
      const indexMapRatio = 4 / 3;

      // Create index map container with visible dimensions
      const indexMapContainer = document.createElement('div');
      const indexMapWidth = 260;
      const indexMapHeight = 120;
      indexMapContainer.style.cssText = `position: fixed; top: -9999px; left: -9999px; width: ${indexMapWidth}px; height: ${indexMapHeight}px; display: block; z-index: -9999;`;
      document.body.appendChild(indexMapContainer);

      // Create index map instance - zoomed out to show broader context
      const indexMap = new maplibregl.Map({
        container: indexMapContainer,
        style: {
          version: 8,
          sources: {
            'osm-source': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-source',
            minzoom: 0,
            maxzoom: 19
          }]
        },
        center: [110.0, -7.0], // Broader center for Indonesia context
        zoom: 4, // Zoomed out further to show broader region including Surabaya location
        preserveDrawingBuffer: true,
        interactive: false
      });

      // Wait for index map to fully load and render tiles, then add AOI layers
      let indexMapLoaded = false;
      await new Promise<void>(resolve => {
        const checkLoaded = () => {
          if (indexMap.loaded() && indexMap.areTilesLoaded()) {
            indexMapLoaded = true;
            clearInterval(checkInterval);
            resolve();
          }
        };

        if (indexMap.loaded() && indexMap.areTilesLoaded()) {
          indexMapLoaded = true;
          resolve();
        } else {
          indexMap.once('load', () => {
            setTimeout(() => {
              // Add active layers (AOI) to the index map
              let layerIndex = 0;
              this.activeLayers.forEach((layerColor, layerId) => {
                const sourceId = `layer-${layerId}`;

                // Try to fetch and add the layer data to index map
                this.apiRequest(`/layers/${layerId}/features`)
                  .then((geojson: any) => {
                    if (!indexMap.getSource(`aoi-${sourceId}`)) {
                      indexMap.addSource(`aoi-${sourceId}`, {
                        type: 'geojson',
                        data: geojson
                      });

                      // Add appropriate layer based on geometry type
                      const geometryType = geojson.features?.[0]?.geometry?.type;
                      const color = this.layerColors[layerIndex % this.layerColors.length];

                      switch (geometryType) {
                        case 'Point':
                        case 'MultiPoint':
                          indexMap.addLayer({
                            id: `aoi-${sourceId}-point`,
                            type: 'circle',
                            source: `aoi-${sourceId}`,
                            paint: {
                              'circle-radius': 3,
                              'circle-color': color,
                              'circle-opacity': 0.7
                            }
                          });
                          break;
                        case 'LineString':
                        case 'MultiLineString':
                          indexMap.addLayer({
                            id: `aoi-${sourceId}-line`,
                            type: 'line',
                            source: `aoi-${sourceId}`,
                            paint: {
                              'line-color': color,
                              'line-width': 1,
                              'line-opacity': 0.7
                            }
                          });
                          break;
                        case 'Polygon':
                        case 'MultiPolygon':
                          indexMap.addLayer({
                            id: `aoi-${sourceId}-fill`,
                            type: 'fill',
                            source: `aoi-${sourceId}`,
                            paint: {
                              'fill-color': color,
                              'fill-opacity': 0.3
                            }
                          });
                          indexMap.addLayer({
                            id: `aoi-${sourceId}-stroke`,
                            type: 'line',
                            source: `aoi-${sourceId}`,
                            paint: {
                              'line-color': color,
                              'line-width': 1,
                              'line-opacity': 0.7
                            }
                          });
                          break;
                      }
                    }
                  })
                  .catch(error => console.warn('Could not load AOI layer for index map:', error));

                layerIndex++;
              });

              indexMap.triggerRepaint();
              setTimeout(() => resolve(), 800);
            }, 500);
          });
          const checkInterval = setInterval(checkLoaded, 200);
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!indexMapLoaded) resolve();
          }, 3000);
        }
      });

      // Force repaint and capture
      indexMap.triggerRepaint();
      await new Promise<void>(resolve => setTimeout(resolve, 500));

      let indexCanvasData = '';
      try {
        const indexCanvas = indexMap.getCanvas() as HTMLCanvasElement;
        indexCanvasData = indexCanvas.toDataURL('image/png');
      } catch (e) {
        console.error('Failed to capture index map:', e);
        // Create a fallback placeholder
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = indexMapWidth;
        fallbackCanvas.height = indexMapHeight;
        const fallbackCtx = fallbackCanvas.getContext('2d');
        if (fallbackCtx) {
          fallbackCtx.fillStyle = '#e8f4f8';
          fallbackCtx.fillRect(0, 0, indexMapWidth, indexMapHeight);
          fallbackCtx.strokeStyle = '#999';
          fallbackCtx.strokeRect(0, 0, indexMapWidth, indexMapHeight);
          fallbackCtx.fillStyle = '#999';
          fallbackCtx.font = '12px Arial';
          fallbackCtx.textAlign = 'center';
          fallbackCtx.fillText('Index Map', indexMapWidth / 2, indexMapHeight / 2);
        }
        indexCanvasData = fallbackCanvas.toDataURL('image/png');
      }

      // Create export canvas - main map maintains actual aspect ratio, uses all available space
      console.log('Creating export canvas...');
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = Math.round(mapWidth + sidebarWidth);
      exportCanvas.height = Math.round(mapHeight + headerHeight);
      console.log('Export canvas created:', exportCanvas.width, 'x', exportCanvas.height);

      const ctx = exportCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      console.log('Canvas context obtained successfully');

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // ===== HEADER SECTION =====
      // Draw header border
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(0, 0, exportCanvas.width, headerHeight);

      // Map title - positioned at top left
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.fillText(mapTitle, padding, padding + 20);  // Top left of page

      // Scale info in header (top right)
      if (includeScale) {
        const metersPerPixel = 40075017 / (256 * Math.pow(2, this.map.getZoom())) / Math.cos((this.map.getCenter().lat * Math.PI) / 180);
        const scaleRatio = (metersPerPixel * 100000).toFixed(0);
        ctx.font = '11px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Skala 1:${scaleRatio}`, exportCanvas.width - padding, 20);
      }

      // Metadata in header (right side)
      ctx.font = '9px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Proyeksi: Geographic (WGS84)`, exportCanvas.width - padding, 35);
      ctx.fillText(`Datum: WGS84`, exportCanvas.width - padding, 47);

      // ===== MAIN CONTENT AREA =====
      const contentY = headerHeight;
      const contentHeight = mapHeight;

      // Draw main border around content
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(0, contentY, mapWidth, contentHeight);

      // Draw the main map canvas WITHOUT stretching - maintain aspect ratio
      // Calculate scaling to fit within the available box while maintaining original aspect ratio
      const canvasAspectRatio = mainCanvas.width / mainCanvas.height;
      const displayAspectRatio = mapWidth / mapHeight;

      let drawWidth = mapWidth - (2 * borderWidth);
      let drawHeight = mapHeight - (2 * borderWidth);
      let drawX = borderWidth;
      let drawY = contentY + borderWidth;

      // If map is wider than available area, constrain by width
      if (canvasAspectRatio > displayAspectRatio) {
        drawHeight = drawWidth / canvasAspectRatio;
        drawY = contentY + borderWidth + (mapHeight - (2 * borderWidth) - drawHeight) / 2;
      } else {
        // Otherwise constrain by height
        drawWidth = drawHeight * canvasAspectRatio;
        drawX = borderWidth + (mapWidth - (2 * borderWidth) - drawWidth) / 2;
      }

      // Draw the main map first
      ctx.drawImage(
        mainCanvas,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      );

      // ===== CREATE GRID OVERLAY ON SEPARATE CANVAS =====
      const gridCanvas = document.createElement('canvas');
      gridCanvas.width = drawWidth;
      gridCanvas.height = drawHeight;
      const gridCtx = gridCanvas.getContext('2d');
      if (!gridCtx) {
        throw new Error('Could not get grid canvas context');
      }

      // Get map bounds for grid calculation
      const mapBounds = this.map.getBounds();
      const gridSpacing = 0.5;

      const westBound = mapBounds.getWest();
      const eastBound = mapBounds.getEast();
      const southBound = mapBounds.getSouth();
      const northBound = mapBounds.getNorth();

      const minLng = Math.floor(westBound * 2) / 2;
      const maxLng = Math.ceil(eastBound * 2) / 2;
      const minLat = Math.floor(southBound * 2) / 2;
      const maxLat = Math.ceil(northBound * 2) / 2;

      const lngRange = eastBound - westBound;
      const latRange = northBound - southBound;

      // Canvas-relative coordinates (0,0 is top-left of grid)
      const mapLeft = 0;
      const mapRight = drawWidth;
      const mapTop = 0;
      const mapBottom = drawHeight;

      // Draw grid lines on separate canvas
      gridCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      gridCtx.lineWidth = 1.2;

      // Longitude grid lines (vertical)
      for (let lng = minLng; lng <= maxLng; lng += gridSpacing) {
        const pixelX = mapLeft + ((lng - westBound) / lngRange) * drawWidth;
        if (pixelX >= mapLeft && pixelX <= mapRight) {
          gridCtx.beginPath();
          gridCtx.moveTo(pixelX, mapTop);
          gridCtx.lineTo(pixelX, mapBottom);
          gridCtx.stroke();
        }
      }

      // Latitude grid lines (horizontal)
      for (let lat = minLat; lat <= maxLat; lat += gridSpacing) {
        const pixelY = mapTop + ((northBound - lat) / latRange) * drawHeight;
        if (pixelY >= mapTop && pixelY <= mapBottom) {
          gridCtx.beginPath();
          gridCtx.moveTo(mapLeft, pixelY);
          gridCtx.lineTo(mapRight, pixelY);
          gridCtx.stroke();
        }
      }

      // Draw tick marks on grid canvas
      gridCtx.strokeStyle = '#000000';
      gridCtx.lineWidth = 1.5;
      gridCtx.fillStyle = '#000000';
      gridCtx.font = 'bold 9px Arial, sans-serif';

      // Longitude tick marks and labels (bottom)
      gridCtx.textAlign = 'center';
      for (let lng = minLng; lng <= maxLng; lng += gridSpacing) {
        const pixelX = mapLeft + ((lng - westBound) / lngRange) * drawWidth;
        gridCtx.beginPath();
        gridCtx.moveTo(pixelX, mapBottom - 4);
        gridCtx.lineTo(pixelX, mapBottom);
        gridCtx.stroke();
        gridCtx.fillText(lng.toFixed(1) + '°', pixelX, mapBottom + 12);
      }

      // Latitude tick marks and labels (left)
      gridCtx.textAlign = 'right';
      gridCtx.textBaseline = 'middle';
      for (let lat = minLat; lat <= maxLat; lat += gridSpacing) {
        const pixelY = mapTop + ((northBound - lat) / latRange) * drawHeight;
        gridCtx.beginPath();
        gridCtx.moveTo(mapLeft, pixelY);
        gridCtx.lineTo(mapLeft + 4, pixelY);
        gridCtx.stroke();
        gridCtx.fillText(lat.toFixed(1) + '°', mapLeft - 6, pixelY);
      }

      // Overlay the grid canvas on top of the main map
      ctx.drawImage(gridCanvas, drawX, drawY);

      // ===== INJECT SCALE AND NORTH ARROW INSIDE MAIN MAP (bottom-right corner) =====
      // These are drawn DIRECTLY ON TOP of the main map
      const mapBottomY = drawY + drawHeight;
      const mapRightX = drawX + drawWidth;

      // North arrow and scale bar positioned at bottom-right corner of map
      const arrowBoxX = mapRightX - 80;
      const arrowBoxY = mapBottomY - 110;
      const arrowBoxWidth = 70;
      const arrowBoxHeight = 100;

      // Semi-transparent white background for readability (50% opacity)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(arrowBoxX, arrowBoxY, arrowBoxWidth, arrowBoxHeight);
      ctx.strokeStyle = 'rgba(51, 51, 51, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(arrowBoxX, arrowBoxY, arrowBoxWidth, arrowBoxHeight);

      // North arrow (↑ N) with 50% opacity
      const northX = arrowBoxX + arrowBoxWidth / 2;
      const northY = arrowBoxY + 20;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↑', northX, northY);
      ctx.font = '13px Arial, sans-serif';
      ctx.fillText('N', northX, northY + 20);

      // Scale bar (below north arrow) with 50% opacity
      const scaleY = arrowBoxY + 50;
      const scaleBarWidth = 50;
      const scaleX = northX - scaleBarWidth / 2;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(scaleX, scaleY);
      ctx.lineTo(scaleX + scaleBarWidth, scaleY);
      ctx.stroke();

      // Scale bar ticks
      ctx.beginPath();
      ctx.moveTo(scaleX, scaleY - 4);
      ctx.lineTo(scaleX, scaleY + 4);
      ctx.moveTo(scaleX + scaleBarWidth, scaleY - 4);
      ctx.lineTo(scaleX + scaleBarWidth, scaleY + 4);
      ctx.stroke();

      ctx.font = '8px Arial, sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('0', scaleX, scaleY + 14);
      ctx.fillText('5 km', scaleX + scaleBarWidth, scaleY + 14);

      // Draw vertical separator for sidebar
      const sidebarX = exportCanvas.width - sidebarWidth;
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = borderWidth;
      ctx.beginPath();
      ctx.moveTo(sidebarX, contentY);
      ctx.lineTo(sidebarX, contentY + contentHeight);
      ctx.stroke();

      // ===== SIDEBAR CONTENT =====
      const sidebarContentX = sidebarX + 12;
      let currentY = contentY + 15;
      const lineHeight = 12;

      // Helper to draw section title
      const drawSectionTitle = (title: string, y: number): number => {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(title, sidebarContentX, y);

        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sidebarContentX, y + 3);
        ctx.lineTo(sidebarX + sidebarWidth - 12, y + 3);
        ctx.stroke();

        return y + 15;
      };

      // ===== LEGEND BOX =====
      if (includeLegend && this.activeLayers.size > 0) {
        console.log('Drawing legend section...');
        currentY = drawSectionTitle('LEGENDA', currentY);
        currentY += 8;

        let layerIndex = 0;
        // Build layer list with names and colors
        const checkedLayers: Array<{id: number, name: string}> = [];
        document.querySelectorAll('#layers-list input:checked').forEach(checkbox => {
          const input = checkbox as HTMLInputElement;
          checkedLayers.push({
            id: parseInt(input.value),
            name: input.dataset.layerName || 'Unknown'
          });
        });

        console.log('Checked layers for export:', checkedLayers);

        // Iterate through layers and render their legends
        checkedLayers.forEach((layer) => {
          console.log(`Rendering legend for layer ${layer.id}: ${layer.name}`);
          const layerMetadata = this.layerMetadata.get(layer.id);
          const color = this.activeLayers.get(layer.id) || this.layerColors[layerIndex % this.layerColors.length];

          // Check if layer has categorical style config
          if (layerMetadata?.style_config && layerMetadata.style_config.styleType === 'categorical') {
            const config = layerMetadata.style_config;
            console.log(`Layer ${layer.id} has categorical config with ${config.categories?.length || 0} categories`);

            // Draw layer name
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 11px Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(layer.name, sidebarContentX, currentY);
            currentY += 15;

            // Draw attribute name
            ctx.font = '9px Arial, sans-serif';
            ctx.fillStyle = '#666666';
            ctx.fillText(config.attribute, sidebarContentX, currentY);
            currentY += 13;

            // Draw categories in 3-column grid layout
            const categories = config.categories;
            const numColumns = 3;
            const numRows = 5;
            const itemsPerPage = numColumns * numRows;

            // Column width and spacing
            const availableWidth = sidebarWidth - 24; // Subtract padding
            const columnWidth = availableWidth / numColumns;
            const colorBoxWidth = 12;
            const colorBoxHeight = 9;
            const rowHeight = 12;
            const startY = currentY;

            // Draw categories in columns (fill vertically first, then move to next column)
            categories.forEach((category: any, index: number) => {
              const page = Math.floor(index / itemsPerPage);
              const indexInPage = index % itemsPerPage;
              const col = Math.floor(indexInPage / numRows);
              const row = indexInPage % numRows;

              // Calculate position
              const x = sidebarContentX + (col * columnWidth);
              const y = startY + (row * rowHeight) + (page * (numRows * rowHeight + 20));

              console.log(`Drawing category: ${category.value} at col ${col}, row ${row}`);

              // Draw color box
              ctx.fillStyle = category.color;
              ctx.fillRect(x, y - 8, colorBoxWidth, colorBoxHeight);
              ctx.strokeStyle = '#999';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(x, y - 8, colorBoxWidth, colorBoxHeight);

              // Draw category label (truncate if too long)
              ctx.fillStyle = '#000000';
              ctx.font = '8px Arial, sans-serif';
              ctx.textAlign = 'left';

              const maxLabelWidth = columnWidth - colorBoxWidth - 6;
              let label = category.value;
              const labelWidth = ctx.measureText(label).width;

              if (labelWidth > maxLabelWidth) {
                // Truncate and add ellipsis
                while (ctx.measureText(label + '...').width > maxLabelWidth && label.length > 0) {
                  label = label.slice(0, -1);
                }
                label += '...';
              }

              ctx.fillText(label, x + colorBoxWidth + 3, y);
            });

            // Calculate total height used
            const totalPages = Math.ceil(categories.length / itemsPerPage);
            const totalHeight = (numRows * rowHeight * totalPages) + ((totalPages - 1) * 20);
            currentY += totalHeight + 8;
          } else {
            // Fallback: simple colored line for non-categorical layers
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sidebarContentX, currentY - 4);
            ctx.lineTo(sidebarContentX + 20, currentY - 4);
            ctx.stroke();

            // Draw layer name
            ctx.fillStyle = '#000000';
            ctx.font = '11px Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${layer.name}`, sidebarContentX + 28, currentY);

            currentY += 16;
          }

          layerIndex++;
        });

        currentY += 12;
      }

      // ===== INDEX MAP BOX (PETA INDEKS) - 4:3 Ratio =====
      const sidebarIndexMapWidth = sidebarWidth - 30;
      // Enforce 4:3 ratio for index map
      let sidebarIndexMapHeight = (sidebarIndexMapWidth / 4) * 3;
      // Cap it to reasonable size
      if (sidebarIndexMapHeight > 150) sidebarIndexMapHeight = 150;

      // Draw title
      currentY = drawSectionTitle('PETA INDEKS', currentY);
      currentY += 8;

      // Index map box
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sidebarContentX, currentY, sidebarIndexMapWidth, sidebarIndexMapHeight);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.strokeRect(sidebarContentX, currentY, sidebarIndexMapWidth, sidebarIndexMapHeight);

      // Wait for and draw the index map image
      await new Promise<void>(resolve => {
        const indexMapImage = new Image();
        indexMapImage.onload = () => {
          ctx.drawImage(indexMapImage, sidebarContentX, currentY, sidebarIndexMapWidth, sidebarIndexMapHeight);
          resolve();
        };
        indexMapImage.onerror = () => {
          console.error('Failed to load index map image');
          resolve();
        };
        indexMapImage.src = indexCanvasData;

        // Timeout fallback after 2 seconds
        setTimeout(() => resolve(), 2000);
      });

      currentY += sidebarIndexMapHeight + 12;

      // ===== MAP INFORMATION BOX =====
      currentY = drawSectionTitle('Informasi Peta:', currentY);
      currentY += 8;

      ctx.fillStyle = '#333333';
      ctx.font = '10px Arial, sans-serif';
      ctx.textAlign = 'left';

      ctx.fillText(`Proyeksi: Web Mercator`, sidebarContentX, currentY);
      currentY += 14;
      ctx.fillText(`Datum: WGS84`, sidebarContentX, currentY);
      currentY += 14;
      ctx.fillText(`Pusat Peta:`, sidebarContentX, currentY);
      currentY += 14;
      ctx.fillText(`  Bujur: ${this.map.getCenter().lng.toFixed(4)}°`, sidebarContentX, currentY);
      currentY += 14;
      ctx.fillText(`  Lintang: ${this.map.getCenter().lat.toFixed(4)}°`, sidebarContentX, currentY);
      currentY += 14;
      ctx.fillText(`Zoom Level: ${this.map.getZoom().toFixed(1)}`, sidebarContentX, currentY);
      currentY += 14;

      if (includeScale) {
        const metersPerPixel = 40075017 / (256 * Math.pow(2, this.map.getZoom())) / Math.cos((this.map.getCenter().lat * Math.PI) / 180);
        const scaleRatio = (metersPerPixel * 100000).toFixed(0);
        ctx.fillText(`Skala: 1:${scaleRatio}`, sidebarContentX, currentY);
        currentY += 14;
      }

      currentY += 8;

      // ===== REFERENCES BOX =====
      currentY = drawSectionTitle('Referensi:', currentY);
      currentY += 8;

      ctx.fillStyle = '#333333';
      ctx.font = '9px Arial, sans-serif';
      ctx.textAlign = 'left';

      const sidebarReferences = [
        'Peta Jaringan Rute/Lyn Mikrolet Eksisting Kota Surabaya, ITS',
        'Peta GOBIS - Dishub Kota Surabaya',
        'Status Ekonomi Sosial (SES) Kota Surabaya - BPS'
      ];

      sidebarReferences.forEach((ref, idx) => {
        const maxWidth = sidebarWidth - 45;
        const words = ref.split(' ');
        let line = '';
        const refLines: string[] = [];

        words.forEach(word => {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);

          if (metrics.width > maxWidth) {
            if (line) {
              refLines.push(line.trim());
            }
            line = word + ' ';
          } else {
            line = testLine;
          }
        });

        if (line) {
          refLines.push(line.trim());
        }

        // Draw numbered references
        refLines.forEach((refLine, lineIdx) => {
          if (lineIdx === 0) {
            ctx.fillText(`${idx + 1}. ${refLine}`, sidebarContentX, currentY);
          } else {
            ctx.fillText(`   ${refLine}`, sidebarContentX, currentY);
          }
          currentY += 11;
        });

        if (idx < sidebarReferences.length - 1) {
          currentY += 4;
        }
      });

      if (includeAttribution) {
        currentY += 6;
        ctx.fillStyle = '#666666';
        ctx.font = '8px Arial, sans-serif';
        ctx.fillText('© OpenStreetMap contributors', sidebarContentX, currentY);
      }

      // Convert to appropriate format
      console.log('Converting canvas to image...');
      const imageFormat = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const quality = format === 'jpeg' ? 0.95 : undefined;

      let dataUrl = '';
      try {
        dataUrl = exportCanvas.toDataURL(imageFormat, quality);
        console.log('Canvas converted successfully, data URL length:', dataUrl.length);
      } catch (e) {
        console.error('Failed to convert canvas to data URL:', e);
        throw e;
      }

      if (format === 'png' || format === 'jpeg') {
        console.log('Initiating download for format:', format);
        const link = document.createElement('a');
        const filename = `${imageName.replace(/\s+/g, '_')}.${format}`;
        link.download = filename;
        link.href = dataUrl;

        // Append to body, click, then remove
        document.body.appendChild(link);
        console.log('Clicking download link for:', filename);
        link.click();
        document.body.removeChild(link);
        console.log('Download link clicked');
      } else if (format === 'pdf') {
        alert('PDF export requires additional library (jsPDF). Feature coming soon!');
      }

      // Cleanup: Remove index map
      try {
        indexMap.remove();
        document.body.removeChild(indexMapContainer);
        console.log('Index map cleaned up');
      } catch (e) {
        console.warn('Could not cleanup index map:', e);
      }

      console.log('Export completed successfully');
      alert('Map exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export map: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private changeBasemap(type: string) {
    const basemapUrls: Record<string, string[]> = {
      osm: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      'arcgis-street': ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
      'arcgis-imagery': ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      'arcgis-topo': ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}']
    };

    const source = this.map.getSource('osm') as any;
    if (source) {
      source.tiles = basemapUrls[type];
      this.map.style.sourceCaches['osm'].clearTiles();
      this.map.style.sourceCaches['osm'].update(this.map.transform);
      this.map.triggerRepaint();
    }
  }

  private async loadDefaultLayers() {
    try {
      // Try to load all layers (default + user's), fallback to default only
      let response;
      try {
        response = await this.apiRequest('/layers/all/list');
      } catch (error) {
        console.warn('Failed to load all layers, falling back to default layers');
        response = await this.apiRequest('/layers/default');
      }

      const layers = response.layers || response || [];

      const layersList = document.getElementById('layers-list')!;
      layersList.innerHTML = '';

      if (layers.length === 0) {
        layersList.innerHTML = '<div class="empty-state">No layers available</div>';
        return;
      }

      // Group layers into default and user
      const defaultLayers = layers.filter((l: Layer) => l.is_default);
      const userLayers = layers.filter((l: Layer) => !l.is_default);

      // Render default layers group
      if (defaultLayers.length > 0) {
        this.createLayerGroup(layersList, 'DEFAULT LAYERS', defaultLayers, 'default-layers-group');
      }

      // Render user layers group
      if (userLayers.length > 0) {
        this.createLayerGroup(layersList, 'MY LAYERS', userLayers, 'my-layers-group');
      }

      // Pass layers to analysis panel
      if (this.analysisPanel) {
        this.analysisPanel.setLayers(layers.map((l: Layer) => ({ id: l.id, name: l.name })));
      }
    } catch (error) {
      console.error('Failed to load layers:', error);
      document.getElementById('layers-list')!.innerHTML =
        '<div class="empty-state">Failed to load layers</div>';
    }
  }

  /**
   * Create a collapsible layer group with drag-and-drop support
   */
  private createLayerGroup(container: HTMLElement, title: string, layers: Layer[], groupId: string) {
    // Group wrapper
    const groupWrapper = document.createElement('div');
    groupWrapper.className = 'layer-group';
    groupWrapper.style.cssText = 'margin-top: 15px; border: 1px solid #ecf0f1; border-radius: 4px; overflow: hidden;';

    // Group header (clickable to collapse/expand)
    const groupHeader = document.createElement('div');
    groupHeader.className = 'layer-group-header';
    groupHeader.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #f8f9fa;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;
    `;
    groupHeader.addEventListener('mouseenter', () => {
      groupHeader.style.background = '#e9ecef';
    });
    groupHeader.addEventListener('mouseleave', () => {
      groupHeader.style.background = '#f8f9fa';
    });

    // Title and collapse icon
    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const collapseIcon = document.createElement('span');
    collapseIcon.innerHTML = '▼';
    collapseIcon.style.cssText = 'font-size: 10px; transition: transform 0.2s; color: #666;';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    titleSpan.style.cssText = 'font-weight: 600; color: #2c3e50; font-size: 12px;';

    const countBadge = document.createElement('span');
    countBadge.textContent = `(${layers.length})`;
    countBadge.style.cssText = 'color: #95a5a6; font-size: 11px; margin-left: 4px;';

    headerLeft.appendChild(collapseIcon);
    headerLeft.appendChild(titleSpan);
    headerLeft.appendChild(countBadge);
    groupHeader.appendChild(headerLeft);

    // Group content (collapsible)
    const groupContent = document.createElement('div');
    groupContent.className = 'layer-group-content';
    groupContent.id = groupId;
    groupContent.style.cssText = 'background: white; transition: max-height 0.3s ease, opacity 0.3s ease; max-height: 400px;';

    // Toggle collapse on header click
    let isCollapsed = false;
    groupHeader.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      if (isCollapsed) {
        groupContent.style.maxHeight = '0';
        groupContent.style.opacity = '0';
        groupContent.style.overflow = 'hidden';
        collapseIcon.style.transform = 'rotate(-90deg)';
      } else {
        groupContent.style.maxHeight = '1000px';
        groupContent.style.opacity = '1';
        groupContent.style.overflow = 'auto';
        collapseIcon.style.transform = 'rotate(0deg)';
      }
      // Save collapse state
      localStorage.setItem(`group-${groupId}-collapsed`, String(isCollapsed));
    });

    // Restore collapse state
    const savedState = localStorage.getItem(`group-${groupId}-collapsed`);
    if (savedState === 'true') {
      isCollapsed = true;
      groupContent.style.maxHeight = '0';
      groupContent.style.opacity = '0';
      groupContent.style.overflow = 'hidden';
      collapseIcon.style.transform = 'rotate(-90deg)';
    }

    // Add layers to group
    layers.forEach((layer, index) => {
      this.createLayerCheckbox(groupContent, layer, index, layers.length);
    });

    groupWrapper.appendChild(groupHeader);
    groupWrapper.appendChild(groupContent);
    container.appendChild(groupWrapper);
  }

  private createLayerCheckbox(container: HTMLElement, layer: Layer, index?: number, total?: number) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 0;';

    const label = document.createElement('label');
    label.style.cssText = 'display: flex; align-items: center; cursor: pointer; flex: 1; font-size: 14px; color: #333;';
    label.innerHTML = `
      <input type="checkbox" value="${layer.id}" data-layer-name="${layer.name}" style="margin-right: 8px; cursor: pointer;">
      <span>${layer.name}</span>
    `;

    const checkbox = label.querySelector('input') as HTMLInputElement;
    checkbox.addEventListener('change', async () => {
      if (checkbox.checked) {
        await this.addLayerToMap(layer);
      } else {
        this.removeLayerFromMap(layer.id);
      }
    });

    wrapper.appendChild(label);

    // Add controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = 'display: flex; align-items: center; gap: 4px;';

    // Add positioning controls if index and total are provided
    if (typeof index === 'number' && typeof total === 'number') {
      // Move up button
      if (index > 0) {
        const upBtn = document.createElement('button');
        upBtn.innerHTML = '▲';
        upBtn.title = 'Move layer up';
        upBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; font-size: 12px; padding: 4px 6px; opacity: 0.5; transition: opacity 0.2s; color: #3498db;';
        upBtn.addEventListener('mouseover', () => upBtn.style.opacity = '1');
        upBtn.addEventListener('mouseout', () => upBtn.style.opacity = '0.5');
        upBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.moveLayerInGroup(container, index, index - 1);
        });
        controlsContainer.appendChild(upBtn);
      }

      // Move down button
      if (index < total - 1) {
        const downBtn = document.createElement('button');
        downBtn.innerHTML = '▼';
        downBtn.title = 'Move layer down';
        downBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; font-size: 12px; padding: 4px 6px; opacity: 0.5; transition: opacity 0.2s; color: #3498db;';
        downBtn.addEventListener('mouseover', () => downBtn.style.opacity = '1');
        downBtn.addEventListener('mouseout', () => downBtn.style.opacity = '0.5');
        downBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.moveLayerInGroup(container, index, index + 1);
        });
        controlsContainer.appendChild(downBtn);
      }
    }

    // Add remove button for non-default layers
    if (!layer.is_default) {
      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '🗑️';
      removeBtn.title = 'Delete layer';
      removeBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; font-size: 16px; padding: 4px 8px; opacity: 0.6; transition: opacity 0.2s;';
      removeBtn.addEventListener('mouseover', () => removeBtn.style.opacity = '1');
      removeBtn.addEventListener('mouseout', () => removeBtn.style.opacity = '0.6');
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.deleteLayer(layer.id, layer.name);
      });
      controlsContainer.appendChild(removeBtn);
    }

    wrapper.appendChild(controlsContainer);
    container.appendChild(wrapper);
  }

  /**
   * Move a layer to a different position within its group
   */
  private moveLayerInGroup(container: HTMLElement, fromIndex: number, toIndex: number) {
    const children = Array.from(container.children);
    if (fromIndex >= children.length || toIndex >= children.length || toIndex < 0) return;

    const element = children[fromIndex];
    container.removeChild(element);

    if (toIndex >= children.length - 1) {
      container.appendChild(element);
    } else {
      container.insertBefore(element, children[toIndex]);
    }

    // Refresh the entire layer list to update indices
    this.loadDefaultLayers();
  }

  private async addLayerToMap(layer: Layer) {
    try {
      const geojson = await this.apiRequest(`/layers/${layer.id}/features`);
      const sourceId = `layer-${layer.id}`;
      const color = this.layerColors[this.activeLayers.size % this.layerColors.length];

      // Add source
      this.map.addSource(sourceId, {
        type: 'geojson',
        data: geojson
      });

      // Determine geometry type from first feature
      const geometryType = geojson.features?.[0]?.geometry?.type;

      // Try to apply custom style configuration
      let styleApplied = false;
      if (layer.style_config) {
        styleApplied = LayerStyleParser.applyStyle(
          this.map,
          layer.id,
          sourceId,
          layer.style_config
        );
      }

      // Fallback to generic style if no custom style was applied
      if (!styleApplied) {
        LayerStyleParser.applyGenericStyle(
          this.map,
          layer.id,
          sourceId,
          geometryType,
          color
        );
      }

      this.activeLayers.set(layer.id, color);
      this.layerMetadata.set(layer.id, layer); // Store full layer info
      this.updateLegend();

      // Setup popup for this layer
      this.setupLayerPopup(layer.id, geometryType);

    } catch (error) {
      console.error('Failed to add layer:', error);
      alert('Failed to load layer data');
    }
  }

  /**
   * Setup interactive popup for a layer
   */
  private setupLayerPopup(layerId: number, geometryType: string) {
    // Determine which layer IDs to attach popups to
    const interactiveLayers: string[] = [];

    switch (geometryType) {
      case 'Point':
      case 'MultiPoint':
        interactiveLayers.push(`layer-${layerId}-point`);
        break;
      case 'LineString':
      case 'MultiLineString':
        interactiveLayers.push(`layer-${layerId}-line`);
        break;
      case 'Polygon':
      case 'MultiPolygon':
        interactiveLayers.push(`layer-${layerId}-fill`);
        break;
      default:
        interactiveLayers.push(`layer-${layerId}-line`);
    }

    // Add click handler for each interactive layer
    interactiveLayers.forEach(layerIdStr => {
      // Change cursor on hover
      this.map.on('mouseenter', layerIdStr, () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });

      this.map.on('mouseleave', layerIdStr, () => {
        this.map.getCanvas().style.cursor = '';
      });

      // Show popup on click
      this.map.on('click', layerIdStr, (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const properties = feature.properties || {};
        const coordinates = e.lngLat;

        // Build popup HTML content
        let popupContent = '<div style="font-family: sans-serif; max-width: 300px;">';
        popupContent += '<h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #2c3e50;">Feature Properties</h3>';

        if (Object.keys(properties).length === 0) {
          popupContent += '<p style="color: #7f8c8d; font-size: 12px; margin: 0;">No properties available</p>';
        } else {
          popupContent += '<table style="width: 100%; font-size: 12px; border-collapse: collapse;">';

          // Sort properties alphabetically
          const sortedKeys = Object.keys(properties).sort();

          sortedKeys.forEach(key => {
            const value = properties[key];
            // Skip null/undefined values and internal properties
            if (value === null || value === undefined || key.startsWith('_')) return;

            // Format value
            let displayValue = value;
            if (typeof value === 'number') {
              displayValue = value.toFixed(2);
            } else if (typeof value === 'boolean') {
              displayValue = value ? '✓' : '✗';
            } else if (typeof value === 'string' && value.length > 50) {
              displayValue = value.substring(0, 47) + '...';
            }

            popupContent += `
              <tr style="border-bottom: 1px solid #ecf0f1;">
                <td style="padding: 6px 8px 6px 0; font-weight: 600; color: #34495e;">${key}:</td>
                <td style="padding: 6px 0 6px 8px; color: #7f8c8d;">${displayValue}</td>
              </tr>
            `;
          });

          popupContent += '</table>';
        }

        // Add coordinates
        popupContent += `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ecf0f1; font-size: 11px; color: #95a5a6;">
            <strong>Coordinates:</strong><br/>
            Lat: ${coordinates.lat.toFixed(6)}<br/>
            Lng: ${coordinates.lng.toFixed(6)}
          </div>
        `;

        popupContent += '</div>';

        // Create and display popup
        new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: '400px'
        })
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(this.map);
      });
    });
  }

  /**
   * Setup popups for drawing features
   */
  private setupDrawingPopups() {
    const drawingLayers = ['drawings-point', 'drawings-line', 'drawings-fill'];

    drawingLayers.forEach(layerId => {
      // Change cursor on hover
      this.map.on('mouseenter', layerId, () => {
        if (this.activeTool !== 'edit-features') {
          this.map.getCanvas().style.cursor = 'pointer';
        }
      });

      this.map.on('mouseleave', layerId, () => {
        if (this.activeTool !== 'edit-features') {
          this.map.getCanvas().style.cursor = '';
        }
      });

      // Show popup on click (only when not in edit mode)
      this.map.on('click', layerId, (e) => {
        if (this.activeTool === 'edit-features') return; // Don't show popup in edit mode

        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const geometryType = feature.geometry?.type;
        const coordinates = e.lngLat;

        // Build popup content
        let popupContent = '<div style="font-family: sans-serif; max-width: 300px;">';
        popupContent += '<h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #088;">Drawing Feature</h3>';

        popupContent += '<table style="width: 100%; font-size: 12px; border-collapse: collapse;">';
        popupContent += `
          <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 6px 8px 6px 0; font-weight: 600; color: #34495e;">Type:</td>
            <td style="padding: 6px 0 6px 8px; color: #7f8c8d;">${geometryType}</td>
          </tr>
        `;

        // Calculate and display length/area if applicable
        if (geometryType === 'LineString' && feature.geometry?.coordinates) {
          const coords = feature.geometry.coordinates as number[][];
          const length = this.calculateDistance(coords);
          popupContent += `
            <tr style="border-bottom: 1px solid #ecf0f1;">
              <td style="padding: 6px 8px 6px 0; font-weight: 600; color: #34495e;">Length:</td>
              <td style="padding: 6px 0 6px 8px; color: #7f8c8d;">${length.toFixed(2)} km</td>
            </tr>
          `;
        }

        popupContent += '</table>';

        // Add coordinates
        popupContent += `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ecf0f1; font-size: 11px; color: #95a5a6;">
            <strong>Click location:</strong><br/>
            Lat: ${coordinates.lat.toFixed(6)}<br/>
            Lng: ${coordinates.lng.toFixed(6)}
          </div>
        `;

        // Add tip for editing
        popupContent += `
          <div style="margin-top: 8px; padding: 8px; background: #ecf0f1; border-radius: 4px; font-size: 11px; color: #7f8c8d;">
            💡 <strong>Tip:</strong> Use the "✏️ Edit Features" tool to delete this feature
          </div>
        `;

        popupContent += '</div>';

        // Create and display popup
        new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: '400px'
        })
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(this.map);
      });
    });
  }

  private removeLayerFromMap(layerId: number) {
    const sourceId = `layer-${layerId}`;

    // Remove all possible layer types for this source
    const layerIds = [
      `layer-${layerId}-point`,
      `layer-${layerId}-line`,
      `layer-${layerId}-fill`,
      `layer-${layerId}-stroke`,
      `layer-${layerId}-outline`  // Added for result layers
    ];

    layerIds.forEach(layerId => {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    // Remove source
    if (this.map.getSource(sourceId)) {
      this.map.removeSource(sourceId);
    }

    this.activeLayers.delete(layerId);
    this.layerMetadata.delete(layerId); // Clean up metadata
    this.updateLegend();
  }

  private updateLegend() {
    const legendEl = document.getElementById('legend')!;

    if (this.activeLayers.size === 0) {
      legendEl.innerHTML = '<div class="empty-state">No active layers</div>';
      return;
    }

    let html = '';
    this.activeLayers.forEach((color, layerId) => {
      const layer = this.layerMetadata.get(layerId);
      if (layer) {
        html += LegendGenerator.generateLegend(layer.name, layer.style_config, color);
      }
    });

    legendEl.innerHTML = html;
  }

  private async deleteLayer(layerId: number, layerName: string) {
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete layer "${layerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Remove from map if currently active
      if (this.activeLayers.has(layerId)) {
        this.removeLayerFromMap(layerId);
      }

      // Delete from server
      await this.apiRequest(`/layers/${layerId}`, 'DELETE');

      // Reload layers list
      await this.loadDefaultLayers();

      // Show success message
      alert(`Layer "${layerName}" deleted successfully`);
    } catch (error) {
      console.error('Failed to delete layer:', error);
      alert(`Failed to delete layer "${layerName}". ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      const geojson = JSON.parse(text);

      if (!geojson.type || !geojson.features) {
        alert('Invalid GeoJSON file');
        return;
      }

      const layerName = prompt('Enter layer name:', file.name.replace('.geojson', '').replace('.json', ''));
      if (!layerName) return;

      const description = prompt('Enter description (optional):', '') || '';

      await this.apiRequest('/layers/upload', 'POST', {
        name: layerName,
        description,
        geojson
      });

      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'success-msg';
      successMsg.textContent = 'Layer uploaded successfully!';
      document.querySelector('.sidebar-footer')!.prepend(successMsg);
      setTimeout(() => successMsg.remove(), 3000);

      // Reload layers
      await this.loadDefaultLayers();

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload layer');
    }

    input.value = '';
  }

  private async apiRequest(endpoint: string, method = 'GET', body?: any) {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  /**
   * Enable Geolocation mode - clicking on map shows coordinate popup
   */
  private enableGeolocationMode(): void {
    this.geolocationMode = true;
    this.map.getCanvas().style.cursor = 'crosshair';

    // Show notification
    const notification = document.createElement('div');
    notification.id = 'geolocation-notification';
    notification.style.cssText = `
      position: absolute;
      top: 80px;
      left: 270px;
      background: #3498db;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 1000;
      font-size: 14px;
    `;
    notification.innerHTML = `
      <strong>📍 Geolocation Mode Active</strong><br>
      <span style="font-size: 12px;">Click anywhere on the map to see coordinates and location information</span>
    `;
    document.body.appendChild(notification);

    // Add click handler
    this.map.on('click', this.handleGeolocationClick);
  }

  /**
   * Disable Geolocation mode
   */
  private disableGeolocationMode(): void {
    if (!this.geolocationMode) return;

    this.geolocationMode = false;
    this.map.getCanvas().style.cursor = '';

    // Remove notification
    const notification = document.getElementById('geolocation-notification');
    if (notification) notification.remove();

    // Remove click handler
    this.map.off('click', this.handleGeolocationClick);
  }

  /**
   * Handle map click in geolocation mode
   */
  private handleGeolocationClick = (e: maplibregl.MapMouseEvent) => {
    if (!this.geolocationMode) return;

    const { lng, lat } = e.lngLat;

    // Create popup with comprehensive location info
    const popupContent = `
      <div style="font-family: sans-serif; min-width: 250px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px;">
          📍 Location Information
        </h3>

        <div style="font-size: 13px; line-height: 1.8;">
          <div style="margin-bottom: 12px;">
            <strong style="color: #34495e;">Coordinates (DD):</strong><br>
            <span style="color: #7f8c8d; font-family: monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 3px; display: inline-block; margin-top: 4px;">
              Lat: ${lat.toFixed(6)}°<br>
              Lon: ${lng.toFixed(6)}°
            </span>
          </div>

          <div style="margin-bottom: 12px;">
            <strong style="color: #34495e;">Coordinates (DMS):</strong><br>
            <span style="color: #7f8c8d; font-size: 12px;">
              Lat: ${this.convertToDMS(lat, 'lat')}<br>
              Lon: ${this.convertToDMS(lng, 'lon')}
            </span>
          </div>

          <div style="margin-bottom: 12px;">
            <strong style="color: #34495e;">Zoom Level:</strong>
            <span style="color: #7f8c8d;">${this.map.getZoom().toFixed(2)}</span>
          </div>

          <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #ecf0f1;">
            <button onclick="navigator.clipboard.writeText('${lat.toFixed(6)}, ${lng.toFixed(6)}')"
              style="
                width: 100%;
                padding: 8px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
              "
              onmouseover="this.style.background='#2980b9'"
              onmouseout="this.style.background='#3498db'"
            >
              📋 Copy Coordinates
            </button>
          </div>
        </div>
      </div>
    `;

    new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '350px'
    })
      .setLngLat(e.lngLat)
      .setHTML(popupContent)
      .addTo(this.map);
  };

  /**
   * Convert decimal degrees to DMS (Degrees Minutes Seconds)
   */
  private convertToDMS(decimal: number, type: 'lat' | 'lon'): string {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesDecimal = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);

    const direction = type === 'lat'
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W');

    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
  }
}

// Initialize dashboard
new Dashboard();