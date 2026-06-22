import { Request, Response } from 'express';
import prisma from '../config/db';

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const [totalMedicines, allBatches, expiringBatches, todaySalesData, monthSalesData] =
      await Promise.all([
        prisma.medicine.count({ where: { isActive: true } }),
        prisma.stockBatch.findMany({
          select: { remainingQty: true, medicine: { select: { minStockLevel: true } }, medicineId: true },
        }),
        prisma.stockBatch.count({
          where: { expiryDate: { lte: thirtyDays }, remainingQty: { gt: 0 } },
        }),
        prisma.sale.aggregate({
          where: { status: 'COMPLETED', createdAt: { gte: today } },
          _count: true,
          _sum: { totalAmount: true },
        }),
        prisma.sale.aggregate({
          where: { status: 'COMPLETED', createdAt: { gte: monthStart } },
          _sum: { totalAmount: true },
        }),
      ]);

    const totalStock = allBatches.reduce((sum, b) => sum + b.remainingQty, 0);
    const byMed = new Map<string, { total: number; min: number }>();
    for (const b of allBatches) {
      const cur = byMed.get(b.medicineId) ?? { total: 0, min: b.medicine.minStockLevel };
      byMed.set(b.medicineId, { total: cur.total + b.remainingQty, min: cur.min });
    }
    const lowStockCount = [...byMed.values()].filter(v => v.total <= v.min).length;

    res.json({
      success: true,
      data: {
        totalMedicines,
        totalStock,
        lowStockCount,
        expiringCount: expiringBatches,
        todaySales: todaySalesData._count,
        todayRevenue: Number(todaySalesData._sum.totalAmount ?? 0),
        monthlyRevenue: Number(monthSalesData._sum.totalAmount ?? 0),
      },
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const { from, to, groupBy = 'day' } = req.query as Record<string, string>;

    const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: fromDate, lte: toDate } },
      include: { saleItems: { include: { medicine: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const grouped = new Map<string, { date: string; revenue: number; transactions: number }>();
    for (const sale of sales) {
      const d = new Date(sale.createdAt);
      let key: string;
      if (groupBy === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = d.toISOString().split('T')[0];
      }
      const existing = grouped.get(key) ?? { date: key, revenue: 0, transactions: 0 };
      grouped.set(key, {
        date: key,
        revenue: existing.revenue + Number(sale.totalAmount),
        transactions: existing.transactions + 1,
      });
    }

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalTransactions = sales.length;
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Top medicines by quantity sold
    const medicineMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const sale of sales) {
      for (const item of sale.saleItems) {
        const name = item.medicine?.name ?? 'Unknown';
        const cur = medicineMap.get(item.medicineId) ?? { name, qty: 0, revenue: 0 };
        medicineMap.set(item.medicineId, {
          name,
          qty: cur.qty + item.quantity,
          revenue: cur.revenue + Number(item.total),
        });
      }
    }
    const topMedicines = [...medicineMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        summary: { totalRevenue, totalTransactions, avgTransaction },
        chart: [...grouped.values()],
        topMedicines,
      },
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getStockReport = async (_req: Request, res: Response) => {
  try {
    const medicines = await prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        category: true,
        stockBatches: {
          where: { remainingQty: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = medicines.map(med => {
      const totalStock = med.stockBatches.reduce((sum, b) => sum + b.remainingQty, 0);
      const nearestExpiry = med.stockBatches[0]?.expiryDate ?? null;
      return {
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        category: med.category?.name,
        totalStock,
        minStockLevel: med.minStockLevel,
        status: totalStock === 0 ? 'Out of stock' : totalStock <= med.minStockLevel ? 'Low stock' : 'In stock',
        nearestExpiry,
        batchCount: med.stockBatches.length,
      };
    });

    res.json({ success: true, data });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getExpiryReport = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const in30 = new Date(); in30.setDate(today.getDate() + 30);
    const in60 = new Date(); in60.setDate(today.getDate() + 60);
    const in90 = new Date(); in90.setDate(today.getDate() + 90);

    const batches = await prisma.stockBatch.findMany({
      where: { expiryDate: { lte: in90 }, remainingQty: { gt: 0 } },
      include: { medicine: { include: { category: true } } },
      orderBy: { expiryDate: 'asc' },
    });

    const expired = batches.filter(b => new Date(b.expiryDate) < today);
    const in30days = batches.filter(b => new Date(b.expiryDate) >= today && new Date(b.expiryDate) <= in30);
    const in60days = batches.filter(b => new Date(b.expiryDate) > in30 && new Date(b.expiryDate) <= in60);
    const in90days = batches.filter(b => new Date(b.expiryDate) > in60 && new Date(b.expiryDate) <= in90);

    res.json({
      success: true,
      data: { expired, in30days, in60days, in90days },
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};