import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../services/api';
import type { StockBatch, Sale } from '../types';

interface CartItem {
  stockBatchId: string;
  medicineId: string;
  medicineName: string;
  strength: string;
  batchNumber: string;
  unitPrice: number;
  quantity: number;
  maxQty: number;
  total: number;
}

function InvoiceModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal invoice-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invoice #{sale.invoiceNo}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
            <button className="modal-close" onClick={onClose}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="modal-body">
          <div className="invoice-header">
            <div>
              <div className="invoice-shop-name">Medicare Pharmacy</div>
              <div className="invoice-meta">Invoice: {sale.invoiceNo}</div>
              <div className="invoice-meta">{format(new Date(sale.createdAt), 'dd MMM yyyy, hh:mm a')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="invoice-meta">Served by: {(sale as any).user?.name}</div>
            </div>
          </div>

          <table style={{ marginTop: '16px' }}>
            <thead>
              <tr>
                <th>Medicine</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.saleItems.map(item => (
                <tr key={item.id}>
                  <td>{item.medicine?.name ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>Rs. {Number(item.unitPrice).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>Rs. {Number(item.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-totals">
            <div className="invoice-total-row">
              <span>Subtotal</span>
              <span>Rs. {(Number(sale.totalAmount) + Number(sale.discount)).toLocaleString()}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="invoice-total-row">
                <span>Discount</span>
                <span>- Rs. {Number(sale.discount).toLocaleString()}</span>
              </div>
            )}
            <div className="invoice-total-row invoice-grand-total">
              <span>Total</span>
              <span>Rs. {Number(sale.totalAmount).toLocaleString()}</span>
            </div>
            <div className="invoice-total-row">
              <span>Paid</span>
              <span>Rs. {Number(sale.paidAmount).toLocaleString()}</span>
            </div>
            <div className="invoice-total-row">
              <span>Change</span>
              <span>Rs. {Number(sale.changeAmount).toLocaleString()}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Thank you for your purchase!
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [tab, setTab] = useState<'pos' | 'history'>('pos');
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: stockBatches = [] } = useQuery({
    queryKey: ['available-stock', search],
    queryFn: () => api.get<{ data: StockBatch[] }>(`/sales/available-stock?search=${search}`).then(r => r.data.data),
    enabled: search.length >= 1,
  });

  const { data: salesHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['sales-history'],
    queryFn: () => api.get<{ data: Sale[] }>('/sales').then(r => r.data.data),
    enabled: tab === 'history',
  });

  const saleMutation = useMutation({
    mutationFn: (data: any) => api.post<{ data: Sale }>('/sales', data),
    onSuccess: (res) => {
      setCompletedSale(res.data.data);
      setCart([]);
      setDiscount('');
      setPaidAmount('');
      setSearch('');
      qc.invalidateQueries({ queryKey: ['stock-batches'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['sales-history'] });
      toast.success('Sale completed');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Sale failed'),
  });

  const addToCart = (batch: StockBatch) => {
    setCart(prev => {
      const existing = prev.find(i => i.stockBatchId === batch.id);
      if (existing) {
        if (existing.quantity >= existing.maxQty) {
          toast.error('Max available quantity reached');
          return prev;
        }
        return prev.map(i => i.stockBatchId === batch.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
          : i
        );
      }
      return [...prev, {
        stockBatchId: batch.id,
        medicineId: batch.medicineId,
        medicineName: batch.medicine?.name ?? '',
        strength: batch.medicine?.strength ?? '',
        batchNumber: batch.batchNumber,
        unitPrice: Number(batch.sellingPrice),
        quantity: 1,
        maxQty: batch.remainingQty,
        total: Number(batch.sellingPrice),
      }];
    });
    setSearch('');
    searchRef.current?.focus();
  };

  const updateQty = (batchId: string, qty: number) => {
    if (qty < 1) return;
    setCart(prev => prev.map(i => i.stockBatchId === batchId
      ? { ...i, quantity: Math.min(qty, i.maxQty), total: Math.min(qty, i.maxQty) * i.unitPrice }
      : i
    ));
  };

  const removeItem = (batchId: string) => setCart(prev => prev.filter(i => i.stockBatchId !== batchId));

  const subtotal = cart.reduce((sum, i) => sum + i.total, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = subtotal - discountAmt;
  const paid = parseFloat(paidAmount) || 0;
  const change = paid - total;

  const handleCheckout = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (paid < total) { toast.error('Paid amount is less than total'); return; }
    saleMutation.mutate({
      items: cart.map(i => ({ stockBatchId: i.stockBatchId, quantity: i.quantity })),
      discount: discountAmt,
      paidAmount: paid,
    });
  };

  return (
    <div className="page">
      <div className="tab-bar" style={{ marginBottom: '20px' }}>
        <button className={'tab-btn' + (tab === 'pos' ? ' active' : '')} onClick={() => setTab('pos')}>New sale</button>
        <button className={'tab-btn' + (tab === 'history' ? ' active' : '')} onClick={() => setTab('history')}>Sales history</button>
      </div>

      {tab === 'pos' ? (
        <div className="pos-layout">
          <div className="pos-left">
            <div className="pos-search-wrap">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="search-icon">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={searchRef}
                className="search-input"
                placeholder="Search medicine by name or brand..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {search.length >= 1 && (
              <div className="medicine-results">
                {stockBatches.length === 0 ? (
                  <div className="medicine-result-empty">No available stock found for "{search}"</div>
                ) : (
                  stockBatches.map(batch => (
                    <button key={batch.id} className="medicine-result-item" onClick={() => addToCart(batch)}>
                      <div className="medicine-result-name">
                        {batch.medicine?.name}
                        {batch.medicine?.strength && <span className="medicine-result-strength">{batch.medicine.strength}</span>}
                      </div>
                      <div className="medicine-result-meta">
                        Batch: {batch.batchNumber} &nbsp;|&nbsp; Stock: {batch.remainingQty} &nbsp;|&nbsp; Rs. {Number(batch.sellingPrice).toLocaleString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="cart-wrap">
              {cart.length === 0 ? (
                <div className="cart-empty">Search and add medicines above to start a sale</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Batch</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.stockBatchId}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{item.medicineName}</div>
                          {item.strength && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{item.strength}</div>}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.batchNumber}</td>
                        <td style={{ textAlign: 'right' }}>Rs. {item.unitPrice.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="qty-control">
                            <button onClick={() => updateQty(item.stockBatchId, item.quantity - 1)}>-</button>
                            <input
                              type="number"
                              value={item.quantity}
                              min={1}
                              max={item.maxQty}
                              onChange={e => updateQty(item.stockBatchId, parseInt(e.target.value) || 1)}
                            />
                            <button onClick={() => updateQty(item.stockBatchId, item.quantity + 1)}>+</button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>Rs. {item.total.toLocaleString()}</td>
                        <td>
                          <button className="action-btn action-btn-danger" onClick={() => removeItem(item.stockBatchId)}>
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="pos-right">
            <div className="pos-summary">
              <div className="pos-summary-title">Bill summary</div>

              <div className="pos-total-row">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>

              <div className="field" style={{ margin: '12px 0' }}>
                <label style={{ fontSize: '12.5px' }}>Discount (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="0"
                  style={{ marginTop: '4px' }}
                />
              </div>

              <div className="pos-total-row pos-grand-total">
                <span>Total</span>
                <span>Rs. {total.toLocaleString()}</span>
              </div>

              <div className="field" style={{ margin: '16px 0 8px' }}>
                <label style={{ fontSize: '12.5px' }}>Cash received (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)}
                  placeholder="Enter amount"
                  style={{ marginTop: '4px', fontSize: '16px', fontWeight: '600' }}
                />
              </div>

              {paid > 0 && (
                <div className="pos-change">
                  Change: Rs. {Math.max(0, change).toLocaleString()}
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '16px' }}
                onClick={handleCheckout}
                disabled={saleMutation.isPending || cart.length === 0}
              >
                {saleMutation.isPending ? 'Processing...' : 'Complete sale'}
              </button>

              {cart.length > 0 && (
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '8px' }}
                  onClick={() => { setCart([]); setDiscount(''); setPaidAmount(''); }}
                >
                  Clear cart
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          {loadingHistory ? (
            <div className="table-empty"><div className="spinner" /></div>
          ) : salesHistory.length === 0 ? (
            <div className="table-empty"><p>No sales recorded yet.</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Change</th>
                  <th>Staff</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.map(sale => (
                  <tr key={sale.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{sale.invoiceNo}</td>
                    <td>{format(new Date(sale.createdAt), 'dd MMM yyyy, hh:mm a')}</td>
                    <td>{sale.saleItems.length} item{sale.saleItems.length !== 1 ? 's' : ''}</td>
                    <td style={{ fontWeight: 500 }}>Rs. {Number(sale.totalAmount).toLocaleString()}</td>
                    <td>Rs. {Number(sale.paidAmount).toLocaleString()}</td>
                    <td>Rs. {Number(sale.changeAmount).toLocaleString()}</td>
                    <td>{(sale as any).user?.name ?? '-'}</td>
                    <td><span className="badge badge-green">Completed</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {completedSale && <InvoiceModal sale={completedSale} onClose={() => setCompletedSale(null)} />}
    </div>
  );
}