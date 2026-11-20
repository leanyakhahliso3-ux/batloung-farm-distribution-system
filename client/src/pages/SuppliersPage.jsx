import { useCallback, useEffect, useState } from 'react';
import { apiRequest, extractList } from '../api/client';
import Modal from '../components/Modal';
import TableToolbar from '../components/TableToolbar';
import { triggerActionOverlay } from '../utils/actionOverlay';

const PROVINCES = [
  'Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape',
  'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape',
];

const INITIAL_FORM = {
  business_name: '', contact_person: '', phone: '', province: PROVINCES[0], address: '',
};

const getSupplierId = (supplier) => supplier?.supplier_id ?? supplier?.id;
const getSupplierStatus = (supplier) => supplier.status || 'ACTIVE';

const todayLabel = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const supplierStatusMeta = (status) => {
  if (status === 'ACTIVE') return { label: 'Active', className: 'status-paid' };
  if (status === 'PENDING') return { label: 'Pending', className: 'status-pending' };
  return { label: 'Inactive', className: 'status-overdue' };
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [provinceFilter, setProvinceFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadSuppliers = useCallback(async () => {
    try {
      setSuppliers(extractList(await apiRequest('/suppliers')));
      setError('');
    } catch (err) {
      setFeedback('');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadSuppliers);
  }, [loadSuppliers]);

  function openAdd() {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowForm(true);
    setFeedback('');
    setError('');
  }

  function openDetails(supplier) {
    setViewingSupplier(supplier);
    setFeedback('');
    setError('');
  }

  function openEdit(supplier) {
    setForm({
      business_name: supplier.business_name || '',
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      province: supplier.province || PROVINCES[0],
      address: supplier.address || '',
    });
    setEditingId(getSupplierId(supplier));
    setShowForm(true);
    setFeedback('');
    setError('');
  }

  async function handleSave(event) {
    event.preventDefault();
    const payload = {
      business_name: form.business_name.trim(),
      contact_person: form.contact_person.trim(),
      phone: form.phone.trim(),
      province: form.province,
      address: form.address.trim(),
    };
    if (Object.values(payload).some((value) => !value)) {
      setFeedback('');
      setError('All supplier fields are required.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest(editingId ? `/suppliers/${editingId}` : '/suppliers', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setFeedback(editingId ? 'Supplier updated.' : 'Supplier added.');
      setForm(INITIAL_FORM);
      setEditingId(null);
      setShowForm(false);
      setError('');
      await loadSuppliers();
    } catch (err) {
      setFeedback('');
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(supplier) {
    const id = getSupplierId(supplier);
    if (id === undefined || id === null) return;
    setDeleteTarget(supplier);
    setFeedback('');
    setError('');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const id = getSupplierId(deleteTarget);
    if (id === undefined || id === null) return;

    setDeletingId(id);
    try {
      const response = await apiRequest(`/suppliers/${id}`, { method: 'DELETE' });
      setFeedback(response.message || 'Supplier deleted.');
      setError('');
      await loadSuppliers();
    } catch (err) {
      setFeedback('');
      setError(err.message);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  function openSupplierOnMap(supplierName, locationText) {
    const query = encodeURIComponent([supplierName, locationText, 'Maseru Lesotho'].filter(Boolean).join(' ').trim());
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    const tab = window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    if (!tab) window.location.assign(mapsUrl);
    triggerActionOverlay(supplierName || locationText || 'Find on Map');
  }

  const provinces = ['All', ...Array.from(new Set(suppliers.map((supplier) => supplier.province).filter(Boolean)))];
  const q = search.trim().toLowerCase();
  const searchWaiting = searchFocused && search.trim() === '';
  const filtered = suppliers.filter((supplier) => {
    const matchesProvince = provinceFilter === 'All' || supplier.province === provinceFilter;
    const matchesText = !q || [
      getSupplierId(supplier), supplier.business_name, supplier.contact_person,
      supplier.phone, supplier.province, supplier.address,
    ].some((value) => String(value || '').toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'ALL' || getSupplierStatus(supplier) === statusFilter;
    return matchesProvince && matchesText && matchesStatus;
  });

  const activeCount = suppliers.filter((supplier) => getSupplierStatus(supplier) === 'ACTIVE').length;
  const pendingCount = suppliers.filter((supplier) => getSupplierStatus(supplier) === 'PENDING').length;

  return (
    <div className="records-page supplier-page">
      <div className="card supplier-topbar">
        <div className="supplier-greeting">
          <span className="supplier-kicker">Suppliers Management</span>
          <h1>Welcome back, Julia</h1>
          <p>Farms and suppliers that provide fruit stock</p>
        </div>
        <div className="supplier-top-controls">
          <label className={`supplier-top-search${searchWaiting ? ' waiting-for-search' : ''}`}>
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search supplier, contact, phone..."
              aria-label="Search suppliers"
            />
          </label>
          <div className="supplier-context-chips">
            <span className="supplier-context-chip">{todayLabel}</span>
            <span className="supplier-context-chip">Currency: M</span>
            <span className="supplier-context-chip">Farm Desk</span>
          </div>
        </div>
      </div>

      <div className="summary-grid supplier-summary-grid">
        <div className="card summary-card">
          <div>
            <div className="summary-label">Total Suppliers</div>
            <div className="summary-number">{suppliers.length}</div>
          </div>
        </div>
        <div className="card summary-card">
          <div>
            <div className="summary-label">Active</div>
            <div className="summary-number">{activeCount}</div>
          </div>
        </div>
        <div className="card summary-card">
          <div>
            <div className="summary-label">Pending</div>
            <div className="summary-number">{pendingCount}</div>
          </div>
        </div>
      </div>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search supplier, contact, phone..."
        showSearch={false}
        status={statusFilter}
        statusOptions={[
          { value: 'ACTIVE', label: 'Active' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'INACTIVE', label: 'Inactive' },
        ]}
        onStatusChange={setStatusFilter}
      >
        <select value={provinceFilter} onChange={(event) => setProvinceFilter(event.target.value)}>
          {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
        </select>
        <button type="button" className="btn-primary" onClick={() => (showForm ? setShowForm(false) : openAdd())}>
          {showForm ? 'Cancel' : '+ Add Supplier'}
        </button>
      </TableToolbar>

      {feedback && <div className="alert alert-success">{feedback}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form onSubmit={handleSave} className="record-form-card form-grid">
          <div className="form-group">
            <label htmlFor="business_name">Business Name</label>
            <input id="business_name" required value={form.business_name} onChange={(event) => setForm({ ...form, business_name: event.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="contact_person">Contact Person</label>
            <input id="contact_person" required value={form.contact_person} onChange={(event) => setForm({ ...form, contact_person: event.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input id="phone" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="province">Province</label>
            <select id="province" value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })}>
              {PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input id="address" required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Supplier' : 'Save Supplier'}</button>
          </div>
        </form>
      )}

      <div className="record-table-card table-scroll supplier-table-card">
        {loading ? (
          <p className="loading-dots" aria-live="polite">
            <span>Loading suppliers</span>
            <span className="loading-dot loading-dot-1">.</span>
            <span className="loading-dot loading-dot-2">.</span>
            <span className="loading-dot loading-dot-3">.</span>
          </p>
        ) : filtered.length === 0 ? (
          <p>No suppliers found.</p>
        ) : (
          <table className="record-table supplier-table">
            <thead>
              <tr><th>ID</th><th>Business Name</th><th>Contact Person</th><th>Phone</th><th>Province</th><th>Address</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((supplier) => {
                const id = getSupplierId(supplier);
                const name = supplier.business_name || 'Supplier';
                const address = supplier.address || '';
                const statusMeta = supplierStatusMeta(getSupplierStatus(supplier));
                return (
                  <tr key={id}>
                    <td>{id}</td>
                    <td className="cell-name">{name}</td>
                    <td>{supplier.contact_person || '—'}</td>
                    <td>{supplier.phone || '—'}</td>
                    <td>{supplier.province || '—'}</td>
                    <td>{address || '—'}</td>
                    <td>
                      <span className={`status-pill ${statusMeta.className}`}>{statusMeta.label}</span>
                    </td>
                    <td className="table-actions">
                      <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={() => openDetails(supplier)}>View</button>
                      <button type="button" className="record-action" data-no-overlay="true" onClick={() => openSupplierOnMap(name, address)}>Find on Map</button>
                      <button type="button" className="record-action" onClick={() => openEdit(supplier)}>Edit</button>
                      <button type="button" className="record-action" disabled={deletingId === id} onClick={() => requestDelete(supplier)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {viewingSupplier && (
        <Modal
          title="Supplier Details"
          onClose={() => setViewingSupplier(null)}
          footer={<button type="button" className="btn-secondary" onClick={() => setViewingSupplier(null)}>Close</button>}
        >
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">ID</span>
              <span className="detail-value">{getSupplierId(viewingSupplier) ?? '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Business Name</span>
              <span className="detail-value">{viewingSupplier.business_name || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Contact Person</span>
              <span className="detail-value">{viewingSupplier.contact_person || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{viewingSupplier.phone || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Province</span>
              <span className="detail-value">{viewingSupplier.province || '—'}</span>
            </div>
            <div className="detail-item detail-span">
              <span className="detail-label">Address</span>
              <span className="detail-value">{viewingSupplier.address || '—'}</span>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete Supplier"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="btn-danger" onClick={handleDelete} disabled={deletingId !== null}>
                {deletingId !== null ? 'Deleting...' : 'Delete'}
              </button>
            </>
          }
        >
          <p>Delete <strong>{deleteTarget.business_name || 'Supplier'}</strong>? This action cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
