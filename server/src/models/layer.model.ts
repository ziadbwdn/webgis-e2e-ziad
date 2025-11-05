import { getPool } from '../db/connection';
import { Layer, GeoJSONFeature, GeoJSONFeatureCollection } from '../types';

export class LayerModel {
  static async getDefaultLayers(): Promise<Layer[]> {
    const pool = getPool();
    try {
      const result = await pool.query('SELECT * FROM layers WHERE is_default = true ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      console.error('Error fetching default layers:', error);
      throw error;
    }
  }

  static async getUserLayers(userId: number): Promise<Layer[]> {
    const pool = getPool();
    try {
      const result = await pool.query(
        'SELECT * FROM layers WHERE created_by = $1 ORDER BY created_at DESC',
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching user layers:', error);
      throw error;
    }
  }

  static async getAllLayersForUser(userId: number): Promise<Layer[]> {
    const pool = getPool();
    try {
      // Get both default layers and user's own layers
      const result = await pool.query(
        `SELECT * FROM layers
         WHERE is_default = true OR created_by = $1
         ORDER BY is_default DESC, created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching all layers for user:', error);
      throw error;
    }
  }

  static async getLayerById(id: number): Promise<Layer | null> {
    const pool = getPool();
    try {
      const result = await pool.query('SELECT * FROM layers WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching layer:', error);
      throw error;
    }
  }

  static async createLayer(
    name: string,
    description: string | undefined,
    type: string,
    userId: number | null = null
  ): Promise<Layer> {
    const pool = getPool();
    try {
      const result = await pool.query(
        'INSERT INTO layers (name, description, type, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description || null, type, userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating layer:', error);
      throw error;
    }
  }

  static async createLayerWithFeatures(
    name: string,
    description: string | undefined,
    type: string,
    userId: number | null,
    features: GeoJSONFeature[]
  ): Promise<Layer> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Create layer
      const layerResult = await client.query(
        'INSERT INTO layers (name, description, type, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description || null, type, userId]
      );
      const layer = layerResult.rows[0];

      // Insert features
      for (const feature of features) {
        const { geometry, properties } = feature;
        const geomWKT = this.geojsonToWKT(geometry);

        await client.query(
          `INSERT INTO layer_features (layer_id, geom, properties)
           VALUES ($1, ST_GeomFromText($2, 4326), $3)`,
          [layer.id, geomWKT, JSON.stringify(properties || {})]
        );
      }

      // Commit transaction
      await client.query('COMMIT');
      return layer;
    } catch (error) {
      // Rollback on any error
      await client.query('ROLLBACK');
      console.error('Error creating layer with features (transaction rolled back):', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getLayerFeatures(layerId: number): Promise<GeoJSONFeatureCollection> {
    const pool = getPool();
    try {
      const result = await pool.query(
        `SELECT id, ST_AsGeoJSON(geom) as geometry, properties FROM layer_features WHERE layer_id = $1 ORDER BY id ASC`,
        [layerId]
      );

      const features: GeoJSONFeature[] = result.rows.map((row: any) => ({
        type: 'Feature',
        geometry: JSON.parse(row.geometry),
        properties: row.properties || {},
      }));

      return {
        type: 'FeatureCollection',
        features,
      };
    } catch (error) {
      console.error('Error fetching layer features:', error);
      throw error;
    }
  }

  static async insertFeatures(
    layerId: number,
    features: GeoJSONFeature[]
  ): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const feature of features) {
        const { geometry, properties } = feature;
        const geomWKT = this.geojsonToWKT(geometry);

        await client.query(
          `INSERT INTO layer_features (layer_id, geom, properties)
           VALUES ($1, ST_GeomFromText($2, 4326), $3)`,
          [layerId, geomWKT, JSON.stringify(properties || {})]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error inserting features:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteLayer(layerId: number): Promise<void> {
    const pool = getPool();
    try {
      // Cascade delete will handle layer_features
      await pool.query('DELETE FROM layers WHERE id = $1', [layerId]);
    } catch (error) {
      console.error('Error deleting layer:', error);
      throw error;
    }
  }

  private static geojsonToWKT(geometry: any): string {
    const type = geometry.type;
    const coordinates = geometry.coordinates;

    switch (type) {
      case 'Point':
        return this.pointToWKT(coordinates);

      case 'MultiPoint':
        return this.multiPointToWKT(coordinates);

      case 'LineString':
        return this.lineStringToWKT(coordinates);

      case 'MultiLineString':
        return this.multiLineStringToWKT(coordinates);

      case 'Polygon':
        return this.polygonToWKT(coordinates);

      case 'MultiPolygon':
        return this.multiPolygonToWKT(coordinates);

      case 'GeometryCollection':
        throw new Error('GeometryCollection is not supported. Please use individual geometry types.');

      default:
        throw new Error(`Unsupported geometry type: ${type}`);
    }
  }

  private static pointToWKT(coords: number[]): string {
    const [lon, lat] = coords;
    return `POINT(${lon} ${lat})`;
  }

  private static multiPointToWKT(coords: number[][]): string {
    const points = coords.map(c => `(${c[0]} ${c[1]})`).join(',');
    return `MULTIPOINT(${points})`;
  }

  private static lineStringToWKT(coords: number[][]): string {
    const coordStr = coords.map((c: number[]) => `${c[0]} ${c[1]}`).join(',');
    return `LINESTRING(${coordStr})`;
  }

  private static multiLineStringToWKT(coords: number[][][]): string {
    const lines = coords
      .map((line: number[][]) => {
        const coordStr = line.map((c: number[]) => `${c[0]} ${c[1]}`).join(',');
        return `(${coordStr})`;
      })
      .join(',');
    return `MULTILINESTRING(${lines})`;
  }

  private static polygonToWKT(coords: number[][][]): string {
    const rings = coords
      .map((ring: number[][]) => {
        const coordStr = ring.map((c: number[]) => `${c[0]} ${c[1]}`).join(',');
        return `(${coordStr})`;
      })
      .join(',');
    return `POLYGON(${rings})`;
  }

  private static multiPolygonToWKT(coords: number[][][][]): string {
    const polygons = coords
      .map((polygon: number[][][]) => {
        const rings = polygon
          .map((ring: number[][]) => {
            const coordStr = ring.map((c: number[]) => `${c[0]} ${c[1]}`).join(',');
            return `(${coordStr})`;
          })
          .join(',');
        return `(${rings})`;
      })
      .join(',');
    return `MULTIPOLYGON(${polygons})`;
  }
}
