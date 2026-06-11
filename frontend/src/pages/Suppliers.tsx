import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Supplier } from '../types';

const emptyForm = { name: '', contactName: '', phone: '', email: '', address: '' };

function SupplierModal({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(supplier ? {
    name: supplier.name,
    contactName: supplier.contactName ?? '',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    address: supplier.address ?? '',
  } : emptyForm);

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      supplier
        ? api.put(`/suppliers/${supplier.id}`, data)
        : api.post('/suppliers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(supplier ? 'Party updated' : 'Party added');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Something went wrong'),
  });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{supplier ? 'Edit Party' : 'Add Party'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!form.name) { toast.error('Party name is required'); return; } mutation.mutate(form); }} className="modal-body">
          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Party / Company name <span className="required">*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Himalayan Pharma Distributors" required />
            </div>
            <div className="field">
              <label>Contact person</label>
              <input value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="e.g. Ram Sharma" />
            </div>
            <div className="field">
              <label>Phone number</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 9801234567" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="e.g. contact@party.com" />
            </div>
            <div className="field">
              <label>Address</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. Kathmandu, Nepal" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : supplier ? 'Save changes' : 'Add party'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get<{ data: Supplier[] }>('/suppliers').then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Party removed'); },
    onError: () => toast.error('Failed to remove party'),
  });

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setModalOpen(true); };

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <div className="section-title">Party Management</div>
          <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {suppliers.length} parties registered
          </div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add party
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="search-input" placeholder="Search parties..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-empty"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <p>No parties found.</p>
            {!search && <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={openAdd}>Add first party</button>}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Party name</th>
                <th>Contact person</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td>{s.contactName ?? '-'}</td>
                  <td>{s.phone ?? '-'}</td>
                  <td>{s.email ?? '-'}</td>
                  <td>{s.address ?? '-'}</td>
                  <td>
                    {s.isActive
                      ? <span className="badge badge-green">Active</span>
                      : <span className="badge badge-red">Inactive</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="action-btn" onClick={() => openEdit(s)} title="Edit">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="action-btn action-btn-danger" onClick={() => { if (window.confirm(`Remove "${s.name}"?`)) deleteMutation.mutate(s.id); }} title="Remove">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <SupplierModal supplier={editing} onClose={() => { setModalOpen(false); setEditing(null); }} />}
    </div>
  );
}