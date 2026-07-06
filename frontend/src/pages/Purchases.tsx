import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../services/api';
import type { Medicine, Supplier } from '../types';

type Tab = 'purchases' | 'balance';
type PurchaseStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

interface PurchaseItemForm {
  medicineId: string; batchNumber: string; quantity: string;
  purchasePrice: string; sellingPrice: string; expiryDate: string; manufacturedDate: string;
}

const emptyItem = (): PurchaseItemForm => ({
  medicineId: '', batchNumber: '', quantity: '', purchasePrice: '', sellingPrice: '', expiryDate: '', manufacturedDate: '',
});

function StatusBadge({ status }: { status: PurchaseStatus }) {
  if (status === 'PAID') return <span className="badge badge-green">Paid</span>;
  if (status === 'PARTIAL') return <span className="badge badge-amber">Partial</span>;
  return <span className="badge badge-red">Unpaid</span>;
}

function PaymentModal({ purchase, onClose }: { purchase: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const outstanding = Number(purchase.totalAmount) - Number(purchase.paidAmount);

  const mutation = useMutation({
    mutationFn: () => api.post(`/purchases/${purchase.id}/payment`, { amount: parseFloat(amount), notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); qc.invalidateQueries({ queryKey: ['supplier-balance'] }); toast.success('Payment recorded'); onClose(); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Record Payment</h2>
          <button className="modal-close" onClick={onClose}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="modal-body">
          <div className="invoice-totals" style={{ marginBottom: '16px' }}>
            <div className="invoice-total-row"><span>Party</span><span style={{ fontWeight: 500 }}>{purchase.supplier?.name}</span></div>
            <div className="invoice-total-row"><span>Bill total</span><span>Rs. {Number(purchase.totalAmount).toLocaleString()}</span></div>
            <div className="invoice-total-row"><span>Already paid</span><span>Rs. {Number(purchase.paidAmount).toLocaleString()}</span></div>
            <div className="invoice-total-row invoice-grand-total"><span>Outstanding</span><span>Rs. {outstanding.toLocaleString()}</span></div>
          </div>
          <div className="field">
            <label>Payment amount (Rs.)</label>
            <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Max Rs. ${outstanding.toLocaleString()}`} autoFocus />
          </div>
          <div className="field" style={{ marginTop: '12px' }}>
            <label>Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Cash payment" />
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={mutation.isPending || !amount}
              onClick={() => { if (parseFloat(amount) > outstanding) { toast.error('Amount exceeds outstanding'); return; } mutation.mutate(); }}>
              {mutation.isPending ? 'Recording...' : 'Record payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewPurchaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [items, setItems] = useState<PurchaseItemForm[]>([emptyItem()]);

  const { data: medicines = [] } = useQuery({ queryKey: ['medicines'], queryFn: () => api.get<{ data: Medicine[] }>('/medicines').then(r => r.data.data) });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get<{ data: Supplier[] }>('/suppliers').then(r => r.data.data) });

  const mutation = useMutation({
    mutationFn: () => api.post('/purchases', { supplierId, items, paidAmount, purchaseDate, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['supplier-balance'] });
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Purchase recorded and stock updated');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to record purchase'),
  });

  const updateItem = (i: number, field: keyof PurchaseItemForm, value: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.purchasePrice) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) { toast.error('Select a party'); return; }
    for (const item of items) {
      if (!item.medicineId || !item.batchNumber || !item.quantity || !item.purchasePrice || !item.sellingPrice || !item.expiryDate) {
        toast.error('Fill all required fields for each medicine'); return;
      }
    }
    mutation.mutate();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '860px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Purchase Bill</h2>
          <button className="modal-close" onClick={onClose}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid" style={{ marginBottom: '20px' }}>
            <div className="field">
              <label>Party / Supplier <span className="required">*</span></label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                <option value="">Select party</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Purchase date</label>
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Medicines <span className="required">*</span></div>
              <button type="button" className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '12.5px' }} onClick={() => setItems(p => [...p, emptyItem()])}>+ Add row</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th><th>Batch no.</th><th>Qty</th>
                    <th>Purchase price</th><th>Selling price</th>
                    <th>Expiry date</th><th>Mfg date</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <select value={item.medicineId} onChange={e => updateItem(index, 'medicineId', e.target.value)} style={{ minWidth: '150px' }}>
                          <option value="">Select</option>
                          {medicines.map(m => <option key={m.id} value={m.id}>{m.name}{m.strength ? ` (${m.strength})` : ''}</option>)}
                        </select>
                      </td>
                      <td><input value={item.batchNumber} onChange={e => updateItem(index, 'batchNumber', e.target.value)} placeholder="BT001" style={{ width: '80px' }} /></td>
                      <td><input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} style={{ width: '60px' }} /></td>
                      <td><input type="number" min="0" step="0.01" value={item.purchasePrice} onChange={e => updateItem(index, 'purchasePrice', e.target.value)} style={{ width: '90px' }} /></td>
                      <td><input type="number" min="0" step="0.01" value={item.sellingPrice} onChange={e => updateItem(index, 'sellingPrice', e.target.value)} style={{ width: '90px' }} /></td>
                      <td><input type="date" value={item.expiryDate} onChange={e => updateItem(index, 'expiryDate', e.target.value)} /></td>
                      <td><input type="date" value={item.manufacturedDate} onChange={e => updateItem(index, 'manufacturedDate', e.target.value)} /></td>
                      <td>{items.length > 1 && <button type="button" className="action-btn action-btn-danger" onClick={() => setItems(p => p.filter((_, i) => i !== index))}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Amount paid now (Rs.)</label>
              <input type="number" min="0" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="0 if paying later" />
            </div>
            <div className="field">
              <label>Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div style={{ background: 'var(--color-bg)', borderRadius: '8px', padding: '12px 16px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13.5px', color: 'var(--color-text-muted)' }}>Total bill amount</span>
            <span style={{ fontSize: '18px', fontWeight: 700 }}>Rs. {totalAmount.toLocaleString()}</span>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Recording...' : 'Record purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Purchases() {
  const [tab, setTab] = useState<Tab>('purchases');
  const [newOpen, setNewOpen] = useState(false);
  const [paymentFor, setPaymentFor] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases', statusFilter],
    queryFn: () => api.get(`/purchases${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data.data),
    enabled: tab === 'purchases',
  });

  const { data: balances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ['supplier-balance'],
    queryFn: () => api.get('/purchases/supplier-balance').then(r => r.data.data),
    enabled: tab === 'balance',
  });

  return (
    <div className="page">
      <div className="section-header">
        <div className="tab-bar">
          <button className={'tab-btn' + (tab === 'purchases' ? ' active' : '')} onClick={() => setTab('purchases')}>Purchase bills</button>
          <button className={'tab-btn' + (tab === 'balance' ? ' active' : '')} onClick={() => setTab('balance')}>Party balances</button>
        </div>
        {tab === 'purchases' && (
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New purchase
          </button>
        )}
      </div>

      {tab === 'purchases' && (
        <>
          <div className="filter-bar">
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All status</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <div className="table-wrap">
            {isLoading ? <div className="table-empty"><div className="spinner" /></div>
            : purchases.length === 0 ? (
              <div className="table-empty">
                <p>No purchase bills found.</p>
                <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setNewOpen(true)}>Record first purchase</button>
              </div>
            ) : (
              <table>
                <thead>
                  <tr><th>Bill no.</th><th>Party</th><th>Date</th><th>Items</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {purchases.map((p: any) => {
                    const outstanding = Number(p.totalAmount) - Number(p.paidAmount);
                    return (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.invoiceNo}</td>
                        <td style={{ fontWeight: 500 }}>{p.supplier?.name}</td>
                        <td>{format(new Date(p.purchaseDate), 'dd MMM yyyy')}</td>
                        <td>{p.purchaseItems?.length ?? 0}</td>
                        <td>Rs. {Number(p.totalAmount).toLocaleString()}</td>
                        <td>Rs. {Number(p.paidAmount).toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: outstanding > 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
                          Rs. {outstanding.toLocaleString()}
                        </td>
                        <td><StatusBadge status={p.status} /></td>
                        <td>
                          {p.status !== 'PAID' && (
                            <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => setPaymentFor(p)}>Pay</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'balance' && (
        <div className="table-wrap">
          {loadingBalances ? <div className="table-empty"><div className="spinner" /></div>
          : balances.length === 0 ? <div className="table-empty"><p>No party balances found.</p></div>
          : (
            <table>
              <thead>
                <tr><th>Party</th><th>Phone</th><th>Total purchased</th><th>Total paid</th><th>Outstanding</th><th>Unpaid bills</th></tr>
              </thead>
              <tbody>
                {balances.map((b: any) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500 }}>{b.name}</td>
                    <td>{b.phone ?? '-'}</td>
                    <td>Rs. {Number(b.totalPurchased).toLocaleString()}</td>
                    <td>Rs. {Number(b.totalPaid).toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: b.outstanding > 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
                      Rs. {Number(b.outstanding).toLocaleString()}
                    </td>
                    <td>
                      {b.unpaidCount > 0
                        ? <span className="badge badge-red">{b.unpaidCount} bill{b.unpaidCount > 1 ? 's' : ''}</span>
                        : <span className="badge badge-green">All clear</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {newOpen && <NewPurchaseModal onClose={() => setNewOpen(false)} />}
      {paymentFor && <PaymentModal purchase={paymentFor} onClose={() => setPaymentFor(null)} />}
    </div>
  );
}
