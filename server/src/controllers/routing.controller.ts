import { Request, Response } from 'express';
import { getPool } from '../db/connection';

export class RoutingController {
  static async calculateRoute(req: Request, res: Response): Promise<void> {
    const { startLon, startLat, endLon, endLat, mode } = req.body;

    if (!startLon || !startLat || !endLon || !endLat) {
      res.status(400).json({ error: 'Missing required parameters: startLon, startLat, endLon, endLat' });
      return;
    }

    // Default to car mode
    const transportMode = mode || 'car';

    const pool = getPool();

    try {
      const result = await pool.query(
        'SELECT geojson, total_distance, total_time FROM calculate_route($1, $2, $3, $4, $5)',
        [startLon, startLat, endLon, endLat, transportMode]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'No route found between these points' });
        return;
      }

      const { geojson, total_distance, total_time } = result.rows[0];

      res.status(200).json({
        route: geojson,
        distance: total_distance,
        time: total_time
      });
    } catch (error: any) {
      console.error('Route calculation error:', error);
      res.status(500).json({
        error: 'Failed to calculate route',
        details: error.message
      });
    }
  }

  static async calculateIsochrone(req: Request, res: Response): Promise<void> {
    const { lon, lat, time, mode } = req.body;

    if (!lon || !lat || !time) {
      res.status(400).json({ error: 'Missing required parameters: lon, lat, time (in seconds)' });
      return;
    }

    // Default to car mode
    const transportMode = mode || 'car';

    const pool = getPool();

    try {
      const intervals = [300, 600, 900, 1800].filter(t => t <= time);
      const features = [];

      for (const interval of intervals) {
        const result = await pool.query(
          'SELECT calculate_isochrone($1, $2, $3, $4) as geojson',
          [lon, lat, interval, transportMode]
        );

        if (result.rows[0]?.geojson) {
          const feature = result.rows[0].geojson;
          features.push({
            ...feature,
            properties: {
              ...feature.properties,
              time_minutes: Math.round(interval / 60),
              fill_color: this.getColorForTime(interval)
            }
          });
        }
      }

      res.status(200).json({
        type: 'FeatureCollection',
        features
      });
    } catch (error: any) {
      console.error('Isochrone calculation error:', error);
      res.status(500).json({
        error: 'Failed to calculate isochrone',
        details: error.message
      });
    }
  }

  private static getColorForTime(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    if (minutes <= 5) return '#fee5d9';
    if (minutes <= 10) return '#fcae91';
    if (minutes <= 15) return '#fb6a4a';
    if (minutes <= 20) return '#de2d26';
    return '#a50f15';
  }
}
