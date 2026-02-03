import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ensureBotAccess } from '../middleware/botAccess';
import * as unrecognizedController from '../controllers/unrecognizedController';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(ensureBotAccess);

router.get('/', unrecognizedController.listUnrecognized);
router.post('/:queryId/convert', unrecognizedController.convertToIntent);
router.delete('/:queryId', unrecognizedController.dismissUnrecognized);

export default router;
