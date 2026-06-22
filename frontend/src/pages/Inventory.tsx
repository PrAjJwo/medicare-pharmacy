import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import api from '../services/api';
import type { StockBatch, Medicine, Supplier } from '../types';

function ExpiryBadge({ date }: { date: string }) {
  const days = differenceInDays(new Date(date), new Date());
  if (days < 0) return <span className="badge badge-red">Expired</span>;
  if (days <= 30) return <span className="badge badge-red">{days}d left</span>;
  if (days <= 60) return <span className="badge badge-amber">{days}d left</span>;
  return <span className="badge badge-green">{format(new Date(date), 'dd MMM yyyy')}</span>;
}

function AddStockModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    medicineId: '', supplierId: '', batchNumber: '',
    quantity: '', purchasePrice: '', sellingPrice: '',
    expiryDate: '', manufacturedDate: '',
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ['medicines'],
    queryFn: () => api.get<{ data: Medicine[] }>('/medicines').then(r => r.data.data),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get<{ data: Supplier[] }>('/suppliers').then(r => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/inventory', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Stock added successfully');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Something went wrong'),
  });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicineId || !form.batchNumber || !form.quantity || !form.sellingPrice || !form.expiryDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Stock</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Medicine <span className="required">*</span></label>
              <select value={form.medicineId} onChange={e => set('medicineId', e.target.value)} required>
                <option value="">Select medicine</option>
                {medicines.map(m => (
                  <option key={m.id} value={m.id}>{m.name} {m.strength ? `(${m.strength})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Party / Supplier</label>
              <select value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
                <option value="">Select party (optional)</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Batch number <span className="required">*</span></label>
              <input value={form.batchNumber} onChange={e => set('batchNumber', e.target.value)} placeholder="e.g. BT2024001" required />
            </div>
            <div className="field">
              <label>Quantity <span className="required">*</span></label>
              <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="e.g. 100" required />
            </div>
            <div className="field">
              <label>Purchase price (Rs.)</label>
              <input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} placeholder="Cost per unit" />
            </div>
            <div className="field">
              <label>Selling price (Rs.) <span className="required">*</span></label>
              <input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} placeholder="Price per unit" required />
            </div>
            <div className="field">
              <label>Manufactured date</label>
              <input type="date" value={form.manufacturedDate} onChange={e => set('manufacturedDate', e.target.value)} />
            </div>
            <div className="field">
              <label>Expiry date <span className="required">*</span></label>
              <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} required />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding...' : 'Add stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type Tab = 'all' | 'expiring' | 'low';

export default function Inventory() {
  const [tab, setTab] = useState<Tab>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: batches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ['stock-batches'],
    queryFn: () => api.get<{ data: StockBatch[] }>('/inventory').then(r => r.data.data),
    enabled: tab === 'all',
  });

  const { data: expiring = [], isLoading: loadingExpiring } = useQuery({
    queryKey: ['expiring-stock'],
    queryFn: () => api.get<{ data: StockBatch[] }>('/inventory/expiring?days=60').then(r => r.data.data),
    enabled: tab === 'expiring',
  });

  const { data: lowStock = [], isLoading: loadingLow } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.get<{ data: any[] }>('/inventory/low-stock').then(r => r.data.data),
    enabled: tab === 'low',
  });

  const currentData = tab === 'all' ? batches : tab === 'expiring' ? expiring : [];
  const isLoading = tab === 'all' ? loadingBatches : tab === 'expiring' ? loadingExpiring : loadingLow;

  const filtered = currentData.filter(b =>
    (b.medicine?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    b.batchNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title">Inventory</div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add stock
        </button>
      </div>

      <div className="tab-bar">
        {(['all', 'expiring', 'low'] as Tab[]).map(t => (
          <button key={t} className={'tab-btn' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t === 'all' ? 'All stock' : t === 'expiring' ? 'Expiring soon' : 'Low stock'}
          </button>
        ))}
      </div>

      {tab !== 'low' && (
        <div className="filter-bar">
          <div className="search-wrap">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="search-icon">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="search-input" placeholder="Search by medicine or batch..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-empty"><div className="spinner" /></div>
        ) : tab === 'low' ? (
          lowStock.length === 0 ? (
            <div className="table-empty"><p>No low stock items.</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>Medicine</th><th>Category</th><th>Current stock</th><th>Min level</th><th>Status</th></tr>
              </thead>
              <tbody>
                {lowStock.map((med: any) => (
                  <tr key={med.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{med.name}</div>
                      {med.genericName && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{med.genericName}</div>}
                    </td>
                    <td>{med.category?.name ?? '-'}</td>
                    <td style={{ fontWeight: 600, color: med.totalStock === 0 ? 'var(--color-red)' : 'var(--color-amber)' }}>
                      {med.totalStock}
                    </td>
                    <td>{med.minStockLevel}</td>
                    <td>
                      {med.totalStock === 0
                        ? <span className="badge badge-red">Out of stock</span>
                        : <span className="badge badge-amber">Low stock</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <p>{tab === 'expiring' ? 'No stock expiring within 60 days.' : 'No stock batches found.'}</p>
            {tab === 'all' && !search && (
              <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setModalOpen(true)}>Add first stock</button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Batch no.</th>
                <th>Party</th>
                <th>Qty remaining</th>
                <th>Selling price</th>
                <th>Purchase price</th>
                <th>Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{b.medicine?.name ?? '-'}</div>
                    {b.medicine?.strength && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{b.medicine.strength}</div>}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{b.batchNumber}</td>
                  <td>{(b as any).supplier?.name ?? '-'}</td>
                  <td style={{ fontWeight: 600 }}>{b.remainingQty} / {b.quantity}</td>
                  <td>Rs. {Number(b.sellingPrice).toLocaleString()}</td>
                  <td>{b.purchasePrice ? `Rs. ${Number(b.purchasePrice).toLocaleString()}` : '-'}</td>
                  <td><ExpiryBadge date={b.expiryDate} /></td>
                  <td>
                    {b.status === 'IN_STOCK' && <span className="badge badge-green">In stock</span>}
                    {b.status === 'LOW_STOCK' && <span className="badge badge-amber">Low</span>}
                    {b.status === 'OUT_OF_STOCK' && <span className="badge badge-red">Out</span>}
                    {b.status === 'EXPIRED' && <span className="badge badge-red">Expired</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <AddStockModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}