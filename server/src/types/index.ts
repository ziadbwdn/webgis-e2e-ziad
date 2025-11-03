// User Types
export interface User {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: number;
  email: string;
  full_name: string;
}

// Layer Types
export interface Layer {
  id: number;
  name: string;
  description: string | null;
  type: 'point' | 'linestring' | 'polygon' | 'raster';
  is_default: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface LayerFeature {
  id: number;
  layer_id: number;
  geom: any; // PostGIS geometry
  properties: Record<string, any>;
  created_at: Date;
}

// GeoJSON Types
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONLineString
  | GeoJSONPolygon;

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

// JWT Payload
export interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

// Request/Response Types
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface UploadLayerRequest {
  name: string;
  description?: string;
  geojson: GeoJSONFeatureCollection;
}

// Express Request with User
export interface AuthenticatedRequest {
  userId?: number;
  user?: UserPublic;
}
