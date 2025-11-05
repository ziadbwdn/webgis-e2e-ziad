import { Job } from 'bullmq';
import { BufferJobData } from '../types';
import { GeoprocessingService } from '../../services/geoprocessing.service';
import { LayerModel } from '../../models/layer.model';
import { AppError } from '../../middleware/error.middleware';

/**
 * Buffer analysis job handler
 * Implements proper error handling, validation, and progress reporting
 */
export async function handleBufferJob(
  data: BufferJobData,
  job: Job<BufferJobData>
): Promise<number> {
  try {
    // ============= Validation =============
    if (!data.layerId || typeof data.layerId !== 'number') {
      throw new AppError(400, 'Invalid layerId: must be a positive number');
    }

    if (data.distance <= 0) {
      throw new AppError(400, 'Invalid distance: must be positive');
    }

    if (!['meters', 'kilometers', 'miles'].includes(data.units)) {
      throw new AppError(400, 'Invalid units: must be meters, kilometers, or miles');
    }

    console.log(`[Buffer Job ${job.id}] Started with parameters:`, data);

    // ============= Progress: 10% - Fetching source layer =============
    await job.updateProgress(10);

    const sourceLayer = await LayerModel.getLayerById(data.layerId);
    if (!sourceLayer) {
      throw new AppError(404, `Layer with ID ${data.layerId} not found`);
    }

    console.log(`[Buffer Job ${job.id}] Source layer found:`, sourceLayer.name);

    // ============= Progress: 30% - Fetching features =============
    await job.updateProgress(30);

    const features = await LayerModel.getLayerFeatures(data.layerId);
    if (!features || features.features.length === 0) {
      throw new AppError(400, `Layer "${sourceLayer.name}" has no features to buffer`);
    }

    console.log(`[Buffer Job ${job.id}] Features fetched: ${features.features.length} features`);

    // ============= Progress: 50% - Performing buffer operation =============
    await job.updateProgress(50);

    let bufferedFeatures;
    try {
      bufferedFeatures = await GeoprocessingService.buffer(
        features.features,
        data.distance,
        data.units
      );
    } catch (error) {
      throw new AppError(
        500,
        `Buffer operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (!bufferedFeatures || bufferedFeatures.length === 0) {
      throw new AppError(500, 'Buffer operation produced no results');
    }

    console.log(`[Buffer Job ${job.id}] Buffer operation completed: ${bufferedFeatures.length} features`);

    // ============= Progress: 80% - Creating result layer =============
    await job.updateProgress(80);

    let resultLayer;
    try {
      resultLayer = await LayerModel.createLayerWithFeatures(
        `${sourceLayer.name} (Buffer ${data.distance}${data.units})`,
        `Buffer analysis of "${sourceLayer.name}" with distance ${data.distance} ${data.units}`,
        'polygon',
        data.userId,
        bufferedFeatures
      );
    } catch (error) {
      throw new AppError(
        500,
        `Failed to create result layer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    console.log(`[Buffer Job ${job.id}] Result layer created:`, resultLayer.id);

    // ============= Progress: 100% - Complete =============
    await job.updateProgress(100);

    console.log(`[Buffer Job ${job.id}] Completed successfully. Result layer ID: ${resultLayer.id}`);

    return resultLayer.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[Buffer Job ${job.id}] Error:`, errorMessage);

    // Re-throw the error so BullMQ can handle retry logic
    if (error instanceof AppError) {
      throw error;
    }

    // Wrap unknown errors
    throw new Error(`Buffer job failed: ${errorMessage}`);
  }
}

/**
 * Handler for clip analysis
 * Clips one geometry to bounds of another
 */
export async function handleClipJob(
  data: any,
  job: Job
): Promise<number> {
  try {
    await job.updateProgress(10);

    const sourceLayer = await LayerModel.getLayerById(data.layerId);
    if (!sourceLayer) {
      throw new AppError(404, `Source layer not found`);
    }

    const clipLayer = await LayerModel.getLayerById(data.clipLayerId);
    if (!clipLayer) {
      throw new AppError(404, `Clip layer not found`);
    }

    await job.updateProgress(30);

    const sourceFeatures = await LayerModel.getLayerFeatures(data.layerId);
    const clipFeatures = await LayerModel.getLayerFeatures(data.clipLayerId);

    if (!sourceFeatures.features.length || !clipFeatures.features.length) {
      throw new AppError(400, 'Source or clip layer has no features');
    }

    await job.updateProgress(50);

    // Use first clip feature to clip all source features
    const clippedFeatures = await GeoprocessingService.clip(
      sourceFeatures.features,
      clipFeatures.features[0]
    );

    await job.updateProgress(80);

    const resultLayer = await LayerModel.createLayerWithFeatures(
      `${sourceLayer.name} (Clipped by ${clipLayer.name})`,
      `Clip analysis of "${sourceLayer.name}"`,
      'polygon',
      data.userId,
      clippedFeatures
    );

    await job.updateProgress(100);

    return resultLayer.id;
  } catch (error) {
    console.error(`[Clip Job ${job.id}] Error:`, error);
    throw error;
  }
}

/**
 * Handler for intersect analysis
 * Finds intersection of two geometries
 */
export async function handleIntersectJob(
  data: any,
  job: Job
): Promise<number> {
  try {
    await job.updateProgress(10);

    const layer1 = await LayerModel.getLayerById(data.layerId1);
    if (!layer1) {
      throw new AppError(404, `Layer 1 not found`);
    }

    const layer2 = await LayerModel.getLayerById(data.layerId2);
    if (!layer2) {
      throw new AppError(404, `Layer 2 not found`);
    }

    await job.updateProgress(30);

    const features1 = await LayerModel.getLayerFeatures(data.layerId1);
    const features2 = await LayerModel.getLayerFeatures(data.layerId2);

    if (!features1.features.length || !features2.features.length) {
      throw new AppError(400, 'Both layers must have features');
    }

    await job.updateProgress(50);

    const intersectedFeatures = await GeoprocessingService.intersect(
      features1.features,
      features2.features
    );

    await job.updateProgress(80);

    const resultLayer = await LayerModel.createLayerWithFeatures(
      `${layer1.name} ∩ ${layer2.name}`,
      `Intersection of "${layer1.name}" and "${layer2.name}"`,
      'polygon',
      data.userId,
      intersectedFeatures
    );

    await job.updateProgress(100);

    return resultLayer.id;
  } catch (error) {
    console.error(`[Intersect Job ${job.id}] Error:`, error);
    throw error;
  }
}

/**
 * Handler for union analysis
 * Combines two geometries
 */
export async function handleUnionJob(
  data: any,
  job: Job
): Promise<number> {
  try {
    await job.updateProgress(10);

    const layer1 = await LayerModel.getLayerById(data.layerId1);
    if (!layer1) {
      throw new AppError(404, `Layer 1 not found`);
    }

    const layer2 = await LayerModel.getLayerById(data.layerId2);
    if (!layer2) {
      throw new AppError(404, `Layer 2 not found`);
    }

    await job.updateProgress(30);

    const features1 = await LayerModel.getLayerFeatures(data.layerId1);
    const features2 = await LayerModel.getLayerFeatures(data.layerId2);

    if (!features1.features.length || !features2.features.length) {
      throw new AppError(400, 'Both layers must have features');
    }

    await job.updateProgress(50);

    const unionFeatures = await GeoprocessingService.union(
      features1.features,
      features2.features
    );

    await job.updateProgress(80);

    const resultLayer = await LayerModel.createLayerWithFeatures(
      `${layer1.name} ∪ ${layer2.name}`,
      `Union of "${layer1.name}" and "${layer2.name}"`,
      'polygon',
      data.userId,
      unionFeatures
    );

    await job.updateProgress(100);

    return resultLayer.id;
  } catch (error) {
    console.error(`[Union Job ${job.id}] Error:`, error);
    throw error;
  }
}
