import { z } from 'zod';

// Auth Validation Schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  full_name: z.string().min(1, 'Full name is required').max(255),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Layer Validation Schemas
export const uploadLayerSchema = z.object({
  name: z.string().min(1, 'Layer name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  geojson: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(
      z.object({
        type: z.literal('Feature'),
        geometry: z.object({
          type: z.enum(['Point', 'LineString', 'Polygon']),
          coordinates: z.any(),
        }),
        properties: z.record(z.string(), z.any()).optional().nullable(),
      })
    ),
  }),
});

// Type exports for use in controllers
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UploadLayerInput = z.infer<typeof uploadLayerSchema>;
