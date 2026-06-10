export type Role = 'ADMIN' | 'PHARMACIST';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRED';
export type SaleStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export interface User { id: string; name: string; email: string; role: Role; isActive: boolean; createdAt: string; }
export interface Category { id: string; name: string; description?: string; }
export interface Medicine { id: string; name: string; genericName?: string; brand?: string; barcode?: string; categoryId: string; category: Category; dosageForm: string; strength?: string; unit: string; requiresPrescription: boolean; minStockLevel: number; isActive: boolean; stockBatches?: StockBatch[]; createdAt: string; }
export interface StockBatch { id: string; medicineId: string; medicine?: Medicine; batchNumber: string; quantity: number; remainingQty: number; purchasePrice: number; sellingPrice: number; expiryDate: string; status: StockStatus; createdAt: string; }
export interface Supplier { id: string; name: string; contactName?: string; phone?: string; email?: string; address?: string; isActive: boolean; }
export interface Sale { id: string; invoiceNo: string; userId: string; totalAmount: number; discount: number; paidAmount: number; status: SaleStatus; saleItems: SaleItem[]; createdAt: string; }
export interface SaleItem { id: string; saleId: string; medicineId: string; medicine?: Medicine; quantity: number; unitPrice: number; total: number; }
export interface DashboardStats { totalMedicines: number; totalStock: number; lowStockCount: number; expiringCount: number; todaySales: number; todayRevenue: number; monthlyRevenue: number; }
