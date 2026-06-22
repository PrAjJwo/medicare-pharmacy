import { Router } from 'express';
import { getDashboardStats, getSalesReport, getStockReport, getExpiryReport } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/sales', getSalesReport);
router.get('/stock', getStockReport);
router.get('/expiry', getExpiryReport);

export default router;