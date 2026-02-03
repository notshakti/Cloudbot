import { Router } from 'express';
import * as webhookController from '../controllers/webhookController';

const router = Router({ mergeParams: true });

router.all('/:botId/whatsapp', webhookController.whatsappWebhook);
router.all('/:botId/facebook', webhookController.facebookWebhook);
router.post('/:botId/slack', webhookController.slackWebhook);

export default router;
