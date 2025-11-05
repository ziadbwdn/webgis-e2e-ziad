/**
 * Job type definitions for the analysis queue
 */

export enum JobType {
  BUFFER = 'buffer',
  CLIP = 'clip',
  INTERSECT = 'intersect',
  UNION = 'union',
}

export interface BufferJobData {
  layerId: number;
  distance: number;
  units: 'meters' | 'kilometers' | 'miles';
  userId: number;
}

export interface ClipJobData {
  layerId: number;
  clipLayerId: number;
  userId: number;
}

export interface IntersectJobData {
  layerId1: number;
  layerId2: number;
  userId: number;
}

export interface UnionJobData {
  layerId1: number;
  layerId2: number;
  userId: number;
}

export type JobData = BufferJobData | ClipJobData | IntersectJobData | UnionJobData;

export enum JobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface JobResult {
  jobId: string;
  status: JobStatus;
  resultLayerId?: number;
  error?: string;
  progress?: number;
  createdAt: Date;
  completedAt?: Date;
}
