import { Request, Response } from 'express';
import prisma from '../config/db';

export const getStockBatches = async (_req: Request, res: Response) => {
  const batches = await prisma.stockBatch.findMany({
    include: { medicine: true },
    orderBy: { expiryDate: 'asc' },
  });
  res.json({ success: true, data: batches });
};

export const getExpiringStock = async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const expiring = await prisma.stockBatch.findMany({
    where: { expiryDate: { lte: cutoff }, remainingQty: { gt: 0 } },
    include: { medicine: true },
    orderBy: { expiryDate: 'asc' },
  });
  res.json({ success: true, data: expiring });
};

export const getLowStock = async (_req: Request, res: Response) => {
  const medicines = await prisma.medicine.findMany({ include: { stockBatches: true } });
  const lowStock = medicines.filter(med => {
    const total = med.stockBatches.reduce((sum, b) => sum + b.remainingQty, 0);
    return total <= med.minStockLevel;
  });
  res.json({ success: true, data: lowStock });
};
