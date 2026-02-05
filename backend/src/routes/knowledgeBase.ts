import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { ensureBotAccess } from '../middleware/botAccess';
import * as kbController from '../controllers/knowledgeBaseController';

const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Use PDF, DOCX, TXT, or CSV.'));
    }
  },
});

router.use(authenticate);
router.use(ensureBotAccess);

router.get('/', kbController.listKnowledgeBase);
router.post('/upload', (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Upload failed' });
      return;
    }
    next();
  });
}, kbController.uploadDocument);
router.post('/url', kbController.addUrl);
router.post('/faq', kbController.addFaq);
router.get('/search', kbController.searchKnowledgeBase);
router.get('/vector-stats', kbController.getVectorStats);
router.post('/upload-vector', (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Upload failed' });
      return;
    }
    next();
  });
}, kbController.uploadVectorDocument);
router.get('/:kbId', kbController.getKnowledgeBaseItem);
router.put('/:kbId', kbController.updateKnowledgeBaseItem);
router.delete('/:kbId', kbController.deleteKnowledgeBaseItem);

export default router;
