import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
    this.initEventListeners();
    await this.loadDefaultLayers();
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

      // Render default layers
      if (defaultLayers.length > 0) {
        const defaultHeader = document.createElement('div');
        defaultHeader.style.cssText = 'padding: 10px 0; font-weight: 600; color: #666; font-size: 12px; margin-top: 10px; margin-bottom: 5px;';
        defaultHeader.textContent = 'DEFAULT LAYERS';
        layersList.appendChild(defaultHeader);

        defaultLayers.forEach((layer: Layer) => {
          this.createLayerCheckbox(layersList, layer);
        });
      }

      // Render user layers
      if (userLayers.length > 0) {
        const userHeader = document.createElement('div');
        userHeader.style.cssText = 'padding: 10px 0; font-weight: 600; color: #666; font-size: 12px; margin-top: 15px; margin-bottom: 5px;';
        userHeader.textContent = 'MY LAYERS';
        layersList.appendChild(userHeader);

        userLayers.forEach((layer: Layer) => {
          this.createLayerCheckbox(layersList, layer);
        });
      }
    } catch (error) {
      console.error('Failed to load layers:', error);
      document.getElementById('layers-list')!.innerHTML =
        '<div class="empty-state">Failed to load layers</div>';
    }
  }

  private createLayerCheckbox(container: HTMLElement, layer: Layer) {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" value="${layer.id}" data-layer-name="${layer.name}">
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

    container.appendChild(label);
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

    } catch (error) {
      console.error('Failed to add layer:', error);
      alert('Failed to load layer data');
    }
  }

  private removeLayerFromMap(layerId: number) {
    const sourceId = `layer-${layerId}`;

    // Remove all possible layer types for this source
    const layerIds = [
      `layer-${layerId}-point`,
      `layer-${layerId}-line`,
      `layer-${layerId}-fill`,
      `layer-${layerId}-stroke`
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