import { Request, Response } from 'express';
import prisma from '../config/db';

export const getSuppliers = async (_req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: suppliers });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: {
        purchases: { orderBy: { purchaseDate: 'desc' }, take: 20 },
      },
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, contactName, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ message: 'Supplier name is required' });

    const supplier = await prisma.supplier.create({
      data: { name, contactName, phone, email, address },
    });
    res.status(201).json({ success: true, data: supplier });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { name, contactName, phone, email, address, isActive } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: { name, contactName, phone, email, address, isActive },
    });
    res.json({ success: true, data: supplier });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    await prisma.supplier.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Supplier deactivated' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};