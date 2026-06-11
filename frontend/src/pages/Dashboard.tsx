import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={'stat-card stat-card-' + color}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/reports/dashboard').then(r => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  const stats = data ?? {
    totalMedicines: 0, totalStock: 0, lowStockCount: 0,
    expiringCount: 0, todaySales: 0, todayRevenue: 0, monthlyRevenue: 0,
  };

  return (
    <div className="page">
      <div className="stat-grid">
        <StatCard label="Total medicines"  value={stats.totalMedicines}  color="blue"   sub="in catalogue" />
        <StatCard label="Units in stock"   value={stats.totalStock}      color="green"  sub="across all batches" />
        <StatCard label="Low stock items"  value={stats.lowStockCount}   color="amber"  sub="need reorder" />
        <StatCard label="Expiring soon"    value={stats.expiringCount}   color="red"    sub="within 30 days" />
        <StatCard label="Sales today"      value={stats.todaySales}      color="blue"   sub="transactions" />
        <StatCard label="Revenue today"    value={'Rs. ' + (stats.todayRevenue ?? 0).toLocaleString()} color="green" />
        <StatCard label="Revenue this month" value={'Rs. ' + (stats.monthlyRevenue ?? 0).toLocaleString()} color="purple" />
      </div>

      {(stats.lowStockCount > 0 || stats.expiringCount > 0) && (
        <div className="alert-list">
          {stats.lowStockCount > 0 && (
            <div className="alert-item alert-amber">
              <strong>{stats.lowStockCount} medicine{stats.lowStockCount > 1 ? 's are' : ' is'} running low on stock.</strong>
              <a href="/inventory">View inventory</a>
            </div>
          )}
          {stats.expiringCount > 0 && (
            <div className="alert-item alert-red">
              <strong>{stats.expiringCount} batch{stats.expiringCount > 1 ? 'es expire' : ' expires'} within 30 days.</strong>
              <a href="/inventory">View batches</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
