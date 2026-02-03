import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ensureBotAccess } from '../middleware/botAccess';
import * as botController from '../controllers/botController';
import * as testController from '../controllers/testController';
import * as trainingController from '../controllers/trainingController';
import intentRoutes from './intents';
import knowledgeBaseRoutes from './knowledgeBase';
import unrecognizedRoutes from './unrecognized';
import conversationRoutes from './conversations';
import leadRoutes from './leads';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', botController.listBots);
router.post('/', botController.createBot);
router.post('/from-description', botController.createBotFromDescription);
router.post('/from-template/:templateId', botController.createBotFromTemplate);
router.get('/:botId', botController.getBot);
router.put('/:botId', botController.updateBot);
router.delete('/:botId', botController.deleteBot);

router.get('/:botId/training-status', ensureBotAccess, trainingController.getTrainingStatus);
router.post('/:botId/validate', ensureBotAccess, trainingController.validateBot);
router.post('/:botId/test', ensureBotAccess, testController.testBot);
router.get('/:botId/embed-code', ensureBotAccess, botController.getEmbedCode);
router.get('/:botId/channels', ensureBotAccess, botController.getChannels);
router.put('/:botId/channels/:channel', ensureBotAccess, botController.updateChannel);
router.get('/:botId/analytics', ensureBotAccess, botController.getBotAnalytics);

router.use('/:botId/intents', intentRoutes);
router.use('/:botId/knowledge-base', knowledgeBaseRoutes);
router.use('/:botId/unrecognized', unrecognizedRoutes);
router.use('/:botId/conversations', conversationRoutes);
router.use('/:botId/leads', leadRoutes);

export default router;
