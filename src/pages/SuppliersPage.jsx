import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

const SA_PROVINCES = [
  'Gauteng',
  'Free State',
  'KwaZulu-Natal',
  'Western Cape',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

const emptyForm = {
  business_name: '',
  contact_person: '',
  phone: '',
  province: 'Free State',
  address: '',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSuppliers = async () => {
    try {
      setError('');
      const res = await apiRequest('/suppliers');
      setSuppliers(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');

      if (editingId) {
        await apiRequest(`/suppliers/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        setMessage('Supplier updated successfully.');
      } else {
        await apiRequest('/suppliers', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setMessage('Supplier registered successfully.');
      }

      setForm(emptyForm);
      setEditingId(null);
      loadSuppliers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (supplier) => {
    setEditingId(supplier.supplier_id);
    setForm({
      business_name: supplier.business_name,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      province: supplier.province,
      address: supplier.address,
    });
    setMessage('');
    setError('');
  };

  const handleDelete = async (id) => {
    try {
      setError('');
      setMessage('');
      await apiRequest(`/suppliers/${id}`, { method: 'DELETE' });
      setMessage('Supplier deleted successfully.');
      loadSuppliers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Suppliers Management</h1>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>{editingId ? 'Edit Supplier' : 'Register New Supplier'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Business Name</label>
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="e.g., Highveld Fresh Orchards"
                required
              />
            </div>

            <div className="form-group">
              <label>Contact Person</label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                placeholder="e.g., Thabo Mokoena"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+27821112233"
                required
              />
            </div>

            <div className="form-group">
              <label>Province (South Africa)</label>
              <select
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
              >
                {SA_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, Town"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit">{editingId ? 'Update Supplier' : 'Save Supplier'}</button>
            {editingId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Registered Suppliers</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Business Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Province</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr><td colSpan="7">No suppliers found.</td></tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.supplier_id}>
                  <td>{s.supplier_id}</td>
                  <td>{s.business_name}</td>
                  <td>{s.contact_person}</td>
                  <td>{s.phone}</td>
                  <td>{s.province}</td>
                  <td>{s.address}</td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button type="button" onClick={() => handleEdit(s)}>Edit</button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleDelete(s.supplier_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
