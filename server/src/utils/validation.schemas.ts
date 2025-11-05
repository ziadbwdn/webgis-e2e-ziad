import { z } from 'zod';

// ============= Auth Validation Schemas =============

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  full_name: z.string().min(1, 'Full name is required').max(255),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============= Layer Validation Schemas =============

export const uploadLayerSchema = z.object({
  name: z.string().min(1, 'Layer name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  geojson: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(
      z.object({
        type: z.literal('Feature'),
        geometry: z.object({
          type: z.enum(['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon']),
          coordinates: z.any(),
        }),
        properties: z.record(z.string(), z.any()).optional().nullable(),
      })
    ),
  }),
});

// ============= Analysis Validation Schemas =============

/**
 * Buffer analysis request validation
 */
export const bufferAnalysisSchema = z.object({
  layerId: z.number().int().positive('Layer ID must be a positive integer').describe('ID of layer to buffer'),
  distance: z.number().positive('Distance must be positive').describe('Buffer distance'),
  units: z
    .enum(['meters', 'kilometers', 'miles'])
    .default('meters')
    .describe('Units for buffer distance'),
});

/**
 * Clip analysis request validation
 */
export const clipAnalysisSchema = z.object({
  layerId: z.number().int().positive('Layer ID must be a positive integer'),
  clipLayerId: z.number().int().positive('Clip layer ID must be a positive integer'),
});

/**
 * Intersect analysis request validation
 */
export const intersectAnalysisSchema = z.object({
  layerId1: z.number().int().positive('Layer ID 1 must be a positive integer'),
  layerId2: z.number().int().positive('Layer ID 2 must be a positive integer'),
});

/**
 * Union analysis request validation
 */
export const unionAnalysisSchema = z.object({
  layerId1: z.number().int().positive('Layer ID 1 must be a positive integer'),
  layerId2: z.number().int().positive('Layer ID 2 must be a positive integer'),
});

/**
 * Job status query validation
 */
export const jobStatusSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

/**
 * Job cancellation validation
 */
export const jobCancellationSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

/**
 * Job history query validation
 */
export const jobHistorySchema = z.object({
  limit: z.number().int().positive().default(20).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

// ============= Type Exports =============

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UploadLayerInput = z.infer<typeof uploadLayerSchema>;
export type BufferAnalysisInput = z.infer<typeof bufferAnalysisSchema>;
export type ClipAnalysisInput = z.infer<typeof clipAnalysisSchema>;
export type IntersectAnalysisInput = z.infer<typeof intersectAnalysisSchema>;
export type UnionAnalysisInput = z.infer<typeof unionAnalysisSchema>;
export type JobStatusInput = z.infer<typeof jobStatusSchema>;
export type JobCancellationInput = z.infer<typeof jobCancellationSchema>;
export type JobHistoryInput = z.infer<typeof jobHistorySchema>;
