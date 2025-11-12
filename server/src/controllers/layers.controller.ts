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

  static async getAllLayers(req: Request, res: Response): Promise<void> {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    const layers = await LayerModel.getAllLayersForUser(userId);

    res.status(200).json({
      layers,
    });
  }

  static async getUserLayers(req: Request, res: Response): Promise<void> {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    const layers = await LayerModel.getUserLayers(userId);

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

    if (geojson.features.length === 0) {
      throw new AppError(400, 'GeoJSON must contain at least one feature');
    }

    // Determine geometry type from first feature
    const firstGeometry = geojson.features[0].geometry;
    const type = firstGeometry.type.toLowerCase();

    // Use transaction: create layer and insert features atomically
    try {
      const layer = await LayerModel.createLayerWithFeatures(
        name,
        description,
        type,
        userId || null,
        geojson.features
      );

      res.status(201).json({
        layer: {
          id: layer.id,
          name: layer.name,
          description: layer.description,
          type: layer.type,
          created_by: layer.created_by,
          feature_count: geojson.features.length,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('transaction')) {
        throw new AppError(500, 'Failed to upload layer. Database transaction failed.');
      }
      throw error;
    }
  }

  static async deleteLayer(req: Request, res: Response): Promise<void> {
    const { layerId } = req.params;
    const userId = req.userId;
    const id = parseInt(layerId, 10);

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    if (isNaN(id)) {
      throw new AppError(400, 'Invalid layer ID');
    }

    // Check if layer exists and belongs to user (or is not a default layer)
    const layer = await LayerModel.getLayerById(id);
    if (!layer) {
      throw new AppError(404, 'Layer not found');
    }

    // Prevent deletion of default layers
    if (layer.is_default) {
      throw new AppError(403, 'Cannot delete default layers');
    }

    // Check ownership
    if (layer.created_by !== userId) {
      throw new AppError(403, 'You do not have permission to delete this layer');
    }

    // Delete the layer
    await LayerModel.deleteLayer(id);

    res.status(200).json({
      message: 'Layer deleted successfully',
      layerId: id,
    });
  }
}
