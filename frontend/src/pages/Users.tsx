import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../services/api';
import type { User } from '../types';

function UserModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'PHARMACIST',
    phone: user?.phone ?? '',
    password: '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      user
        ? api.put(`/users/${user.id}`, { name: data.name, phone: data.phone, role: data.role })
        : api.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(user ? 'User updated' : 'User created');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Something went wrong'),
  });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error('Name and email are required'); return; }
    if (!user && !form.password) { toast.error('Password is required'); return; }
    if (!user && form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    mutation.mutate(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{user ? 'Edit User' : 'Add User'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="field">
              <label>Full name <span className="required">*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. John Doe" required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 9801234567" />
            </div>
            <div className="field">
              <label>Email <span className="required">*</span></label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="e.g. john@pharmacy.com" required disabled={!!user} />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="PHARMACIST">Pharmacist</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {!user && (
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Password <span className="required">*</span></label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 characters" />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : user ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.put(`/users/${user.id}/reset-password`, { newPassword: password }),
    onSuccess: () => { toast.success('Password reset successfully'); onClose(); },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to reset password'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Reset password</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Set a new password for <strong>{user.name}</strong>.
          </p>
          <div className="field">
            <label>New password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" autoFocus />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => { if (password.length < 8) { toast.error('Min 8 characters'); return; } mutation.mutate(); }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Resetting...' : 'Reset password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ data: User[] }>('/users').then(r => r.data.data),
  });

  const toggleActive = useMutation({
    mutationFn: (user: User) => api.put(`/users/${user.id}`, { isActive: !user.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated'); },
    onError: () => toast.error('Failed to update user'),
  });

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <div className="section-title">User Management</div>
          <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {users.length} staff account{users.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add user
        </button>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-empty"><div className="spinner" /></div>
        ) : users.length === 0 ? (
          <div className="table-empty"><p>No users found.</p></div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: user.role === 'ADMIN' ? 'var(--color-primary)' : 'var(--color-green)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 600, flexShrink: 0,
                      }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{user.name}</span>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone ?? '-'}</td>
                  <td>
                    <span className={`badge ${user.role === 'ADMIN' ? 'badge-blue' : 'badge-green'}`}>
                      {user.role === 'ADMIN' ? 'Admin' : 'Pharmacist'}
                    </span>
                  </td>
                  <td>
                    {user.isActive
                      ? <span className="badge badge-green">Active</span>
                      : <span className="badge badge-red">Inactive</span>}
                  </td>
                  <td>{format(new Date(user.createdAt), 'dd MMM yyyy')}</td>
                  <td>
                    <div className="row-actions">
                      <button className="action-btn" onClick={() => { setEditing(user); setModalOpen(true); }} title="Edit">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="action-btn" onClick={() => setResetting(user)} title="Reset password">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </button>
                      <button
                        className={`action-btn ${user.isActive ? 'action-btn-danger' : ''}`}
                        onClick={() => toggleActive.mutate(user)}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          {user.isActive
                            ? <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>
                            : <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                          }
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

      {modalOpen && <UserModal user={editing} onClose={() => { setModalOpen(false); setEditing(null); }} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}