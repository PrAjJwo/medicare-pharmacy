import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../services/api';

type Tab = 'sales' | 'stock' | 'expiry';

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card stat-card-blue" style={{ flex: 1 }}>
      <div className="stat-value" style={{ fontSize: '22px' }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function SalesReport() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading } = useQuery({
    queryKey: ['report-sales', from, to],
    queryFn: () => api.get(`/reports/sales?from=${from}&to=${to}`).then(r => r.data.data),
  });

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: '20px' }}>
        <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
          <label style={{ whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 500 }}>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="filter-select" />
        </div>
        <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
          <label style={{ whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 500 }}>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="filter-select" />
        </div>
      </div>

      {isLoading ? (
        <div className="page-loading"><div className="spinner" /><span>Loading report...</span></div>
      ) : data ? (
        <>
          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
            <StatBox label="Total revenue" value={`Rs. ${Number(data.summary.totalRevenue).toLocaleString()}`} />
            <StatBox label="Transactions" value={data.summary.totalTransactions} />
            <StatBox label="Avg per transaction" value={`Rs. ${Math.round(data.summary.avgTransaction).toLocaleString()}`} />
          </div>

          {data.chart.length > 0 && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="section-title" style={{ marginBottom: '16px' }}>Daily revenue</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.chart} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.topMedicines.length > 0 && (
            <div className="table-wrap">
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: '13.5px' }}>
                Top medicines by revenue
              </div>
              <table>
                <thead>
                  <tr><th>#</th><th>Medicine</th><th>Qty sold</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {data.topMedicines.map((m: any, i: number) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{m.name}</td>
                      <td>{m.qty}</td>
                      <td>Rs. {Number(m.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function StockReport() {
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['report-stock'],
    queryFn: () => api.get('/reports/stock').then(r => r.data.data),
  });

  const filtered = data.filter((m: any) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="filter-bar">
        <div className="search-wrap">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="search-input" placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="table-wrap">
        {isLoading ? (
          <div className="table-empty"><div className="spinner" /></div>
        ) : (
          <table>
            <thead>
              <tr><th>Medicine</th><th>Category</th><th>Total stock</th><th>Min level</th><th>Batches</th><th>Nearest expiry</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((m: any) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{m.name}</div>
                    {m.genericName && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{m.genericName}</div>}
                  </td>
                  <td>{m.category ?? '-'}</td>
                  <td style={{ fontWeight: 600 }}>{m.totalStock}</td>
                  <td>{m.minStockLevel}</td>
                  <td>{m.batchCount}</td>
                  <td>{m.nearestExpiry ? format(new Date(m.nearestExpiry), 'dd MMM yyyy') : '-'}</td>
                  <td>
                    {m.status === 'In stock' && <span className="badge badge-green">In stock</span>}
                    {m.status === 'Low stock' && <span className="badge badge-amber">Low stock</span>}
                    {m.status === 'Out of stock' && <span className="badge badge-red">Out of stock</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ExpiryReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-expiry'],
    queryFn: () => api.get('/reports/expiry').then(r => r.data.data),
  });

  if (isLoading) return <div className="page-loading"><div className="spinner" /><span>Loading...</span></div>;
  if (!data) return null;

  const sections = [
    { key: 'expired', label: 'Already expired', color: 'badge-red' },
    { key: 'in30days', label: 'Expiring within 30 days', color: 'badge-red' },
    { key: 'in60days', label: 'Expiring in 31-60 days', color: 'badge-amber' },
    { key: 'in90days', label: 'Expiring in 61-90 days', color: 'badge-blue' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {sections.map(section => (
        data[section.key].length > 0 && (
          <div key={section.key} className="table-wrap">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{section.label}</span>
              <span className={`badge ${section.color}`}>{data[section.key].length}</span>
            </div>
            <table>
              <thead>
                <tr><th>Medicine</th><th>Batch no.</th><th>Qty remaining</th><th>Expiry date</th></tr>
              </thead>
              <tbody>
                {data[section.key].map((b: any) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500 }}>{b.medicine?.name ?? '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{b.batchNumber}</td>
                    <td>{b.remainingQty}</td>
                    <td>{format(new Date(b.expiryDate), 'dd MMM yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ))}
      {sections.every(s => data[s.key].length === 0) && (
        <div className="table-empty"><p>No expiry concerns within 90 days.</p></div>
      )}
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState<Tab>('sales');

  return (
    <div className="page">
      <div className="tab-bar" style={{ marginBottom: '20px' }}>
        <button className={'tab-btn' + (tab === 'sales' ? ' active' : '')} onClick={() => setTab('sales')}>Sales report</button>
        <button className={'tab-btn' + (tab === 'stock' ? ' active' : '')} onClick={() => setTab('stock')}>Stock report</button>
        <button className={'tab-btn' + (tab === 'expiry' ? ' active' : '')} onClick={() => setTab('expiry')}>Expiry report</button>
      </div>

      {tab === 'sales' && <SalesReport />}
      {tab === 'stock' && <StockReport />}
      {tab === 'expiry' && <ExpiryReport />}
    </div>
  );
}