import { Router } from 'express';
import { getDashboardStats } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/dashboard', getDashboardStats);

export default router;
