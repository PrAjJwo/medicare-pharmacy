import { Router } from 'express';
import {
  getMedicines, getMedicineById, createMedicine, updateMedicine, deleteMedicine,
  getCategories, createCategory,
} from '../controllers/medicine.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/categories', getCategories);
router.post('/categories', authorize('ADMIN'), createCategory);

router.get('/', getMedicines);
router.get('/:id', getMedicineById);
router.post('/', authorize('ADMIN', 'PHARMACIST'), createMedicine);
router.put('/:id', authorize('ADMIN', 'PHARMACIST'), updateMedicine);
router.delete('/:id', authorize('ADMIN'), deleteMedicine);

export default router;
