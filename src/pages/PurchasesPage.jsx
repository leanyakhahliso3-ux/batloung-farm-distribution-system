import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

const emptyItem = {
  fruit_id: '',
  packaging_size: 'small',
  quantity: 1,
  unit_cost: '',
};

export default function PurchasesPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [fruits, setFruits] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadInitialData = async () => {
    try {
      setError('');
      const [supRes, fruitRes, purRes] = await Promise.all([
        apiRequest('/suppliers'),
        apiRequest('/fruits'),
        apiRequest('/purchases'),
      ]);

      const supplierList = supRes.data || [];
      const fruitList = fruitRes.data || [];

      setSuppliers(supplierList);
      setFruits(fruitList);
      setPurchases(purRes.data || []);

      if (!supplierId && supplierList.length > 0) {
        setSupplierId(String(supplierList[0].supplier_id));
      }

      if (fruitList.length > 0 && !items[0].fruit_id) {
        setItems([{ ...emptyItem, fruit_id: String(fruitList[0].fruit_id) }]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const addItemRow = () => {
    const defaultFruitId = fruits.length > 0 ? String(fruits[0].fruit_id) : '';
    setItems([...items, { ...emptyItem, fruit_id: defaultFruitId }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = items.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item
    );
    setItems(updated);
  };

  const calculatedTotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const cost = Number(item.unit_cost) || 0;
    return sum + qty * cost;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');

      const payload = {
        supplier_id: Number(supplierId),
        items: items.map((item) => ({
          fruit_id: Number(item.fruit_id),
          packaging_size: item.packaging_size,
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost),
        })),
      };

      await apiRequest('/purchases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setMessage('Purchase recorded and stock updated successfully.');
      const defaultFruitId = fruits.length > 0 ? String(fruits[0].fruit_id) : '';
      setItems([{ ...emptyItem, fruit_id: defaultFruitId }]);
      loadInitialData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Record Fruit Purchases (Suppliers)</h1>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>New Purchase Order</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">Select a supplier</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.business_name} ({s.province})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Calculated Total Cost (LSL)</label>
              <input
                type="text"
                value={`M ${calculatedTotal.toFixed(2)}`}
                readOnly
                style={{ fontWeight: 700, backgroundColor: '#f9fafb' }}
              />
            </div>
          </div>

          <h4 style={{ margin: '1rem 0 0.5rem' }}>Fruit Items</h4>
          {items.map((item, idx) => (
            <div key={idx} className="form-grid" style={{ alignItems: 'end' }}>
              <div className="form-group">
                <label>Fruit</label>
                <select
                  value={item.fruit_id}
                  onChange={(e) => updateItem(idx, 'fruit_id', e.target.value)}
                  required
                >
                  <option value="">Select fruit</option>
                  {fruits.map((f) => (
                    <option key={f.fruit_id} value={f.fruit_id}>
                      {f.fruit_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Packaging Size</label>
                <select
                  value={item.packaging_size}
                  onChange={(e) => updateItem(idx, 'packaging_size', e.target.value)}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div className="form-group">
                <label>Boxes Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Unit Cost per Box (LSL)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unit_cost}
                  onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => removeItemRow(idx)}
                  disabled={items.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button type="button" className="btn-secondary" onClick={addItemRow}>
              + Add Another Fruit Item
            </button>
            <button type="submit">Submit Purchase</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Purchase History</h3>
        <table>
          <thead>
            <tr>
              <th>Purchase ID</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr><td colSpan="4">No purchases recorded yet.</td></tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.purchase_id}>
                  <td>#{p.purchase_id}</td>
                  <td>{p.business_name}</td>
                  <td>{String(p.purchase_date || '').replace('T', ' ').slice(0, 16)}</td>
                  <td><strong>M {Number(p.total_amount).toFixed(2)}</strong></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
