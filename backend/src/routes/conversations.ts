import { Router } from 'express';
import { ensureBotAccess } from '../middleware/botAccess';
import * as conversationController from '../controllers/conversationController';

const router = Router({ mergeParams: true });

router.get('/', ensureBotAccess, conversationController.listConversations);
router.get('/:conversationId', ensureBotAccess, conversationController.getConversation);
router.post('/:conversationId/resolve', ensureBotAccess, conversationController.resolveConversation);

export default router;
