import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

export default router;
