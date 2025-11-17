import { Request, Response } from 'express';
import { getPool } from '../db/connection';
import { createBufferJob, createRadiusJob, analysisQueue } from '../queues/analysis.queue';
import { AppError } from '../middleware/error.middleware';
import { BufferAnalysisInput, ClipAnalysisInput, IntersectAnalysisInput, UnionAnalysisInput, RadiusAnalysisInput } from '../utils/validation.schemas';

export class AnalysisController {
  /**
   * Create a buffer analysis job
   * POST /api/analysis/buffer
   */
  static async createBufferAnalysis(req: Request, res: Response): Promise<void> {
    const { layerId, distance, units } = req.body as BufferAnalysisInput;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    // Verify layer exists and belongs to user or is default
    const pool = getPool();
    const layerResult = await pool.query(
      'SELECT id FROM layers WHERE id = $1 AND (is_default = true OR created_by = $2)',
      [layerId, userId]
    );

    if (layerResult.rows.length === 0) {
      throw new AppError(404, 'Layer not found or access denied');
    }

    // Create job in queue
    const jobId = await createBufferJob({
      layerId,
      distance,
      units: units || 'meters',
      userId,
    });

    // Store job record in database
    await pool.query(
      `INSERT INTO jobs (id, type, status, user_id, input_data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [jobId, 'buffer', 'queued', userId, JSON.stringify({ layerId, distance, units })]
    );

    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Analysis job created. Poll /api/analysis/:jobId for status.',
    });
  }

  /**
   * Create a clip analysis job
   * POST /api/analysis/clip
   */
  static async createClipAnalysis(req: Request, res: Response): Promise<void> {
    const { layerId, clipLayerId } = req.body as ClipAnalysisInput;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    // Verify both layers exist and user has access
    const pool = getPool();
    const layerResult = await pool.query(
      `SELECT id FROM layers WHERE id IN ($1, $2)
       AND (is_default = true OR created_by = $3)`,
      [layerId, clipLayerId, userId]
    );

    if (layerResult.rows.length !== 2) {
      throw new AppError(404, 'One or both layers not found or access denied');
    }

    // Create job in queue
    const jobId = `clip-${userId}-${Date.now()}`;
    const job = await analysisQueue.add('clip', { layerId, clipLayerId, userId }, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });

    // Store job record in database
    await pool.query(
      `INSERT INTO jobs (id, type, status, user_id, input_data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [jobId, 'clip', 'queued', userId, JSON.stringify({ layerId, clipLayerId })]
    );

    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Clip analysis job created. Poll /api/analysis/:jobId for status.',
    });
  }

  /**
   * Create an intersect analysis job
   * POST /api/analysis/intersect
   */
  static async createIntersectAnalysis(req: Request, res: Response): Promise<void> {
    const { layerId1, layerId2 } = req.body as IntersectAnalysisInput;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    // Verify both layers exist and user has access
    const pool = getPool();
    const layerResult = await pool.query(
      `SELECT id FROM layers WHERE id IN ($1, $2)
       AND (is_default = true OR created_by = $3)`,
      [layerId1, layerId2, userId]
    );

    if (layerResult.rows.length !== 2) {
      throw new AppError(404, 'One or both layers not found or access denied');
    }

    // Create job ID for intersect analysis
    const jobId = `intersect-${userId}-${Date.now()}`;
    const job = await analysisQueue.add('intersect', { layerId1, layerId2, userId }, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });

    // Store job record in database
    await pool.query(
      `INSERT INTO jobs (id, type, status, user_id, input_data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [jobId, 'intersect', 'queued', userId, JSON.stringify({ layerId1, layerId2 })]
    );

    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Intersect analysis job created. Poll /api/analysis/:jobId for status.',
    });
  }

  /**
   * Create a union analysis job
   * POST /api/analysis/union
   */
  static async createUnionAnalysis(req: Request, res: Response): Promise<void> {
    const { layerId1, layerId2 } = req.body as UnionAnalysisInput;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    // Verify both layers exist and user has access
    const pool = getPool();
    const layerResult = await pool.query(
      `SELECT id FROM layers WHERE id IN ($1, $2)
       AND (is_default = true OR created_by = $3)`,
      [layerId1, layerId2, userId]
    );

    if (layerResult.rows.length !== 2) {
      throw new AppError(404, 'One or both layers not found or access denied');
    }

    // Create job ID for union analysis
    const jobId = `union-${userId}-${Date.now()}`;
    const job = await analysisQueue.add('union', { layerId1, layerId2, userId }, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });

    // Store job record in database
    await pool.query(
      `INSERT INTO jobs (id, type, status, user_id, input_data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [jobId, 'union', 'queued', userId, JSON.stringify({ layerId1, layerId2 })]
    );

    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Union analysis job created. Poll /api/analysis/:jobId for status.',
    });
  }

  /**
   * Create a radius analysis job
   * POST /api/analysis/radius
   */
  static async createRadiusAnalysis(req: Request, res: Response): Promise<void> {
    const { longitude, latitude, radius, units, name } = req.body as RadiusAnalysisInput;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    // Create job in queue
    const jobId = await createRadiusJob({
      longitude,
      latitude,
      radius,
      units: units || 'meters',
      name,
      userId,
    });

    // Store job record in database
    const pool = getPool();
    await pool.query(
      `INSERT INTO jobs (id, type, status, user_id, input_data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [jobId, 'radius', 'queued', userId, JSON.stringify({ longitude, latitude, radius, units, name })]
    );

    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Radius analysis job created. Poll /api/analysis/:jobId for status.',
    });
  }

  /**
   * Get job status
   * GET /api/analysis/:jobId
   */
  static async getJobStatus(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    // Get job from BullMQ
    const job = await analysisQueue.getJob(jobId);

    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    // Get job from database
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM jobs WHERE id = $1 AND user_id = $2',
      [jobId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(403, 'Access denied to this job');
    }

    const jobRecord = result.rows[0];
    const jobState = await job.getState();

    res.status(200).json({
      jobId: job.id,
      type: jobRecord.type,
      status: jobState,
      progress: jobRecord.progress || 0,
      resultLayerId: jobRecord.result_layer_id,
      error: jobRecord.error_message,
      createdAt: jobRecord.created_at,
      completedAt: jobRecord.completed_at,
    });
  }

  /**
   * Cancel a job
   * DELETE /api/analysis/:jobId
   */
  static async cancelJob(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    // Check job ownership
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM jobs WHERE id = $1 AND user_id = $2',
      [jobId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(403, 'Access denied to this job');
    }

    const jobRecord = result.rows[0];

    // Check if job can be cancelled
    if (['completed', 'failed', 'cancelled'].includes(jobRecord.status)) {
      throw new AppError(400, `Cannot cancel job in ${jobRecord.status} state`);
    }

    // Get job from queue and remove it
    const job = await analysisQueue.getJob(jobId);

    if (job) {
      await job.remove();
    }

    // Update database
    await pool.query(
      'UPDATE jobs SET status = $1, completed_at = NOW() WHERE id = $2',
      ['cancelled', jobId]
    );

    res.status(200).json({
      jobId,
      status: 'cancelled',
      message: 'Job cancelled successfully',
    });
  }

  /**
   * Get job history for user
   * GET /api/analysis/history
   */
  static async getJobHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      throw new AppError(401, 'User ID not found in request');
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT id, type, status, progress, result_layer_id, error_message, created_at, completed_at
       FROM jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM jobs WHERE user_id = $1',
      [userId]
    );

    res.status(200).json({
      jobs: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });
  }
}
