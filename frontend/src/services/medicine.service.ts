import api from './api';
import type { Medicine, Category } from '../types';

export const medicineService = {
  getAll: (params?: { search?: string; categoryId?: string; isActive?: boolean }) =>
    api.get<{ data: Medicine[] }>('/medicines', { params }),
  getById: (id: string) =>
    api.get<{ data: Medicine }>(`/medicines/${id}`),
  create: (data: Partial<Medicine>) =>
    api.post<{ data: Medicine }>('/medicines', data),
  update: (id: string, data: Partial<Medicine>) =>
    api.put<{ data: Medicine }>(`/medicines/${id}`, data),
  delete: (id: string) =>
    api.delete(`/medicines/${id}`),
};

export const categoryService = {
  getAll: () => api.get<{ data: Category[] }>('/medicines/categories'),
  create: (name: string, description?: string) =>
    api.post<{ data: Category }>('/medicines/categories', { name, description }),
};
