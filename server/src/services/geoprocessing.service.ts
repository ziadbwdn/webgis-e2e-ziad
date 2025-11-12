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
   * Clip analysis - Cuts input features using clip layer as cookie cutter
   * Uses ST_Intersection which is standard for clip operations
   * Result: Parts of input features that fall within clip boundary
   */
  static async clip(
    inputFeatures: GeoJSONFeature[],
    clipFeatures: GeoJSONFeature[]
  ): Promise<GeoJSONFeature[]> {
    if (!inputFeatures || inputFeatures.length === 0) {
      throw new Error('No input features provided for clip analysis');
    }
    if (!clipFeatures || clipFeatures.length === 0) {
      throw new Error('No clip features provided');
    }

    const pool = getPool();
    const results: GeoJSONFeature[] = [];

    // Dissolve all clip features into ONE boundary
    const clipGeometries = clipFeatures.map(f => JSON.stringify(f.geometry));
    const dissolveResult = await pool.query(
      `SELECT ST_AsGeoJSON(
        ST_Union(
          ARRAY[${clipGeometries.map((_, i) => `ST_MakeValid(ST_GeomFromGeoJSON($${i + 1}))`).join(', ')}]
        )
      ) as geometry`,
      clipGeometries
    );

    if (!dissolveResult.rows[0]?.geometry) {
      throw new Error('Failed to dissolve clip layer boundaries');
    }

    const clipBoundary = JSON.parse(dissolveResult.rows[0].geometry);

    // Clip each input feature - keep only parts within clip boundary
    // This is A clip B: returns parts of A that are inside B
    for (const feature of inputFeatures) {
      try {
        const result = await pool.query(
          `WITH clipped AS (
            SELECT ST_Intersection(
              ST_MakeValid(ST_GeomFromGeoJSON($1)),
              ST_GeomFromGeoJSON($2)
            ) as geom
          )
          SELECT ST_AsGeoJSON(
            CASE
              WHEN ST_GeometryType(geom) = 'ST_GeometryCollection'
              THEN ST_CollectionExtract(geom, 3)
              ELSE geom
            END
          ) as geometry
          FROM clipped
          WHERE NOT ST_IsEmpty(geom)
          AND ST_Dimension(geom) >= 2`,
          [JSON.stringify(feature.geometry), JSON.stringify(clipBoundary)]
        );

        if (result.rows[0] && result.rows[0].geometry) {
          const parsedGeom = JSON.parse(result.rows[0].geometry);

          if (parsedGeom && (parsedGeom.type === 'Polygon' || parsedGeom.type === 'MultiPolygon')) {
            results.push({
              type: 'Feature',
              geometry: parsedGeom,
              properties: {
                ...feature.properties,
                clipped: true,
              },
            });
          }
        }
      } catch (error) {
        console.error('Clip operation failed for feature:', error);
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
          // First check if geometries actually intersect to avoid unnecessary computation
          const intersectsCheck = await pool.query(
            `SELECT ST_Intersects(
              ST_MakeValid(ST_GeomFromGeoJSON($1)),
              ST_MakeValid(ST_GeomFromGeoJSON($2))
            ) as intersects`,
            [JSON.stringify(feature1.geometry), JSON.stringify(feature2.geometry)]
          );

          if (!intersectsCheck.rows[0]?.intersects) {
            continue; // Skip if no intersection
          }

          // Compute intersection with proper geometry handling
          const result = await pool.query(
            `WITH intersected AS (
              SELECT ST_Intersection(
                ST_MakeValid(ST_GeomFromGeoJSON($1)),
                ST_MakeValid(ST_GeomFromGeoJSON($2))
              ) as geom
            )
            SELECT ST_AsGeoJSON(
              CASE
                WHEN ST_GeometryType(geom) = 'ST_GeometryCollection'
                THEN ST_CollectionExtract(geom, 3)
                ELSE geom
              END
            ) as geometry,
            ST_GeometryType(geom) as geom_type
            FROM intersected
            WHERE NOT ST_IsEmpty(geom)
            AND ST_Dimension(geom) >= 2`,
            [JSON.stringify(feature1.geometry), JSON.stringify(feature2.geometry)]
          );

          if (result.rows[0] && result.rows[0].geometry) {
            const parsedGeom = JSON.parse(result.rows[0].geometry);

            // Only add valid polygons
            if (parsedGeom && (parsedGeom.type === 'Polygon' || parsedGeom.type === 'MultiPolygon')) {
              // Merge properties without conflicts
              const mergedProperties: Record<string, any> = {
                ...feature1.properties,
                intersected: true,
              };

              // Add feature2 properties with prefix to avoid conflicts
              Object.keys(feature2.properties || {}).forEach(key => {
                const newKey = `layer2_${key}`;
                mergedProperties[newKey] = feature2.properties[key];
              });

              results.push({
                type: 'Feature',
                geometry: parsedGeom,
                properties: mergedProperties,
              });
            }
          }
        } catch (error) {
          console.error('Intersect operation failed:', error);
          // Continue with other features
        }
      }
    }

    if (results.length === 0) {
      console.warn('Intersect operation produced no valid results');
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
