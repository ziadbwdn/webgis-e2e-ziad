/**
 * Job type definitions for the analysis queue
 */

export enum JobType {
  BUFFER = 'buffer',
  CLIP = 'clip',
  INTERSECT = 'intersect',
  UNION = 'union',
  RADIUS = 'radius',
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

export interface RadiusJobData {
  longitude: number;
  latitude: number;
  radius: number;
  units: 'meters' | 'kilometers' | 'miles';
  name?: string;
  userId: number;
}

export type JobData = BufferJobData | ClipJobData | IntersectJobData | UnionJobData | RadiusJobData;

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
