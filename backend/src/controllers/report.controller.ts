import { Request, Response } from 'express';
import prisma from '../config/db';

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const [
      totalMedicines,
      allBatches,
      expiringBatches,
      todaySalesData,
      monthSalesData,
    ] = await Promise.all([
      prisma.medicine.count({ where: { isActive: true } }),
      prisma.stockBatch.findMany({ select: { remainingQty: true, medicine: { select: { minStockLevel: true } }, medicineId: true } }),
      prisma.stockBatch.count({ where: { expiryDate: { lte: thirtyDays }, remainingQty: { gt: 0 } } }),
      prisma.sale.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: today } }, _count: true, _sum: { totalAmount: true } }),
      prisma.sale.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: monthStart } }, _sum: { totalAmount: true } }),
    ]);

    const totalStock = allBatches.reduce((sum, b) => sum + b.remainingQty, 0);

    // Group by medicineId to find low stock medicines
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
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
