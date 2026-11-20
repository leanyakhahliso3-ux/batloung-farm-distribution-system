import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

const emptyVendor = {
  vendor_name: '',
  phone_number: '',
  location: '',
  registration_date: new Date().toISOString().split('T')[0],
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyVendor);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadVendors = async (query = '') => {
    try {
      setError('');
      const endpoint = query.trim()
        ? `/vendors?search=${encodeURIComponent(query.trim())}`
        : '/vendors';
      const res = await apiRequest(endpoint);
      setVendors(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadVendors(search);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');

      if (editingId) {
        await apiRequest(`/vendors/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        setMessage('Vendor updated successfully.');
      } else {
        await apiRequest('/vendors', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setMessage('Vendor registered successfully.');
      }

      setForm(emptyVendor);
      setEditingId(null);
      loadVendors(search);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (vendor) => {
    setEditingId(vendor.vendor_id);
    setForm({
      vendor_name: vendor.vendor_name,
      phone_number: vendor.phone_number,
      location: vendor.location,
      registration_date: vendor.registration_date
        ? String(vendor.registration_date).slice(0, 10)
        : new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Vendors & Outstanding Balances</h1>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>Search Vendor by Name or Phone</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor name or +266..."
            style={{ flex: 1 }}
          />
          <button type="submit">Search</button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearch('');
              loadVendors('');
            }}
          >
            Reset
          </button>
        </form>
      </div>

      <div className="card">
        <h3>{editingId ? 'Edit Vendor' : 'Register New Vendor'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Vendor Name</label>
              <input
                type="text"
                value={form.vendor_name}
                onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                placeholder="e.g., Mamello Fresh Stall"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+26658123456"
                required
              />
            </div>

            <div className="form-group">
              <label>Location (Maseru)</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g., Maseru Central Market"
                required
              />
            </div>

            <div className="form-group">
              <label>Registration Date</label>
              <input
                type="date"
                value={form.registration_date}
                onChange={(e) => setForm({ ...form, registration_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit">{editingId ? 'Update Vendor' : 'Register Vendor'}</button>
            {editingId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyVendor);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Registered Vendors</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Vendor Name</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Reg. Date</th>
              <th>Outstanding Balance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr><td colSpan="7">No vendors found.</td></tr>
            ) : (
              vendors.map((v) => {
                const balance = Number(v.outstanding_balance || 0);
                return (
                  <tr key={v.vendor_id}>
                    <td>{v.vendor_id}</td>
                    <td>{v.vendor_name}</td>
                    <td>{v.phone_number}</td>
                    <td>{v.location}</td>
                    <td>{String(v.registration_date || '').slice(0, 10)}</td>
                    <td>
                      <span className={`badge ${balance > 0 ? 'badge-warning' : 'badge-success'}`}>
                        M {balance.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <button type="button" onClick={() => handleEdit(v)}>Edit</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
