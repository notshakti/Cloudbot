import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as templateController from '../controllers/templateController';

const router = Router();

router.use(authenticate);
router.get('/', templateController.getTemplates);

export default router;
