import { Request, Response } from 'express';
import prisma from '../config/db';

export const getMedicines = async (_req: Request, res: Response) => {
  const medicines = await prisma.medicine.findMany({
    include: { category: true },
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: medicines });
};

export const getMedicineById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const medicine = await prisma.medicine.findUnique({
    where: { id },
    include: { category: true, stockBatches: true },
  });
  if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
  res.json({ success: true, data: medicine });
};

export const createMedicine = async (req: Request, res: Response) => {
  const medicine = await prisma.medicine.create({ data: req.body });
  res.status(201).json({ success: true, data: medicine });
};

export const updateMedicine = async (req: Request, res: Response) => {
  const { id } = req.params;
  const medicine = await prisma.medicine.update({ where: { id }, data: req.body });
  res.json({ success: true, data: medicine });
};

export const deleteMedicine = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.medicine.update({ where: { id }, data: { isActive: false } });
  res.json({ success: true, message: 'Medicine deactivated' });
};
