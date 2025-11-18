import { Router, Request, Response, NextFunction } from 'express';
import { RoutingController } from '../controllers/routing.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};

router.use(authMiddleware);

// POST /api/routing/route
router.post(
  '/route',
  asyncHandler(async (req: Request, res: Response) => {
    await RoutingController.calculateRoute(req, res);
  })
);

// POST /api/routing/isochrone
router.post(
  '/isochrone',
  asyncHandler(async (req: Request, res: Response) => {
    await RoutingController.calculateIsochrone(req, res);
  })
);

export default router;
