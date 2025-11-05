import { Router, Request, Response, NextFunction } from 'express';
import { LayersController } from '../controllers/layers.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { uploadLayerSchema } from '../utils/validation.schemas';

const router = Router();

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};

// All routes are protected
router.use(authMiddleware);

// GET /api/layers/default
router.get(
  '/default',
  asyncHandler(async (req: Request, res: Response) => {
    await LayersController.getDefaultLayers(req, res);
  })
);

// GET /api/layers/all - Get all layers (default + user's)
router.get(
  '/all/list',
  asyncHandler(async (req: Request, res: Response) => {
    await LayersController.getAllLayers(req, res);
  })
);

// GET /api/layers/user - Get only user's layers
router.get(
  '/user/list',
  asyncHandler(async (req: Request, res: Response) => {
    await LayersController.getUserLayers(req, res);
  })
);

// GET /api/layers/:layerId/features
router.get(
  '/:layerId/features',
  asyncHandler(async (req: Request, res: Response) => {
    await LayersController.getLayerFeatures(req, res);
  })
);

// POST /api/layers/upload
router.post(
  '/upload',
  validateBody(uploadLayerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await LayersController.uploadLayer(req, res);
  })
);

export default router;
