import { Router } from 'express';
import * as chatController from '../controllers/chatController';
import * as leadController from '../controllers/leadController';

const router = Router({ mergeParams: true });

router.post('/:botId/start', chatController.startConversation);
router.post('/:botId/message', chatController.sendMessage);
router.post('/:botId/ai-message', chatController.sendAIMessage); // LLM-only endpoint (body: message, sessionId?, stream?)
router.get('/:botId/history/:sessionId', chatController.getHistory);
router.post('/:botId/end/:sessionId', chatController.endConversation);
router.post('/:botId/escalate', chatController.escalateConversation); // body: { sessionId, reason? }
router.post('/:botId/lead', leadController.captureLead); // body: { sessionId, name?, email?, phone? }
router.post('/:botId/feedback', chatController.submitFeedback); // body: { sessionId, rating?, comment? }

export default router;
