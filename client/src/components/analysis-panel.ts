// Complete Spatial Analysis Panel - All 4 Analysis Types + Result Visualization
import AnalysisService, { AnalysisJob } from '../services/analysis.service';

interface Layer {
  id: number;
  name: string;
}

export class AnalysisPanel {
  private service: AnalysisService;
  private layers: Layer[] = [];
  private panelElement: HTMLElement | null = null;
  private activeTab: string = 'buffer';
  private activeJobs: Map<string, number> = new Map();
  private onResultCreated?: (layerId: number) => void;

  constructor(authToken: string) {
    this.service = new AnalysisService(authToken);
  }

  /**
   * Set callback for when result layer is created
   */
  setOnResultCreated(callback: (layerId: number) => void) {
    this.onResultCreated = callback;
  }

  /**
   * Set available layers for dropdown
   */
  setLayers(layers: Layer[]) {
    this.layers = layers;
    this.updateAllLayerDropdowns();
  }

  /**
   * Render the analysis panel with tabs for all 4 analysis types
   */
  render(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'analysis-panel';
    panel.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 360px;
      max-height: calc(100vh - 100px);
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      padding: 20px;
      z-index: 1000;
      display: none;
      overflow-y: auto;
    `;

    panel.innerHTML = `
      <div style="margin-bottom: 20px; position: relative;">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">Spatial Analysis</h3>
        <button id="close-analysis-panel" style="
          position: absolute;
          top: -5px;
          right: 0;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #95a5a6;
        ">×</button>
      </div>

      <!-- Tabs -->
      <div style="display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 2px solid #ecf0f1;">
        <button class="analysis-tab active" data-tab="buffer" style="
          flex: 1;
          padding: 10px 8px;
          background: none;
          border: none;
          border-bottom: 2px solid #3498db;
          color: #3498db;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          margin-bottom: -2px;
        ">Buffer</button>
        <button class="analysis-tab" data-tab="clip" style="
          flex: 1;
          padding: 10px 8px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: #7f8c8d;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          margin-bottom: -2px;
        ">Clip</button>
        <button class="analysis-tab" data-tab="intersect" style="
          flex: 1;
          padding: 10px 8px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: #7f8c8d;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          margin-bottom: -2px;
        ">Intersect</button>
        <button class="analysis-tab" data-tab="union" style="
          flex: 1;
          padding: 10px 8px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: #7f8c8d;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          margin-bottom: -2px;
        ">Union</button>
      </div>

      <!-- Buffer Form -->
      <div id="buffer-form" class="analysis-form" style="display: block;">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 500;">Layer:</label>
          <select id="buffer-layer" class="form-select">
            <option value="">-- Select layer --</option>
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 500;">Distance:</label>
          <input type="number" id="buffer-distance" min="0" step="0.1" placeholder="e.g., 100" class="form-input">
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 500;">Units:</label>
          <select id="buffer-units" class="form-select">
            <option value="meters">Meters</option>
            <option value="kilometers">Kilometers</option>
            <option value="miles">Miles</option>
            <option value="feet">Feet</option>
          </select>
        </div>
        <button id="submit-buffer" class="submit-btn">Create Buffer</button>
      </div>

      <!-- Clip Form -->
      <div id="clip-form" class="analysis-form" style="display: none;">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 500;">Source Layer:</label>
          <select id="clip-source-layer" class="form-select">
            <option value="">-- Select layer --</option>
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 500;">Clip Layer:</label>
          <select id="clip-clip-layer" class="form-select">
            <option value="">-- Select layer --</option>
          </select>
        </div>
        <button id="submit-clip" class="submit-btn">Clip Layers</button>
      </div>

      <!-- Intersect Form -->
      <div id="intersect-form" class="analysis-form" style="display: none;">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 500;">Layer 1:</label>
          <select id="intersect-layer1" class="form-select">
            <option value="">-- Select layer --</option>
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 500;">Layer 2:</label>
          <select id="intersect-layer2" class="form-select">
            <option value="">-- Select layer --</option>
          </select>
        </div>
        <button id="submit-intersect" class="submit-btn">Find Intersection</button>
      </div>

      <!-- Union Form -->
      <div id="union-form" class="analysis-form" style="display: none;">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 500;">Layer 1:</label>
          <select id="union-layer1" class="form-select">
            <option value="">-- Select layer --</option>
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #555; font-weight: 500;">Layer 2:</label>
          <select id="union-layer2" class="form-select">
            <option value="">-- Select layer --</option>
          </select>
        </div>
        <button id="submit-union" class="submit-btn">Union Layers</button>
      </div>

      <!-- Status/Progress Area -->
      <div id="job-status" style="
        margin-top: 20px;
        padding: 12px;
        background: #ecf0f1;
        border-radius: 4px;
        font-size: 12px;
        display: none;
      ">
        <div id="job-message" style="margin-bottom: 8px; color: #555;"></div>
        <div id="job-progress-bar" style="
          width: 100%;
          height: 6px;
          background: #bdc3c7;
          border-radius: 3px;
          overflow: hidden;
          display: none;
        ">
          <div id="job-progress-fill" style="
            height: 100%;
            width: 0%;
            background: #3498db;
            transition: width 0.3s ease;
          "></div>
        </div>
      </div>

      <style>
        .form-select, .form-input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
        }
        .form-select:focus, .form-input:focus {
          outline: none;
          border-color: #3498db;
        }
        .submit-btn {
          width: 100%;
          padding: 10px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .submit-btn:hover {
          background: #2980b9;
        }
        .submit-btn:disabled {
          background: #95a5a6;
          cursor: not-allowed;
        }
        .analysis-tab:hover {
          color: #2980b9;
        }
        .analysis-tab.active {
          color: #3498db !important;
          border-bottom-color: #3498db !important;
        }
      </style>
    `;

    this.panelElement = panel;
    this.attachEventListeners();
    return panel;
  }

  /**
   * Show the panel
   */
  show() {
    if (this.panelElement) {
      this.panelElement.style.display = 'block';
    }
  }

  /**
   * Hide the panel
   */
  hide() {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
    }
  }

  /**
   * Update all layer dropdowns
   */
  private updateAllLayerDropdowns() {
    if (!this.panelElement) return;

    const selects = [
      'buffer-layer',
      'clip-source-layer',
      'clip-clip-layer',
      'intersect-layer1',
      'intersect-layer2',
      'union-layer1',
      'union-layer2',
    ];

    selects.forEach(id => {
      const select = this.panelElement!.querySelector(`#${id}`) as HTMLSelectElement;
      if (!select) {
        console.warn(`Select element not found: ${id}`);
        return;
      }

      select.innerHTML = '<option value="">-- Select layer --</option>';
      this.layers.forEach(layer => {
        const option = document.createElement('option');
        option.value = String(layer.id);
        option.textContent = layer.name;
        select.appendChild(option);
      });
    });

    console.log(`Updated ${selects.length} dropdowns with ${this.layers.length} layers`);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners() {
    if (!this.panelElement) return;

    // Close button
    const closeBtn = this.panelElement.querySelector('#close-analysis-panel');
    closeBtn?.addEventListener('click', () => this.hide());

    // Tab switching
    this.panelElement.querySelectorAll('.analysis-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        if (tabName) this.switchTab(tabName);
      });
    });

    // Submit buttons - use panelElement.querySelector instead of document.getElementById
    const bufferBtn = this.panelElement.querySelector('#submit-buffer');
    const clipBtn = this.panelElement.querySelector('#submit-clip');
    const intersectBtn = this.panelElement.querySelector('#submit-intersect');
    const unionBtn = this.panelElement.querySelector('#submit-union');

    bufferBtn?.addEventListener('click', () => this.handleBufferSubmit());
    clipBtn?.addEventListener('click', () => this.handleClipSubmit());
    intersectBtn?.addEventListener('click', () => this.handleIntersectSubmit());
    unionBtn?.addEventListener('click', () => this.handleUnionSubmit());

    console.log('Event listeners attached:', {
      buffer: !!bufferBtn,
      clip: !!clipBtn,
      intersect: !!intersectBtn,
      union: !!unionBtn
    });
  }

  /**
   * Switch between analysis tabs
   */
  private switchTab(tabName: string) {
    if (!this.panelElement) return;

    this.activeTab = tabName;

    // Update tab styles
    this.panelElement.querySelectorAll('.analysis-tab').forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
        (tab as HTMLElement).style.color = '#3498db';
        (tab as HTMLElement).style.borderBottomColor = '#3498db';
      } else {
        tab.classList.remove('active');
        (tab as HTMLElement).style.color = '#7f8c8d';
        (tab as HTMLElement).style.borderBottomColor = 'transparent';
      }
    });

    // Show/hide forms
    const forms = ['buffer-form', 'clip-form', 'intersect-form', 'union-form'];
    forms.forEach(formId => {
      const form = this.panelElement!.querySelector(`#${formId}`) as HTMLElement;
      if (form) {
        form.style.display = formId === `${tabName}-form` ? 'block' : 'none';
      }
    });
  }

  /**
   * Handle buffer analysis submission
   */
  private async handleBufferSubmit() {
    if (!this.panelElement) return;

    const layerId = parseInt((this.panelElement.querySelector('#buffer-layer') as HTMLSelectElement)?.value || '');
    const distance = parseFloat((this.panelElement.querySelector('#buffer-distance') as HTMLInputElement)?.value || '');
    const units = (this.panelElement.querySelector('#buffer-units') as HTMLSelectElement)?.value as any;

    if (!layerId || !distance || distance <= 0) {
      this.showStatus('Please fill in all fields', 'error');
      return;
    }

    this.showStatus('Creating buffer job...', 'loading');
    this.setFormDisabled(true);

    try {
      const job = await this.service.createBufferJob({ layerId, distance, units });
      this.showStatus(`Job created: ${job.jobId}`, 'loading');
      this.startPolling(job.jobId);
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'Failed to create job', 'error');
      this.setFormDisabled(false);
    }
  }

  /**
   * Handle clip analysis submission
   */
  private async handleClipSubmit() {
    if (!this.panelElement) return;

    const layerId = parseInt((this.panelElement.querySelector('#clip-source-layer') as HTMLSelectElement)?.value || '');
    const clipLayerId = parseInt((this.panelElement.querySelector('#clip-clip-layer') as HTMLSelectElement)?.value || '');

    if (!layerId || !clipLayerId) {
      this.showStatus('Please select both layers', 'error');
      return;
    }

    this.showStatus('Creating clip job...', 'loading');
    this.setFormDisabled(true);

    try {
      const job = await this.service.createClipJob({ layerId, clipLayerId });
      this.showStatus(`Job created: ${job.jobId}`, 'loading');
      this.startPolling(job.jobId);
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'Failed to create job', 'error');
      this.setFormDisabled(false);
    }
  }

  /**
   * Handle intersect analysis submission
   */
  private async handleIntersectSubmit() {
    if (!this.panelElement) return;

    const layerId1 = parseInt((this.panelElement.querySelector('#intersect-layer1') as HTMLSelectElement)?.value || '');
    const layerId2 = parseInt((this.panelElement.querySelector('#intersect-layer2') as HTMLSelectElement)?.value || '');

    if (!layerId1 || !layerId2) {
      this.showStatus('Please select both layers', 'error');
      return;
    }

    this.showStatus('Creating intersect job...', 'loading');
    this.setFormDisabled(true);

    try {
      const job = await this.service.createIntersectJob({ layerId1, layerId2 });
      this.showStatus(`Job created: ${job.jobId}`, 'loading');
      this.startPolling(job.jobId);
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'Failed to create job', 'error');
      this.setFormDisabled(false);
    }
  }

  /**
   * Handle union analysis submission
   */
  private async handleUnionSubmit() {
    if (!this.panelElement) return;

    const layerId1 = parseInt((this.panelElement.querySelector('#union-layer1') as HTMLSelectElement)?.value || '');
    const layerId2 = parseInt((this.panelElement.querySelector('#union-layer2') as HTMLSelectElement)?.value || '');

    if (!layerId1 || !layerId2) {
      this.showStatus('Please select both layers', 'error');
      return;
    }

    this.showStatus('Creating union job...', 'loading');
    this.setFormDisabled(true);

    try {
      const job = await this.service.createUnionJob({ layerId1, layerId2 });
      this.showStatus(`Job created: ${job.jobId}`, 'loading');
      this.startPolling(job.jobId);
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'Failed to create job', 'error');
      this.setFormDisabled(false);
    }
  }

  /**
   * Start polling job status
   */
  private startPolling(jobId: string) {
    const pollInterval = setInterval(async () => {
      try {
        const job = await this.service.getJobStatus(jobId);

        this.updateProgress(job);

        if (job.status === 'completed') {
          clearInterval(pollInterval);
          this.activeJobs.delete(jobId);
          this.showStatus(`✓ Analysis complete! Result layer created.`, 'success');
          this.setFormDisabled(false);

          // Trigger result visualization
          if (job.resultLayerId && this.onResultCreated) {
            this.onResultCreated(job.resultLayerId);
          }
        } else if (job.status === 'failed') {
          clearInterval(pollInterval);
          this.activeJobs.delete(jobId);
          this.showStatus(`✗ Job failed: ${job.error || 'Unknown error'}`, 'error');
          this.setFormDisabled(false);
        }
      } catch (error) {
        clearInterval(pollInterval);
        this.activeJobs.delete(jobId);
        this.showStatus('Failed to check job status', 'error');
        this.setFormDisabled(false);
      }
    }, 2000);

    this.activeJobs.set(jobId, pollInterval);
  }

  /**
   * Update progress display
   */
  private updateProgress(job: AnalysisJob) {
    if (!this.panelElement) return;

    const messageEl = this.panelElement.querySelector('#job-message') as HTMLElement;
    const progressBar = this.panelElement.querySelector('#job-progress-bar') as HTMLElement;
    const progressFill = this.panelElement.querySelector('#job-progress-fill') as HTMLElement;

    if (messageEl) {
      messageEl.textContent = `Status: ${job.status} ${job.progress ? `(${job.progress}%)` : ''}`;
    }

    if (progressBar && progressFill && job.progress !== undefined) {
      progressBar.style.display = 'block';
      progressFill.style.width = `${job.progress}%`;
    }
  }

  /**
   * Show status message
   */
  private showStatus(message: string, type: 'success' | 'error' | 'loading') {
    if (!this.panelElement) return;

    const statusDiv = this.panelElement.querySelector('#job-status') as HTMLElement;
    const messageEl = this.panelElement.querySelector('#job-message') as HTMLElement;
    const progressBar = this.panelElement.querySelector('#job-progress-bar') as HTMLElement;

    if (!statusDiv || !messageEl) return;

    statusDiv.style.display = 'block';
    messageEl.textContent = message;

    if (type === 'success') {
      statusDiv.style.background = '#d4edda';
      statusDiv.style.color = '#155724';
      if (progressBar) progressBar.style.display = 'none';
      setTimeout(() => { statusDiv.style.display = 'none'; }, 5000);
    } else if (type === 'error') {
      statusDiv.style.background = '#f8d7da';
      statusDiv.style.color = '#721c24';
      if (progressBar) progressBar.style.display = 'none';
      setTimeout(() => { statusDiv.style.display = 'none'; }, 5000);
    } else {
      statusDiv.style.background = '#d1ecf1';
      statusDiv.style.color = '#0c5460';
    }
  }

  /**
   * Disable/enable form inputs
   */
  private setFormDisabled(disabled: boolean) {
    const inputs = this.panelElement?.querySelectorAll('input, select, button.submit-btn');
    inputs?.forEach(input => {
      (input as HTMLInputElement).disabled = disabled;
    });
  }
}
