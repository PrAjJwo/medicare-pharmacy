import { Router } from 'express';
import authRoutes from './auth.routes';
import medicineRoutes from './medicine.routes';
import inventoryRoutes from './inventory.routes';
import salesRoutes from './sales.routes';
import supplierRoutes from './supplier.routes';
import reportRoutes from './report.routes';
import userRoutes from './user.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/medicines', medicineRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', salesRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);
export default router;
