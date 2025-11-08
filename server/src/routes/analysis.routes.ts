import { Router, Request, Response, NextFunction } from 'express';
import { AnalysisController } from '../controllers/analysis.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
  bufferAnalysisSchema,
  clipAnalysisSchema,
  intersectAnalysisSchema,
  unionAnalysisSchema,
} from '../utils/validation.schemas';

const router = Router();

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};

// All analysis routes require authentication
router.use(authMiddleware);

/**
 * POST /api/analysis/buffer
 * Create a buffer analysis job
 */
router.post(
  '/buffer',
  validateBody(bufferAnalysisSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await AnalysisController.createBufferAnalysis(req, res);
  })
);

/**
 * POST /api/analysis/clip
 * Create a clip analysis job
 */
router.post(
  '/clip',
  validateBody(clipAnalysisSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await AnalysisController.createClipAnalysis(req, res);
  })
);

/**
 * POST /api/analysis/intersect
 * Create an intersect analysis job
 */
router.post(
  '/intersect',
  validateBody(intersectAnalysisSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await AnalysisController.createIntersectAnalysis(req, res);
  })
);

/**
 * POST /api/analysis/union
 * Create a union analysis job
 */
router.post(
  '/union',
  validateBody(unionAnalysisSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await AnalysisController.createUnionAnalysis(req, res);
  })
);

/**
 * GET /api/analysis/:jobId
 * Get job status
 */
router.get(
  '/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    await AnalysisController.getJobStatus(req, res);
  })
);

/**
 * DELETE /api/analysis/:jobId
 * Cancel a job
 */
router.delete(
  '/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    await AnalysisController.cancelJob(req, res);
  })
);

/**
 * GET /api/analysis/history
 * Get job history (optional - commented out for now)
 */
// router.get(
//   '/history',
//   asyncHandler(async (req: Request, res: Response) => {
//     await AnalysisController.getJobHistory(req, res);
//   })
// );

export default router;
