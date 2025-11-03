import { getPool } from '../db/connection';
import { Layer, GeoJSONFeature, GeoJSONFeatureCollection } from '../types';

export class LayerModel {
  static async getDefaultLayers(): Promise<Layer[]> {
    const pool = getPool();
    try {
      const result = await pool.query('SELECT * FROM layers WHERE is_default = true ORDER BY id ASC');
      return result.rows;
    } catch (error) {
      console.error('Error fetching default layers:', error);
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
    if (geometry.type === 'Point') {
      const [lon, lat] = geometry.coordinates;
      return `POINT(${lon} ${lat})`;
    } else if (geometry.type === 'LineString') {
      const coords = geometry.coordinates.map((c: number[]) => `${c[0]} ${c[1]}`).join(',');
      return `LINESTRING(${coords})`;
    } else if (geometry.type === 'Polygon') {
      const rings = geometry.coordinates
        .map((ring: number[][]) => {
          const coords = ring.map((c: number[]) => `${c[0]} ${c[1]}`).join(',');
          return `(${coords})`;
        })
        .join(',');
      return `POLYGON(${rings})`;
    }
    throw new Error(`Unsupported geometry type: ${geometry.type}`);
  }
}
