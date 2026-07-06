import { Request, Response } from 'express';
import prisma from '../config/db';

function generatePurchaseNo(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PO-${y}${m}${d}-${rand}`;
}

export const getPurchases = async (req: Request, res: Response) => {
  try {
    const { supplierId, status } = req.query as Record<string, string>;
    const purchases = await prisma.purchase.findMany({
      where: {
        ...(supplierId && { supplierId }),
        ...(status && { status: status as any }),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        purchaseItems: { include: { medicine: true } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: purchases });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPurchaseById = async (req: Request, res: Response) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        user: { select: { id: true, name: true } },
        purchaseItems: { include: { medicine: true } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    res.json({ success: true, data: purchase });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createPurchase = async (req: any, res: Response) => {
  try {
    const { supplierId, items, paidAmount = 0, purchaseDate, notes } = req.body;
    if (!supplierId) return res.status(400).json({ message: 'Supplier is required' });
    if (!items || items.length === 0) return res.status(400).json({ message: 'At least one item is required' });

    const totalAmount = items.reduce((sum: number, item: any) =>
      sum + parseInt(item.quantity) * parseFloat(item.purchasePrice), 0);
    const paid = parseFloat(paidAmount) || 0;
    const status = paid <= 0 ? 'UNPAID' : paid >= totalAmount ? 'PAID' : 'PARTIAL';

    const purchase = await prisma.$transaction(async (tx) => {
      const newPurchase = await tx.purchase.create({
        data: {
          invoiceNo: generatePurchaseNo(),
          supplierId,
          userId: req.user.id,
          totalAmount,
          paidAmount: paid,
          status: status as any,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          notes,
          purchaseItems: {
            create: items.map((item: any) => ({
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              quantity: parseInt(item.quantity),
              purchasePrice: parseFloat(item.purchasePrice),
              sellingPrice: parseFloat(item.sellingPrice),
              expiryDate: new Date(item.expiryDate),
              manufacturedDate: item.manufacturedDate ? new Date(item.manufacturedDate) : null,
              total: parseInt(item.quantity) * parseFloat(item.purchasePrice),
            })),
          },
          ...(paid > 0 && {
            payments: { create: [{ amount: paid, notes: 'Initial payment' }] },
          }),
        },
        include: {
          purchaseItems: { include: { medicine: true } },
          supplier: true,
          payments: true,
        },
      });

      for (const item of items) {
        const expiry = new Date(item.expiryDate);
        const daysToExpiry = Math.floor((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        await tx.stockBatch.create({
          data: {
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            quantity: parseInt(item.quantity),
            remainingQty: parseInt(item.quantity),
            purchasePrice: parseFloat(item.purchasePrice),
            sellingPrice: parseFloat(item.sellingPrice),
            expiryDate: expiry,
            manufacturedDate: item.manufacturedDate ? new Date(item.manufacturedDate) : null,
            supplierId,
            purchaseId: newPurchase.id,
            status: (daysToExpiry <= 0 ? 'EXPIRED' : 'IN_STOCK') as any,
          },
        });
      }
      return newPurchase;
    });

    res.status(201).json({ success: true, data: purchase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ message: 'Valid amount required' });

    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const newPaid = Number(purchase.paidAmount) + parseFloat(amount);
    const status = newPaid >= Number(purchase.totalAmount) ? 'PAID' : 'PARTIAL';

    const updated = await prisma.$transaction(async (tx) => {
      await tx.purchasePayment.create({ data: { purchaseId: id, amount: parseFloat(amount), notes } });
      return tx.purchase.update({
        where: { id },
        data: { paidAmount: newPaid, status: status as any },
        include: {
          supplier: { select: { id: true, name: true } },
          purchaseItems: { include: { medicine: true } },
          payments: { orderBy: { paidAt: 'desc' } },
        },
      });
    });
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSupplierBalance = async (_req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      include: { purchases: { select: { totalAmount: true, paidAmount: true, status: true } } },
      orderBy: { name: 'asc' },
    });
    const data = suppliers.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      totalPurchased: s.purchases.reduce((sum, p) => sum + Number(p.totalAmount), 0),
      totalPaid: s.purchases.reduce((sum, p) => sum + Number(p.paidAmount), 0),
      outstanding: s.purchases.reduce((sum, p) => sum + Number(p.totalAmount) - Number(p.paidAmount), 0),
      unpaidCount: s.purchases.filter(p => p.status !== 'PAID').length,
    }));
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
