// Analysis Service - API communication for spatial analysis jobs
const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api';

export interface AnalysisJob {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  resultLayerId?: number;
  error?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface BufferJobParams {
  layerId: number;
  distance: number;
  units?: 'meters' | 'kilometers' | 'miles' | 'feet';
}

export interface ClipJobParams {
  layerId: number;
  clipLayerId: number;
}

export interface IntersectJobParams {
  layerId1: number;
  layerId2: number;
}

export interface UnionJobParams {
  layerId1: number;
  layerId2: number;
}

export default class AnalysisService {
  private authToken: string;

  constructor(authToken: string) {
    this.authToken = authToken;
  }

  /**
   * Create buffer analysis job
   */
  async createBufferJob(params: BufferJobParams): Promise<AnalysisJob> {
    const response = await fetch(`${API_URL}/analysis/buffer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create buffer job');
    }

    return await response.json();
  }

  /**
   * Create clip analysis job
   */
  async createClipJob(params: ClipJobParams): Promise<AnalysisJob> {
    const response = await fetch(`${API_URL}/analysis/clip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create clip job');
    }

    return await response.json();
  }

  /**
   * Create intersect analysis job
   */
  async createIntersectJob(params: IntersectJobParams): Promise<AnalysisJob> {
    const response = await fetch(`${API_URL}/analysis/intersect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create intersect job');
    }

    return await response.json();
  }

  /**
   * Create union analysis job
   */
  async createUnionJob(params: UnionJobParams): Promise<AnalysisJob> {
    const response = await fetch(`${API_URL}/analysis/union`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create union job');
    }

    return await response.json();
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<AnalysisJob> {
    const response = await fetch(`${API_URL}/analysis/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get job status');
    }

    return await response.json();
  }

  /**
   * Cancel running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${API_URL}/analysis/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel job');
    }
  }

  /**
   * Poll job status until completion or failure
   * @param jobId Job ID to poll
   * @param onProgress Callback for progress updates
   * @param intervalMs Polling interval in milliseconds (default: 2000)
   */
  async pollJobStatus(
    jobId: string,
    onProgress: (job: AnalysisJob) => void,
    intervalMs: number = 2000
  ): Promise<AnalysisJob> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const job = await this.getJobStatus(jobId);
          onProgress(job);

          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
            clearInterval(interval);
            if (job.status === 'completed') {
              resolve(job);
            } else {
              reject(new Error(job.error || `Job ${job.status}`));
            }
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, intervalMs);
    });
  }
}
