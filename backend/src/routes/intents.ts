import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ensureBotAccess } from '../middleware/botAccess';
import * as intentController from '../controllers/intentController';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(ensureBotAccess);

router.get('/', intentController.listIntents);
router.get('/export', intentController.exportIntents);
router.post('/', intentController.createIntent);
router.post('/bulk-create', intentController.bulkCreateIntents);
router.post('/import', intentController.importIntents);
router.get('/:intentId', intentController.getIntent);
router.put('/:intentId', intentController.updateIntent);
router.delete('/:intentId', intentController.deleteIntent);

export default router;
