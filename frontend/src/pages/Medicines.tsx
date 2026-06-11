import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { medicineService, categoryService } from '../services/medicine.service';
import type { Medicine, Category } from '../types';

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Suppository', 'Powder', 'Other'];

const emptyForm = {
  name: '', genericName: '', brand: '', barcode: '',
  categoryId: '', dosageForm: 'Tablet', strength: '',
  unit: 'pcs', requiresPrescription: false,
  description: '', minStockLevel: 10,
};

function MedicineModal({
  medicine, categories, onClose,
}: {
  medicine: Medicine | null;
  categories: Category[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(medicine ? {
    name: medicine.name,
    genericName: medicine.genericName ?? '',
    brand: medicine.brand ?? '',
    barcode: medicine.barcode ?? '',
    categoryId: medicine.categoryId,
    dosageForm: medicine.dosageForm,
    strength: medicine.strength ?? '',
    unit: medicine.unit,
    requiresPrescription: medicine.requiresPrescription,
    description: medicine.description ?? '',
    minStockLevel: medicine.minStockLevel,
  } : emptyForm);

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      medicine ? medicineService.update(medicine.id, data) : medicineService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicines'] });
      toast.success(medicine ? 'Medicine updated' : 'Medicine added');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Something went wrong');
    },
  });

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.categoryId || !form.dosageForm) {
      toast.error('Name, category and dosage form are required');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{medicine ? 'Edit Medicine' : 'Add Medicine'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="field">
              <label>Medicine name <span className="required">*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Paracetamol" required />
            </div>
            <div className="field">
              <label>Generic name</label>
              <input value={form.genericName} onChange={e => set('genericName', e.target.value)} placeholder="e.g. Acetaminophen" />
            </div>
            <div className="field">
              <label>Brand</label>
              <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Panadol" />
            </div>
            <div className="field">
              <label>Barcode</label>
              <input value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="Optional" />
            </div>
            <div className="field">
              <label>Category <span className="required">*</span></label>
              <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Dosage form <span className="required">*</span></label>
              <select value={form.dosageForm} onChange={e => set('dosageForm', e.target.value)}>
                {DOSAGE_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Strength</label>
              <input value={form.strength} onChange={e => set('strength', e.target.value)} placeholder="e.g. 500mg, 250mg/5ml" />
            </div>
            <div className="field">
              <label>Unit</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)}>
                <option value="pcs">Pieces</option>
                <option value="strip">Strip</option>
                <option value="bottle">Bottle</option>
                <option value="box">Box</option>
                <option value="vial">Vial</option>
                <option value="tube">Tube</option>
              </select>
            </div>
            <div className="field">
              <label>Min stock level</label>
              <input type="number" min="0" value={form.minStockLevel} onChange={e => set('minStockLevel', parseInt(e.target.value) || 0)} />
            </div>
            <div className="field field-checkbox">
              <label className="checkbox-label">
                <input type="checkbox" checked={form.requiresPrescription} onChange={e => set('requiresPrescription', e.target.checked)} />
                Requires prescription
              </label>
            </div>
          </div>

          <div className="field" style={{ marginTop: '4px' }}>
            <label>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes about this medicine" rows={2} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : medicine ? 'Save changes' : 'Add medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Medicines() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);

  const { data: medicines = [], isLoading } = useQuery({
    queryKey: ['medicines', search, categoryFilter],
    queryFn: () => medicineService.getAll({ search, categoryId: categoryFilter || undefined }).then(r => r.data.data),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll().then(r => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => medicineService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medicines'] });
      toast.success('Medicine removed');
    },
    onError: () => toast.error('Failed to remove medicine'),
  });

  const handleDelete = (med: Medicine) => {
    if (window.confirm(`Remove "${med.name}" from the catalogue?`)) {
      deleteMutation.mutate(med.id);
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (med: Medicine) => { setEditing(med); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <div className="section-title">Medicine Catalogue</div>
          <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {medicines.length} medicine{medicines.length !== 1 ? 's' : ''} found
          </div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add medicine
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            placeholder="Search medicines..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-empty"><div className="spinner" /></div>
        ) : medicines.length === 0 ? (
          <div className="table-empty">
            <p>No medicines found.</p>
            {!search && !categoryFilter && (
              <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={openAdd}>Add first medicine</button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Form</th>
                <th>Strength</th>
                <th>Unit</th>
                <th>Min stock</th>
                <th>Rx</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map(med => (
                <tr key={med.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{med.name}</div>
                    {med.genericName && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{med.genericName}</div>}
                    {med.brand && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{med.brand}</div>}
                  </td>
                  <td>{med.category?.name ?? '-'}</td>
                  <td>{med.dosageForm}</td>
                  <td>{med.strength ?? '-'}</td>
                  <td>{med.unit}</td>
                  <td>{med.minStockLevel}</td>
                  <td>
                    {med.requiresPrescription
                      ? <span className="badge badge-amber">Required</span>
                      : <span className="badge badge-green">No</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="action-btn" onClick={() => openEdit(med)} title="Edit">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="action-btn action-btn-danger" onClick={() => handleDelete(med)} title="Remove">
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

      {modalOpen && (
        <MedicineModal medicine={editing} categories={categories} onClose={closeModal} />
      )}
    </div>
  );
}
