import { Request, Response } from 'express';
import prisma from '../config/db';

export const getMedicines = async (req: Request, res: Response) => {
  try {
    const { search, categoryId } = req.query as { search?: string; categoryId?: string };

    const medicines = await prisma.medicine.findMany({
      where: {
        isActive: true,
        ...(categoryId && { categoryId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { genericName: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: medicines });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMedicineById = async (req: Request, res: Response) => {
  try {
    const medicine = await prisma.medicine.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        stockBatches: { orderBy: { expiryDate: 'asc' } },
      },
    });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json({ success: true, data: medicine });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createMedicine = async (req: Request, res: Response) => {
  try {
    const { name, genericName, brand, barcode, categoryId, dosageForm, strength, unit, requiresPrescription, description, minStockLevel } = req.body;

    if (!name || !categoryId || !dosageForm) {
      return res.status(400).json({ message: 'Name, category and dosage form are required' });
    }

    if (barcode) {
      const existing = await prisma.medicine.findUnique({ where: { barcode } });
      if (existing) return res.status(409).json({ message: 'Barcode already in use' });
    }

    const medicine = await prisma.medicine.create({
      data: { name, genericName, brand, barcode: barcode || null, categoryId, dosageForm, strength, unit: unit ?? 'pcs', requiresPrescription: requiresPrescription ?? false, description, minStockLevel: minStockLevel ?? 10 },
      include: { category: true },
    });

    res.status(201).json({ success: true, data: medicine });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateMedicine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, genericName, brand, barcode, categoryId, dosageForm, strength, unit, requiresPrescription, description, minStockLevel } = req.body;

    if (barcode) {
      const existing = await prisma.medicine.findFirst({ where: { barcode, NOT: { id } } });
      if (existing) return res.status(409).json({ message: 'Barcode already in use by another medicine' });
    }

    const medicine = await prisma.medicine.update({
      where: { id },
      data: { name, genericName, brand, barcode: barcode || null, categoryId, dosageForm, strength, unit, requiresPrescription, description, minStockLevel },
      include: { category: true },
    });

    res.json({ success: true, data: medicine });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteMedicine = async (req: Request, res: Response) => {
  try {
    await prisma.medicine.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Medicine removed from catalogue' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: categories });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ message: 'Category already exists' });

    const category = await prisma.category.create({ data: { name, description } });
    res.status(201).json({ success: true, data: category });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
