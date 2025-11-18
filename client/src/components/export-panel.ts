// Export Panel - Floating panel for map export functionality
export class ExportPanel {
  private panelElement: HTMLElement | null = null;
  private exportMapCallback: (() => void) | null = null;

  public render(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'export-panel';
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
      z-index: 1000;
      display: none;
    `;

    panel.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; font-size: 18px; color: #2c3e50; display: flex; align-items: center; gap: 8px;">
            <span>📥</span> Export Map
          </h3>
          <button id="export-panel-close" style="
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

        <div class="export-options" style="display: flex; flex-direction: column; gap: 15px;">
          <div class="export-group" style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 13px; font-weight: 500; color: #2c3e50;">Map Title:</label>
            <input type="text" id="export-title-input" placeholder="Enter map title" style="
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 13px;
              transition: border-color 0.2s;
            " onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
          </div>

          <div class="export-group" style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 13px; font-weight: 500; color: #2c3e50;">Format:</label>
            <select id="export-format-select" style="
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 13px;
              background: white;
              cursor: pointer;
            ">
              <option value="png">PNG Image</option>
              <option value="jpeg">JPEG Image</option>
              <option value="pdf">PDF Document</option>
            </select>
          </div>

          <div class="export-group" style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 13px; font-weight: 500; color: #2c3e50;">Resolution:</label>
            <select id="export-resolution-select" style="
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 13px;
              background: white;
              cursor: pointer;
            ">
              <option value="72">Screen (72 DPI)</option>
              <option value="150">Standard (150 DPI)</option>
              <option value="300" selected>High (300 DPI)</option>
            </select>
          </div>

          <div style="padding: 12px; background: #f8f9fa; border-radius: 6px;">
            <div style="font-size: 13px; font-weight: 500; color: #2c3e50; margin-bottom: 10px;">
              Include in Export:
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #34495e;">
                <input type="checkbox" id="export-legend-check" checked style="cursor: pointer;">
                <span>Legend</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #34495e;">
                <input type="checkbox" id="export-scale-check" checked style="cursor: pointer;">
                <span>Scale</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #34495e;">
                <input type="checkbox" id="export-attribution-check" checked style="cursor: pointer;">
                <span>Attribution</span>
              </label>
            </div>
          </div>

          <button id="export-execute-btn" style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 14px;
            background: #27ae60;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 500;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(39, 174, 96, 0.2);
          " onmouseover="this.style.background='#229954'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(39, 174, 96, 0.3)'" onmouseout="this.style.background='#27ae60'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(39, 174, 96, 0.2)'">
            <span>📥</span>
            <span>Export Map</span>
          </button>

          <div style="padding: 10px; background: #e8f4f8; border-left: 3px solid #3498db; border-radius: 4px; font-size: 12px; color: #34495e; line-height: 1.5;">
            <strong>Tip:</strong> The exported map will include grid lines, north arrow, scale bar, and all visible layers with proper styling.
          </div>
        </div>
      </div>
    `;

    this.panelElement = panel;
    this.attachEventListeners();

    return panel;
  }

  private attachEventListeners(): void {
    setTimeout(() => {
      document.getElementById('export-panel-close')?.addEventListener('click', () => this.hide());
      document.getElementById('export-execute-btn')?.addEventListener('click', () => this.executeExport());
    }, 100);
  }

  private executeExport(): void {
    // Get values from panel and update original export controls
    const title = (document.getElementById('export-title-input') as HTMLInputElement)?.value || 'Map Export';
    const format = (document.getElementById('export-format-select') as HTMLSelectElement)?.value || 'png';
    const resolution = (document.getElementById('export-resolution-select') as HTMLSelectElement)?.value || '300';
    const legend = (document.getElementById('export-legend-check') as HTMLInputElement)?.checked ?? true;
    const scale = (document.getElementById('export-scale-check') as HTMLInputElement)?.checked ?? true;
    const attribution = (document.getElementById('export-attribution-check') as HTMLInputElement)?.checked ?? true;

    // Update the original export form controls (in right panel)
    const originalTitle = document.getElementById('export-title') as HTMLInputElement;
    const originalFormat = document.getElementById('export-format') as HTMLSelectElement;
    const originalResolution = document.getElementById('export-resolution') as HTMLSelectElement;
    const originalLegend = document.getElementById('export-legend') as HTMLInputElement;
    const originalScale = document.getElementById('export-scale') as HTMLInputElement;
    const originalAttribution = document.getElementById('export-attribution') as HTMLInputElement;

    if (originalTitle) originalTitle.value = title;
    if (originalFormat) originalFormat.value = format;
    if (originalResolution) originalResolution.value = resolution;
    if (originalLegend) originalLegend.checked = legend;
    if (originalScale) originalScale.checked = scale;
    if (originalAttribution) originalAttribution.checked = attribution;

    // Trigger the existing export functionality
    if (this.exportMapCallback) {
      this.exportMapCallback();
    } else {
      // Fallback: Click the original export button
      const originalExportBtn = document.getElementById('export-map-btn');
      if (originalExportBtn) {
        originalExportBtn.click();
      }
    }
  }

  public setExportCallback(callback: () => void): void {
    this.exportMapCallback = callback;
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
  }
}
