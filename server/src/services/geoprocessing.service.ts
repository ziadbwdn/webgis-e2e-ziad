import { getPool } from '../db/connection';
import { GeoJSONFeature } from '../types';

/**
 * Geoprocessing service using PostGIS
 * Uses native PostGIS GeoJSON support instead of manual WKT conversion
 */
export class GeoprocessingService {
  /**
   * Buffer analysis
   * Expands geometries by a specified distance
   */
  static async buffer(
    features: GeoJSONFeature[],
    distance: number,
    units: 'meters' | 'kilometers' | 'miles'
  ): Promise<GeoJSONFeature[]> {
    if (!features || features.length === 0) {
      throw new Error('No features provided for buffer analysis');
    }

    const pool = getPool();

    // Convert units to meters (PostGIS ST_Buffer uses meters)
    let distanceInMeters = distance;
    if (units === 'kilometers') {
      distanceInMeters = distance * 1000;
    } else if (units === 'miles') {
      distanceInMeters = distance * 1609.34;
    }

    const results: GeoJSONFeature[] = [];

    for (const feature of features) {
      try {
        // Use PostGIS native GeoJSON support
        const result = await pool.query(
          `SELECT ST_AsGeoJSON(
            ST_Buffer(
              ST_GeomFromGeoJSON($1)::geography,
              $2
            )::geometry
          ) as geometry`,
          [JSON.stringify(feature.geometry), distanceInMeters]
        );

        if (!result.rows[0] || !result.rows[0].geometry) {
          throw new Error('PostGIS buffer operation failed');
        }

        results.push({
          type: 'Feature',
          geometry: JSON.parse(result.rows[0].geometry),
          properties: {
            ...feature.properties,
            buffer_distance: distance,
            buffer_units: units,
            buffer_original_geometry_type: feature.geometry.type,
          },
        });
      } catch (error) {
        console.error('Buffer operation failed for feature:', error);
        throw new Error(`Buffer operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Clip analysis
   * Clips one geometry to the bounds of another
   */
  static async clip(
    features: GeoJSONFeature[],
    clipGeometry: GeoJSONFeature
  ): Promise<GeoJSONFeature[]> {
    if (!features || features.length === 0) {
      throw new Error('No features provided for clip analysis');
    }

    const pool = getPool();
    const results: GeoJSONFeature[] = [];

    for (const feature of features) {
      try {
        const result = await pool.query(
          `SELECT ST_AsGeoJSON(
            ST_Intersection(
              ST_GeomFromGeoJSON($1),
              ST_GeomFromGeoJSON($2)
            )
          ) as geometry`,
          [JSON.stringify(feature.geometry), JSON.stringify(clipGeometry.geometry)]
        );

        if (result.rows[0] && result.rows[0].geometry) {
          results.push({
            type: 'Feature',
            geometry: JSON.parse(result.rows[0].geometry),
            properties: {
              ...feature.properties,
              clipped: true,
            },
          });
        }
      } catch (error) {
        console.error('Clip operation failed for feature:', error);
        throw new Error(`Clip operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Intersect analysis
   * Finds intersection of two geometries
   */
  static async intersect(
    features1: GeoJSONFeature[],
    features2: GeoJSONFeature[]
  ): Promise<GeoJSONFeature[]> {
    if (!features1 || features1.length === 0 || !features2 || features2.length === 0) {
      throw new Error('Both feature sets must contain at least one feature');
    }

    const pool = getPool();
    const results: GeoJSONFeature[] = [];

    for (const feature1 of features1) {
      for (const feature2 of features2) {
        try {
          const result = await pool.query(
            `SELECT ST_AsGeoJSON(
              ST_Intersection(
                ST_GeomFromGeoJSON($1),
                ST_GeomFromGeoJSON($2)
              )
            ) as geometry`,
            [JSON.stringify(feature1.geometry), JSON.stringify(feature2.geometry)]
          );

          if (result.rows[0] && result.rows[0].geometry) {
            results.push({
              type: 'Feature',
              geometry: JSON.parse(result.rows[0].geometry),
              properties: {
                ...feature1.properties,
                ...feature2.properties,
              },
            });
          }
        } catch (error) {
          console.error('Intersect operation failed:', error);
          // Continue with other features
        }
      }
    }

    return results;
  }

  /**
   * Union analysis
   * Combines two geometries
   */
  static async union(
    features1: GeoJSONFeature[],
    features2: GeoJSONFeature[]
  ): Promise<GeoJSONFeature[]> {
    if (!features1 || features1.length === 0 || !features2 || features2.length === 0) {
      throw new Error('Both feature sets must contain at least one feature');
    }

    const pool = getPool();
    const results: GeoJSONFeature[] = [];

    for (const feature1 of features1) {
      for (const feature2 of features2) {
        try {
          const result = await pool.query(
            `SELECT ST_AsGeoJSON(
              ST_Union(
                ST_GeomFromGeoJSON($1),
                ST_GeomFromGeoJSON($2)
              )
            ) as geometry`,
            [JSON.stringify(feature1.geometry), JSON.stringify(feature2.geometry)]
          );

          if (result.rows[0] && result.rows[0].geometry) {
            results.push({
              type: 'Feature',
              geometry: JSON.parse(result.rows[0].geometry),
              properties: {
                ...feature1.properties,
                ...feature2.properties,
              },
            });
          }
        } catch (error) {
          console.error('Union operation failed:', error);
          // Continue with other features
        }
      }
    }

    return results;
  }
}
