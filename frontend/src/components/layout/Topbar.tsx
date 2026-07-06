import React from 'react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/':           { title: 'Dashboard',  description: 'Overview of pharmacy operations' },
  '/medicines':  { title: 'Medicines',  description: 'Manage your medicine catalogue' },
  '/inventory':  { title: 'Inventory',  description: 'Stock levels, batches and expiry tracking' },
  '/purchases':  { title: 'Purchases',  description: 'Party bills, payments and outstanding balances' },
  '/sales':      { title: 'Sales',      description: 'Process sales and manage invoices' },
  '/suppliers':  { title: 'Suppliers',  description: 'Manage suppliers and purchase orders' },
  '/reports':    { title: 'Reports',    description: 'Sales, stock and expiry reports' },
  '/settings':   { title: 'Settings',   description: 'System configuration' },
  '/users':      { title: 'Users',      description: 'Manage staff accounts' },
};

export default function Topbar() {
  const location = useLocation();
  const page = pageTitles[location.pathname] ?? { title: 'Medicare Pharmacy', description: '' };

  return (
    <header className="topbar">
      <div>
        <h1 className="topbar-title">{page.title}</h1>
        {page.description && <p className="topbar-desc">{page.description}</p>}
      </div>
      <div className="topbar-right">
        <div className="topbar-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </header>
  );
}
