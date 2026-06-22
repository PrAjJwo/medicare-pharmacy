import { Router } from 'express';
import { getStockBatches, addStockBatch, updateStockBatch, getExpiringStock, getLowStock } from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getStockBatches);
router.get('/expiring', getExpiringStock);
router.get('/low-stock', getLowStock);
router.post('/', authorize('ADMIN', 'PHARMACIST'), addStockBatch);
router.put('/:id', authorize('ADMIN', 'PHARMACIST'), updateStockBatch);

export default router;