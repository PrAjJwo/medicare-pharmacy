import api from './api';
import type { Medicine } from '../types';
export const medicineService = {
  getAll: () => api.get<{ data: Medicine[] }>('/medicines'),
  getById: (id: string) => api.get<{ data: Medicine }>(`/medicines/${id}`),
  create: (data: Partial<Medicine>) => api.post<{ data: Medicine }>('/medicines', data),
  update: (id: string, data: Partial<Medicine>) => api.put<{ data: Medicine }>(`/medicines/${id}`, data),
  delete: (id: string) => api.delete(`/medicines/${id}`),
};
