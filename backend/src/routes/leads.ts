import { Router } from 'express';
import { ensureBotAccess } from '../middleware/botAccess';
import * as leadController from '../controllers/leadController';

const router = Router({ mergeParams: true });

router.get('/', ensureBotAccess, leadController.listLeads);

export default router;
