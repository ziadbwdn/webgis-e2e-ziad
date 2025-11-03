import { Request, Response } from 'express';
import { LayerModel } from '../models/layer.model';
import { AppError } from '../middleware/error.middleware';

export class LayersController {
  static async getDefaultLayers(req: Request, res: Response): Promise<void> {
    const layers = await LayerModel.getDefaultLayers();

    res.status(200).json({
      layers,
    });
  }

  static async getLayerFeatures(req: Request, res: Response): Promise<void> {
    const { layerId } = req.params;
    const id = parseInt(layerId, 10);

    if (isNaN(id)) {
      throw new AppError(400, 'Invalid layer ID');
    }

    // Check if layer exists
    const layer = await LayerModel.getLayerById(id);
    if (!layer) {
      throw new AppError(404, 'Layer not found');
    }

    // Get features as GeoJSON
    const geojson = await LayerModel.getLayerFeatures(id);

    res.status(200).json(geojson);
  }

  static async uploadLayer(req: Request, res: Response): Promise<void> {
    const { name, description, geojson } = req.body;
    const userId = req.userId;

    if (!geojson || !geojson.features) {
      throw new AppError(400, 'Invalid GeoJSON structure');
    }

    // Determine geometry type from first feature
    let type = 'unknown';
    if (geojson.features.length > 0) {
      const firstGeometry = geojson.features[0].geometry;
      type = firstGeometry.type.toLowerCase();
    }

    // Create layer
    const layer = await LayerModel.createLayer(name, description, type, userId || null);

    // Insert features
    if (geojson.features.length > 0) {
      await LayerModel.insertFeatures(layer.id, geojson.features);
    }

    res.status(201).json({
      layer: {
        id: layer.id,
        name: layer.name,
        description: layer.description,
        type: layer.type,
        created_by: layer.created_by,
      },
    });
  }
}
