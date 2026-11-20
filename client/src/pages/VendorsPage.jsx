import { useCallback, useEffect, useState } from 'react';
import { apiRequest, extractList } from '../api/client';
import Modal from '../components/Modal';
import TableToolbar from '../components/TableToolbar';

const INITIAL_FORM = { vendor_name: '', phone_number: '', location: '', registration_date: '' };

const formatBalance = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount) ? `M ${amount.toFixed(2)}` : '—';
};

const getVendorStatus = (vendor) => (Number(vendor.outstanding_balance || 0) <= 0 ? 'PAID' : 'PENDING');

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadVendors = useCallback(async () => {
    try {
      setVendors(extractList(await apiRequest('/vendors')));
      setError('');
    } catch (err) {
      setFeedback('');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadVendors);
  }, [loadVendors]);

  function openAdd() {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowForm(true);
    setFeedback('');
    setError('');
  }

  function openDetails(vendor) {
    setViewingVendor(vendor);
    setFeedback('');
    setError('');
  }

  function openEdit(vendor) {
    setForm({
      vendor_name: vendor.vendor_name || '',
      phone_number: vendor.phone_number || '',
      location: vendor.location || '',
      registration_date: String(vendor.registration_date || '').slice(0, 10),
    });
    setEditingId(vendor.vendor_id);
    setShowForm(true);
    setFeedback('');
    setError('');
  }

  async function handleSave(event) {
    event.preventDefault();
    const payload = {
      vendor_name: form.vendor_name.trim(),
      phone_number: form.phone_number.trim(),
      location: form.location.trim(),
      registration_date: form.registration_date || null,
    };
    if (!payload.vendor_name || !payload.phone_number || !payload.location) {
      setFeedback('');
      setError('Vendor name, phone number and location are required.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest(editingId ? `/vendors/${editingId}` : '/vendors', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setFeedback(editingId ? 'Vendor updated.' : 'Vendor added.');
      setForm(INITIAL_FORM);
      setEditingId(null);
      setShowForm(false);
      setError('');
      await loadVendors();
    } catch (err) {
      setFeedback('');
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(vendor) {
    if (!vendor.vendor_id) return;
    setDeleteTarget(vendor);
    setFeedback('');
    setError('');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.vendor_id;
    if (!id) return;

    setDeletingId(id);
    try {
      const response = await apiRequest(`/vendors/${id}`, { method: 'DELETE' });
      setFeedback(response.message || 'Vendor deleted.');
      setError('');
      await loadVendors();
    } catch (err) {
      setFeedback('');
      setError(err.message);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = vendors.filter((vendor) => {
    const matchesText = !q || [
      vendor.vendor_id, vendor.vendor_name, vendor.phone_number, vendor.location, vendor.registration_date,
    ].some((value) => String(value || '').toLowerCase().includes(q));
    const registrationDate = String(vendor.registration_date || '').slice(0, 10);
    const matchesDate = (!startDate || (registrationDate && registrationDate >= startDate))
      && (!endDate || (registrationDate && registrationDate <= endDate));
    const matchesStatus = statusFilter === 'ALL' || getVendorStatus(vendor) === statusFilter;
    return matchesText && matchesDate && matchesStatus;
  });

  return (
    <div className="records-page">
      <div className="page-header">
        <div>
          <h1>Vendors</h1>
          <p className="muted">Distribution partners and retail buyers</p>
        </div>
      </div>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vendors..."
        showDate
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        status={statusFilter}
        statusOptions={[{ value: 'PAID', label: 'Paid' }, { value: 'PENDING', label: 'Pending' }]}
        onStatusChange={setStatusFilter}
      >
        <button type="button" className="btn-primary" onClick={() => (showForm ? setShowForm(false) : openAdd())}>
          {showForm ? 'Cancel' : '+ Add Vendor'}
        </button>
      </TableToolbar>

      {feedback && <div className="alert alert-success">{feedback}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <form onSubmit={handleSave} className="record-form-card form-grid">
          <div className="form-group">
            <label htmlFor="vendor_name">Vendor Name</label>
            <input id="vendor_name" required value={form.vendor_name} onChange={(event) => setForm({ ...form, vendor_name: event.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="phone_number">Phone Number</label>
            <input id="phone_number" required value={form.phone_number} onChange={(event) => setForm({ ...form, phone_number: event.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input id="location" required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="registration_date">Registration Date</label>
            <input id="registration_date" type="date" value={form.registration_date} onChange={(event) => setForm({ ...form, registration_date: event.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Vendor' : 'Save Vendor'}</button>
          </div>
        </form>
      )}

      <div className="record-table-card">
        {loading ? (
          <p>Loading vendors...</p>
        ) : filtered.length === 0 ? (
          <p>No vendor records found.</p>
        ) : (
          <table className="record-table">
            <thead>
              <tr><th>ID</th><th>Vendor Name</th><th>Phone</th><th>Location</th><th>Registered</th><th>Outstanding Balance</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((vendor) => {
                const status = getVendorStatus(vendor);
                return (
                  <tr key={vendor.vendor_id}>
                    <td>{vendor.vendor_id}</td>
                    <td className="cell-name">{vendor.vendor_name}</td>
                    <td>{vendor.phone_number || '—'}</td>
                    <td>{vendor.location || '—'}</td>
                    <td>{String(vendor.registration_date || '').slice(0, 10) || '—'}</td>
                    <td>{formatBalance(vendor.outstanding_balance)}</td>
                    <td>
                      <span className={`status-pill ${status === 'PAID' ? 'status-paid' : 'status-pending'}`}>
                        {status === 'PAID' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={() => openDetails(vendor)}>View</button>
                      <button type="button" className="record-action" onClick={() => openEdit(vendor)}>Edit</button>
                      <button type="button" className="record-action" disabled={deletingId === vendor.vendor_id} onClick={() => requestDelete(vendor)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {viewingVendor && (
        <Modal
          title="Vendor Details"
          onClose={() => setViewingVendor(null)}
          footer={<button type="button" className="btn-secondary" onClick={() => setViewingVendor(null)}>Close</button>}
        >
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Vendor ID</span>
              <span className="detail-value">{viewingVendor.vendor_id ?? '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Vendor Name</span>
              <span className="detail-value">{viewingVendor.vendor_name || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone Number</span>
              <span className="detail-value">{viewingVendor.phone_number || '—'}</span>
            </div>
            <div className="detail-item detail-span">
              <span className="detail-label">Location</span>
              <span className="detail-value">{viewingVendor.location || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Registration Date</span>
              <span className="detail-value">{String(viewingVendor.registration_date || '').slice(0, 10) || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Outstanding Balance</span>
              <span className="detail-value">{formatBalance(viewingVendor.outstanding_balance)}</span>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete Vendor"
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
          <p>Delete vendor <strong>{deleteTarget.vendor_name || 'Vendor'}</strong>? This action cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
