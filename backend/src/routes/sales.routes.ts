import { Router } from 'express';
import { getSales, getSaleById, createSale, getAvailableStock } from '../controllers/sales.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getSales);
router.get('/available-stock', getAvailableStock);
router.get('/:id', getSaleById);
router.post('/', createSale);

export default router;