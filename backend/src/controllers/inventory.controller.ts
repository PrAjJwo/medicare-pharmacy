import { Request, Response } from 'express';
import prisma from '../config/db';

export const getStockBatches = async (req: Request, res: Response) => {
  try {
    const { medicineId, supplierId, status } = req.query as Record<string, string>;

    const batches = await prisma.stockBatch.findMany({
      where: {
        ...(medicineId && { medicineId }),
        ...(supplierId && { supplierId }),
        ...(status && { status: status as any }),
      },
      include: {
        medicine: { include: { category: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    res.json({ success: true, data: batches });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addStockBatch = async (req: Request, res: Response) => {
  try {
    const {
      medicineId, batchNumber, quantity, purchasePrice,
      sellingPrice, expiryDate, manufacturedDate, supplierId,
    } = req.body;

    if (!medicineId || !batchNumber || !quantity || !sellingPrice || !expiryDate) {
      return res.status(400).json({ message: 'Medicine, batch number, quantity, selling price and expiry date are required' });
    }

    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysToExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'IN_STOCK' | 'LOW_STOCK' | 'EXPIRED' = 'IN_STOCK';
    if (daysToExpiry <= 0) status = 'EXPIRED';

    const batch = await prisma.stockBatch.create({
      data: {
        medicineId,
        batchNumber,
        quantity: parseInt(quantity),
        remainingQty: parseInt(quantity),
        purchasePrice: parseFloat(purchasePrice) || 0,
        sellingPrice: parseFloat(sellingPrice),
        expiryDate: expiry,
        manufacturedDate: manufacturedDate ? new Date(manufacturedDate) : null,
        supplierId: supplierId || null,
        status,
      },
      include: { medicine: true },
    });

    res.status(201).json({ success: true, data: batch });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateStockBatch = async (req: Request, res: Response) => {
  try {
    const { sellingPrice, purchasePrice, expiryDate, status } = req.body;
    const batch = await prisma.stockBatch.update({
      where: { id: req.params.id },
      data: {
        ...(sellingPrice && { sellingPrice: parseFloat(sellingPrice) }),
        ...(purchasePrice !== undefined && { purchasePrice: parseFloat(purchasePrice) }),
        ...(expiryDate && { expiryDate: new Date(expiryDate) }),
        ...(status && { status }),
      },
      include: { medicine: true },
    });
    res.json({ success: true, data: batch });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getExpiringStock = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const batches = await prisma.stockBatch.findMany({
      where: {
        expiryDate: { lte: cutoff },
        remainingQty: { gt: 0 },
        status: { not: 'EXPIRED' },
      },
      include: { medicine: { include: { category: true } }, supplier: { select: { id: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });

    res.json({ success: true, data: batches });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLowStock = async (_req: Request, res: Response) => {
  try {
    const medicines = await prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        stockBatches: {
          where: { remainingQty: { gt: 0 }, status: { not: 'EXPIRED' } },
        },
        category: true,
      },
    });

    const lowStock = medicines
      .map(med => ({
        ...med,
        totalStock: med.stockBatches.reduce((sum, b) => sum + b.remainingQty, 0),
      }))
      .filter(med => med.totalStock <= med.minStockLevel);

    res.json({ success: true, data: lowStock });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};