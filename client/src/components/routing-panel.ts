// Routing Panel - UI for pgRouting functionality
import maplibregl from 'maplibre-gl';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api';

export class RoutingPanel {
  private map: maplibregl.Map;
  private authToken: string;
  private panelElement: HTMLElement | null = null;
  private startMarker: maplibregl.Marker | null = null;
  private endMarker: maplibregl.Marker | null = null;
  private startCoords: [number, number] | null = null;
  private endCoords: [number, number] | null = null;
  private clickMode: 'start' | 'end' | 'none' = 'none';

  constructor(authToken: string, map: maplibregl.Map) {
    this.authToken = authToken;
    this.map = map;
  }

  public render(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'routing-panel';
    panel.className = 'overlay-panel';
    panel.style.cssText = `
      position: absolute;
      top: 80px;
      left: 270px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 20px;
      width: 320px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      z-index: 1000;
      display: none;
    `;

    panel.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; font-size: 18px; color: #2c3e50; display: flex; align-items: center; gap: 8px;">
            <span>🛣️</span> Find Routes
          </h3>
          <button id="routing-panel-close" style="
            background: transparent;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #95a5a6;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
          " onmouseover="this.style.background='#ecf0f1'; this.style.color='#e74c3c'" onmouseout="this.style.background='transparent'; this.style.color='#95a5a6'">
            ✕
          </button>
        </div>

        <!-- Transport Mode Selection -->
        <div style="margin-bottom: 15px; padding: 12px; background: #e8f4f8; border-radius: 6px; border-left: 3px solid #3498db;">
          <label style="font-size: 13px; font-weight: 500; color: #2c3e50; margin-bottom: 8px; display: block;">
            🚗 Transport Mode:
          </label>
          <select id="transport-mode-select" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #bdc3c7;
            border-radius: 4px;
            font-size: 13px;
            background: white;
            cursor: pointer;
          ">
            <option value="car">🚗 Car (Normal Speed)</option>
            <option value="walk">🚶 Walk (~5 km/h)</option>
          </select>
        </div>

        <!-- Route Section -->
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
          <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #34495e;">Calculate Route</h4>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button id="route-start-btn" class="route-btn" style="
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 14px;
              background: #27ae60;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
              transition: all 0.2s;
            ">
              <span>📍</span> Set Start Point
            </button>

            <button id="route-end-btn" class="route-btn" style="
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 14px;
              background: #e74c3c;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
              transition: all 0.2s;
            ">
              <span>🎯</span> Set End Point
            </button>

            <button id="route-calculate-btn" class="route-btn" style="
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 12px 14px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s;
            ">
              <span>🧭</span> Calculate Route
            </button>
          </div>

          <!-- Route Info -->
          <div id="route-info" style="
            display: none;
            margin-top: 12px;
            padding: 12px;
            background: white;
            border-radius: 4px;
            border-left: 3px solid #3498db;
          ">
            <div style="font-size: 12px; color: #7f8c8d; margin-bottom: 6px;">Route Details:</div>
            <div style="font-size: 13px; color: #2c3e50; line-height: 1.6;">
              <strong>Distance:</strong> <span id="route-distance">-</span><br>
              <strong>Time:</strong> <span id="route-time">-</span>
            </div>
          </div>
        </div>

        <!-- Isochrone Section -->
        <div style="margin-bottom: 15px; padding: 15px; background: #fff3e0; border-radius: 6px;">
          <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #34495e;">Isochrone Analysis</h4>

          <div style="margin-bottom: 10px;">
            <label style="display: block; font-size: 12px; color: #7f8c8d; margin-bottom: 6px;">
              Travel Time:
            </label>
            <select id="isochrone-time" style="
              width: 100%;
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 13px;
            ">
              <option value="300">5 minutes</option>
              <option value="600">10 minutes</option>
              <option value="900" selected>15 minutes</option>
              <option value="1800">30 minutes</option>
            </select>
          </div>

          <button id="isochrone-btn" class="route-btn" style="
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 14px;
            background: #f39c12;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
          ">
            <span>⏱️</span> Show Isochrone
          </button>
        </div>

        <!-- Clear Button -->
        <button id="route-clear-btn" class="route-btn" style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px;
          background: #95a5a6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        ">
          <span>🗑️</span> Clear All
        </button>
      </div>
    `;

    // Add hover effects via CSS
    const style = document.createElement('style');
    style.textContent = `
      .route-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      .route-btn:active {
        transform: translateY(0);
      }
      .route-btn.active {
        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
      }
    `;
    document.head.appendChild(style);

    this.panelElement = panel;
    this.attachEventListeners();
    this.initializeMapInteractions();

    return panel;
  }

  private attachEventListeners(): void {
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      document.getElementById('routing-panel-close')?.addEventListener('click', () => this.hide());
      document.getElementById('route-start-btn')?.addEventListener('click', () => this.setStartMode());
      document.getElementById('route-end-btn')?.addEventListener('click', () => this.setEndMode());
      document.getElementById('route-calculate-btn')?.addEventListener('click', () => this.calculateRoute());
      document.getElementById('isochrone-btn')?.addEventListener('click', () => this.calculateIsochrone());
      document.getElementById('route-clear-btn')?.addEventListener('click', () => this.clear());
    }, 100);
  }

  private mapClickHandler = (e: maplibregl.MapMouseEvent) => {
    if (this.clickMode === 'start') {
      this.setStart(e.lngLat.lng, e.lngLat.lat);
      this.clickMode = 'end';
      this.updateButtonStates();
    } else if (this.clickMode === 'end') {
      this.setEnd(e.lngLat.lng, e.lngLat.lat);
      this.clickMode = 'none';
      this.updateButtonStates();
    }
  };

  private initializeMapInteractions(): void {
    // Add map click handler
    this.map.on('click', this.mapClickHandler);
  }

  private setStartMode(): void {
    this.clickMode = 'start';
    this.map.getCanvas().style.cursor = 'crosshair';
    this.updateButtonStates();
    this.showNotification('Click on the map to set start point', 'info');
  }

  private setEndMode(): void {
    this.clickMode = 'end';
    this.map.getCanvas().style.cursor = 'crosshair';
    this.updateButtonStates();
    this.showNotification('Click on the map to set end point', 'info');
  }

  private updateButtonStates(): void {
    const startBtn = document.getElementById('route-start-btn');
    const endBtn = document.getElementById('route-end-btn');

    startBtn?.classList.toggle('active', this.clickMode === 'start');
    endBtn?.classList.toggle('active', this.clickMode === 'end');

    if (this.clickMode === 'none') {
      this.map.getCanvas().style.cursor = '';
    }
  }

  private setStart(lon: number, lat: number): void {
    this.startCoords = [lon, lat];
    if (this.startMarker) this.startMarker.remove();

    const el = document.createElement('div');
    el.style.cssText = 'background: #27ae60; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);';

    this.startMarker = new maplibregl.Marker({ element: el })
      .setLngLat([lon, lat])
      .setPopup(new maplibregl.Popup({ offset: 25 })
        .setHTML(`<strong>Start Point</strong><br>Lat: ${lat.toFixed(5)}<br>Lon: ${lon.toFixed(5)}`))
      .addTo(this.map);
  }

  private setEnd(lon: number, lat: number): void {
    this.endCoords = [lon, lat];
    if (this.endMarker) this.endMarker.remove();

    const el = document.createElement('div');
    el.style.cssText = 'background: #e74c3c; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);';

    this.endMarker = new maplibregl.Marker({ element: el })
      .setLngLat([lon, lat])
      .setPopup(new maplibregl.Popup({ offset: 25 })
        .setHTML(`<strong>End Point</strong><br>Lat: ${lat.toFixed(5)}<br>Lon: ${lon.toFixed(5)}`))
      .addTo(this.map);
  }

  private async calculateRoute(): Promise<void> {
    if (!this.startCoords || !this.endCoords) {
      this.showNotification('Please select both start and end points', 'error');
      return;
    }

    const transportMode = (document.getElementById('transport-mode-select') as HTMLSelectElement)?.value || 'car';
    this.showNotification(`Calculating route (${transportMode})...`, 'info');

    try {
      const response = await fetch(`${API_URL}/routing/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          startLon: this.startCoords[0],
          startLat: this.startCoords[1],
          endLon: this.endCoords[0],
          endLat: this.endCoords[1],
          mode: transportMode
        })
      });

      if (!response.ok) {
        throw new Error('Route calculation failed');
      }

      const data = await response.json();

      // Remove existing route if any
      if (this.map.getLayer('route-line')) {
        this.map.removeLayer('route-line');
        this.map.removeSource('route');
      }

      // Add route to map
      this.map.addSource('route', {
        type: 'geojson',
        data: data.route
      });

      this.map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#3498db',
          'line-width': 5,
          'line-opacity': 0.8
        }
      });

      // Show route info
      const infoDiv = document.getElementById('route-info');
      if (infoDiv) {
        infoDiv.style.display = 'block';
        document.getElementById('route-distance')!.textContent = `${(data.distance / 1000).toFixed(2)} km`;
        document.getElementById('route-time')!.textContent = `${Math.round(data.time / 60)} minutes`;
      }

      // Fit map to route bounds
      const bounds = new maplibregl.LngLatBounds();
      data.route.features.forEach((feature: any) => {
        const coords = feature.geometry.coordinates;
        coords.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
      });
      this.map.fitBounds(bounds, { padding: 50 });

      this.showNotification('Route calculated successfully!', 'success');
    } catch (error) {
      console.error('Route calculation failed:', error);
      this.showNotification('Failed to calculate route. No path found or network error.', 'error');
    }
  }

  private async calculateIsochrone(): Promise<void> {
    if (!this.startCoords) {
      this.showNotification('Please select a start point first', 'error');
      return;
    }

    const timeSelect = document.getElementById('isochrone-time') as HTMLSelectElement;
    const time = parseInt(timeSelect.value);
    const transportMode = (document.getElementById('transport-mode-select') as HTMLSelectElement)?.value || 'car';

    this.showNotification(`Calculating ${time / 60}-minute isochrone (${transportMode})...`, 'info');

    try {
      const response = await fetch(`${API_URL}/routing/isochrone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          lon: this.startCoords[0],
          lat: this.startCoords[1],
          time,
          mode: transportMode
        })
      });

      if (!response.ok) {
        throw new Error('Isochrone calculation failed');
      }

      const data = await response.json();

      // Remove existing isochrone layers
      const existingLayers = this.map.getStyle().layers?.filter(l => l.id.startsWith('isochrone-')) || [];
      existingLayers.forEach(layer => {
        if (this.map.getLayer(layer.id)) {
          this.map.removeLayer(layer.id);
        }
      });
      if (this.map.getSource('isochrones')) {
        this.map.removeSource('isochrones');
      }

      // Add isochrone source
      this.map.addSource('isochrones', {
        type: 'geojson',
        data
      });

      // Add layers for each time interval
      data.features.forEach((feature: any, idx: number) => {
        const timeMinutes = feature.properties.time_minutes;
        const fillColor = feature.properties.fill_color;

        this.map.addLayer({
          id: `isochrone-fill-${idx}`,
          type: 'fill',
          source: 'isochrones',
          filter: ['==', 'time_minutes', timeMinutes],
          paint: {
            'fill-color': fillColor,
            'fill-opacity': 0.4
          }
        });

        this.map.addLayer({
          id: `isochrone-outline-${idx}`,
          type: 'line',
          source: 'isochrones',
          filter: ['==', 'time_minutes', timeMinutes],
          paint: {
            'line-color': fillColor,
            'line-width': 2,
            'line-opacity': 0.8
          }
        });
      });

      this.showNotification('Isochrone calculated successfully!', 'success');
    } catch (error) {
      console.error('Isochrone calculation failed:', error);
      this.showNotification('Failed to calculate isochrone. Network error or no data.', 'error');
    }
  }

  private clear(): void {
    // Remove markers
    if (this.startMarker) this.startMarker.remove();
    if (this.endMarker) this.endMarker.remove();
    this.startCoords = null;
    this.endCoords = null;
    this.clickMode = 'none';
    this.updateButtonStates();

    // Remove route
    if (this.map.getLayer('route-line')) {
      this.map.removeLayer('route-line');
      this.map.removeSource('route');
    }

    // Remove isochrones
    const existingLayers = this.map.getStyle().layers?.filter(l => l.id.startsWith('isochrone-')) || [];
    existingLayers.forEach(layer => {
      if (this.map.getLayer(layer.id)) {
        this.map.removeLayer(layer.id);
      }
    });
    if (this.map.getSource('isochrones')) {
      this.map.removeSource('isochrones');
    }

    // Hide route info
    const infoDiv = document.getElementById('route-info');
    if (infoDiv) infoDiv.style.display = 'none';

    this.showNotification('All routes and markers cleared', 'info');
  }

  private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
    const colors = {
      info: '#3498db',
      success: '#27ae60',
      error: '#e74c3c'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  public show(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'block';
    }
  }

  public hide(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
    }
    // Reset click mode and cursor
    this.clickMode = 'none';
    this.map.getCanvas().style.cursor = '';
    this.updateButtonStates();
  }

  public destroy(): void {
    // Clean up map click handler
    this.map.off('click', this.mapClickHandler);
    this.clear();
    if (this.panelElement) {
      this.panelElement.remove();
    }
  }
}
