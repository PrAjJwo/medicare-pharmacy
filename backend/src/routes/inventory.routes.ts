import { Router } from 'express';
import { getStockBatches, getExpiringStock, getLowStock } from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', getStockBatches);
router.get('/expiring', getExpiringStock);
router.get('/low-stock', getLowStock);

export default router;
