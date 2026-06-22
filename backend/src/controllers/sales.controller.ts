import { Request, Response } from 'express';
import prisma from '../config/db';

function generateInvoiceNo(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}${m}${d}-${rand}`;
}

export const getSales = async (req: Request, res: Response) => {
  try {
    const { from, to, limit = '50' } = req.query as Record<string, string>;
    const sales = await prisma.sale.findMany({
      where: {
        ...(from && { createdAt: { gte: new Date(from) } }),
        ...(to && { createdAt: { lte: new Date(to) } }),
      },
      include: {
        user: { select: { id: true, name: true } },
        saleItems: { include: { medicine: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });
    res.json({ success: true, data: sales });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSaleById = async (req: Request, res: Response) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true } },
        saleItems: { include: { medicine: true, stockBatch: true } },
      },
    });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json({ success: true, data: sale });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createSale = async (req: any, res: Response) => {
  try {
    const { items, discount = 0, paidAmount, customerName, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in sale' });
    }

    // Validate stock and calculate totals
    let totalAmount = 0;
    const saleItems: any[] = [];

    for (const item of items) {
      const batch = await prisma.stockBatch.findUnique({
        where: { id: item.stockBatchId },
        include: { medicine: true },
      });

      if (!batch) return res.status(404).json({ message: `Stock batch not found` });
      if (batch.remainingQty < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${batch.medicine.name}. Available: ${batch.remainingQty}`,
        });
      }

      const itemTotal = item.quantity * Number(batch.sellingPrice);
      totalAmount += itemTotal;

      saleItems.push({
        medicineId: batch.medicineId,
        stockBatchId: batch.id,
        quantity: item.quantity,
        unitPrice: batch.sellingPrice,
        discount: 0,
        total: itemTotal,
      });
    }

    const finalTotal = totalAmount - Number(discount);
    const change = Number(paidAmount) - finalTotal;

    if (change < 0) {
      return res.status(400).json({ message: 'Paid amount is less than total' });
    }

    // Create sale and update stock in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          invoiceNo: generateInvoiceNo(),
          userId: req.user.id,
          totalAmount: finalTotal,
          discount: Number(discount),
          paidAmount: Number(paidAmount),
          changeAmount: change,
          status: 'COMPLETED',
          notes,
          saleItems: { create: saleItems },
        },
        include: {
          saleItems: { include: { medicine: true } },
          user: { select: { id: true, name: true } },
        },
      });

      // Deduct stock
      for (const item of items) {
        const batch = await tx.stockBatch.findUnique({ where: { id: item.stockBatchId } });
        if (!batch) continue;
        const newQty = batch.remainingQty - item.quantity;
        await tx.stockBatch.update({
          where: { id: item.stockBatchId },
          data: {
            remainingQty: newQty,
            status: newQty === 0 ? 'OUT_OF_STOCK' : newQty <= 10 ? 'LOW_STOCK' : 'IN_STOCK',
          },
        });
      }

      return newSale;
    });

    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAvailableStock = async (req: Request, res: Response) => {
  try {
    const { search } = req.query as { search?: string };

    const batches = await prisma.stockBatch.findMany({
      where: {
        remainingQty: { gt: 0 },
        status: { notIn: ['EXPIRED', 'OUT_OF_STOCK'] },
        medicine: {
          isActive: true,
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { genericName: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
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