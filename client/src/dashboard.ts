import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AnalysisPanel } from './components/analysis-panel';

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
}

// API Configuration
const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api';

class Dashboard {
  private map!: maplibregl.Map;
  private authToken: string | null = null;
  private currentUser: User | null = null;
  private activeLayers: Map<number, string> = new Map();
  private layerColors: string[] = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
  private analysisPanel: AnalysisPanel | null = null;
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
      center: [106.8456, -6.2088], // Jakarta, Indonesia
      zoom: 5
    });

    // Add controls
    this.map.addControl(new maplibregl.NavigationControl(), 'top-left');
    this.map.addControl(new maplibregl.ScaleControl(), 'bottom-right');
    this.map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-left');
  }

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
        if (page === 'spatial-analysis' && this.analysisPanel) {
          this.analysisPanel.show();
        } else if (this.analysisPanel) {
          this.analysisPanel.hide();
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
  }

  private initCollapsibleSidebars() {
    // Left sidebar toggle
    const leftSidebar = document.getElementById('left-sidebar')!;
    const toggleLeftBtn = document.getElementById('toggle-left-sidebar')!;

    toggleLeftBtn.addEventListener('click', () => {
      this.leftSidebarCollapsed = !this.leftSidebarCollapsed;
      leftSidebar.classList.toggle('collapsed', this.leftSidebarCollapsed);
      this.saveSidebarState();

      // Update button icon
      const icon = toggleLeftBtn.querySelector('.icon')!;
      icon.textContent = this.leftSidebarCollapsed ? '▶' : '◀';
    });

    // Right panel toggle
    const rightPanel = document.getElementById('right-panel')!;
    const toggleRightBtn = document.getElementById('toggle-right-panel')!;

    toggleRightBtn.addEventListener('click', () => {
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

    // Map export
    document.getElementById('export-map-btn')!.addEventListener('click', () => {
      this.exportMap();
    });

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

        // Auto-load the new layer to map
        await this.addLayerToMap(response.layer.id, response.layer.name);
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
    const title = (document.getElementById('export-title') as HTMLInputElement).value || 'Map Export';
    const format = (document.getElementById('export-format') as HTMLSelectElement).value;
    const dpi = parseInt((document.getElementById('export-resolution') as HTMLSelectElement).value);
    const includeLegend = (document.getElementById('export-legend') as HTMLInputElement).checked;
    const includeScale = (document.getElementById('export-scale') as HTMLInputElement).checked;
    const includeAttribution = (document.getElementById('export-attribution') as HTMLInputElement).checked;

    try {
      // Get map canvas
      const canvas = this.map.getCanvas();
      const dataUrl = canvas.toDataURL('image/png');

      if (format === 'png' || format === 'jpeg') {
        // Simple image export
        const link = document.createElement('a');
        link.download = `${title.replace(/\s+/g, '_')}.${format}`;
        link.href = dataUrl;
        link.click();
      } else if (format === 'pdf') {
        alert('PDF export requires additional library (jsPDF). Feature coming soon!');
      }

      alert('Map exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export map. Please try again.');
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
    groupContent.style.cssText = 'background: white; transition: max-height 0.3s ease, opacity 0.3s ease;';

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
        groupContent.style.overflow = 'visible';
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
        await this.addLayerToMap(layer.id, layer.name);
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

  private async addLayerToMap(layerId: number, _layerName: string) {
    try {
      const geojson = await this.apiRequest(`/layers/${layerId}/features`);
      const sourceId = `layer-${layerId}`;
      const color = this.layerColors[this.activeLayers.size % this.layerColors.length];

      // Add source
      this.map.addSource(sourceId, {
        type: 'geojson',
        data: geojson
      });

      // Determine geometry type from first feature
      const geometryType = geojson.features?.[0]?.geometry?.type;

      // Add layer(s) based on geometry type
      switch (geometryType) {
        case 'Point':
        case 'MultiPoint':
          this.map.addLayer({
            id: `layer-${layerId}-point`,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': 6,
              'circle-color': color,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff'
            }
          });
          break;

        case 'LineString':
        case 'MultiLineString':
          this.map.addLayer({
            id: `layer-${layerId}-line`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color,
              'line-width': 2
            }
          });
          break;

        case 'Polygon':
        case 'MultiPolygon':
          // Add fill layer for polygon
          this.map.addLayer({
            id: `layer-${layerId}-fill`,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': color,
              'fill-opacity': 0.5
            }
          });
          // Add stroke layer for polygon borders
          this.map.addLayer({
            id: `layer-${layerId}-stroke`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color,
              'line-width': 2
            }
          });
          break;

        default:
          console.warn(`Unsupported geometry type: ${geometryType}`);
          // Fallback to line if unknown
          this.map.addLayer({
            id: `layer-${layerId}-line`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color,
              'line-width': 2
            }
          });
      }

      this.activeLayers.set(layerId, color);
      this.updateLegend();

      // Setup popup for this layer
      this.setupLayerPopup(layerId, geometryType);

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
    this.updateLegend();
  }

  private updateLegend() {
    const legendEl = document.getElementById('legend')!;
    
    if (this.activeLayers.size === 0) {
      legendEl.innerHTML = '<div class="empty-state">No active layers</div>';
      return;
    }

    legendEl.innerHTML = '';
    document.querySelectorAll('#layers-list input:checked').forEach(checkbox => {
      const input = checkbox as HTMLInputElement;
      const layerId = parseInt(input.value);
      const layerName = input.dataset.layerName || 'Unknown';
      const color = this.activeLayers.get(layerId);

      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `
        <div class="legend-color" style="background: ${color}"></div>
        <span>${layerName}</span>
      `;
      legendEl.appendChild(item);
    });
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
}

// Initialize dashboard
new Dashboard();