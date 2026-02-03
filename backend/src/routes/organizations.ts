import { Response, NextFunction } from 'express';
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';
import * as organizationController from '../controllers/organizationController';

const router = Router({ mergeParams: true });

router.use(authenticate);

function ensureOrgAccess(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.orgId !== req.params.orgId) {
    res.status(403).json({ success: false, message: 'Access denied to this organization' });
    return;
  }
  next();
}

router.use(ensureOrgAccess);

router.get('/', organizationController.getOrganization);
router.put('/', requireRole('owner', 'admin'), organizationController.updateOrganization);
router.get('/usage', organizationController.getUsage);

export default router;
