import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

export default function FruitsStockPage() {
  const [fruits, setFruits] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [newFruit, setNewFruit] = useState({
    fruit_name: '',
    description: '',
    status: 'AVAILABLE',
    small_price: '80.00',
    medium_price: '150.00',
    large_price: '250.00',
  });
  const [editingFruit, setEditingFruit] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadFruitsAndStock = async () => {
    try {
      setError('');
      const [fruitsRes, stockRes] = await Promise.all([
        apiRequest('/fruits'),
        apiRequest('/fruits/stock'),
      ]);
      setFruits(fruitsRes.data || []);
      setStockRows(stockRes.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadFruitsAndStock();
  }, []);

  const handleCreateFruit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      await apiRequest('/fruits', {
        method: 'POST',
        body: JSON.stringify({
          fruit_name: newFruit.fruit_name,
          description: newFruit.description,
          status: newFruit.status,
          prices: {
            small: Number(newFruit.small_price),
            medium: Number(newFruit.medium_price),
            large: Number(newFruit.large_price),
          },
        }),
      });
      setMessage('New fruit registered with small, medium, and large stock entries.');
      setNewFruit({
        fruit_name: '',
        description: '',
        status: 'AVAILABLE',
        small_price: '80.00',
        medium_price: '150.00',
        large_price: '250.00',
      });
      loadFruitsAndStock();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateFruit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      await apiRequest(`/fruits/${editingFruit.fruit_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fruit_name: editingFruit.fruit_name,
          description: editingFruit.description,
          status: editingFruit.status,
        }),
      });
      setMessage('Fruit details updated.');
      setEditingFruit(null);
      loadFruitsAndStock();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePriceUpdate = async (stockId, sellingPrice) => {
    try {
      setError('');
      setMessage('');
      await apiRequest(`/fruits/stock/${stockId}`, {
        method: 'PUT',
        body: JSON.stringify({ selling_price: Number(sellingPrice) }),
      });
      setMessage('Packaging selling price updated.');
      loadFruitsAndStock();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Fruits & Packaging Stock (Small / Medium / Large)</h1>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>Register New Fruit Type</h3>
        <form onSubmit={handleCreateFruit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Fruit Name</label>
              <input
                type="text"
                value={newFruit.fruit_name}
                onChange={(e) => setNewFruit({ ...newFruit, fruit_name: e.target.value })}
                placeholder="e.g., Apples, Oranges, Mangoes"
                required
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={newFruit.status}
                onChange={(e) => setNewFruit({ ...newFruit, status: e.target.value })}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="UNAVAILABLE">UNAVAILABLE</option>
              </select>
            </div>

            <div className="form-group">
              <label>Small Box Price (LSL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newFruit.small_price}
                onChange={(e) => setNewFruit({ ...newFruit, small_price: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Medium Box Price (LSL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newFruit.medium_price}
                onChange={(e) => setNewFruit({ ...newFruit, medium_price: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Large Box Price (LSL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newFruit.large_price}
                onChange={(e) => setNewFruit({ ...newFruit, large_price: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={newFruit.description}
                onChange={(e) => setNewFruit({ ...newFruit, description: e.target.value })}
                placeholder="Variety / notes"
              />
            </div>
          </div>

          <button type="submit">Add Fruit</button>
        </form>
      </div>

      {editingFruit && (
        <div className="card">
          <h3>Update Fruit: {editingFruit.fruit_name}</h3>
          <form onSubmit={handleUpdateFruit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Fruit Name</label>
                <input
                  type="text"
                  value={editingFruit.fruit_name}
                  onChange={(e) =>
                    setEditingFruit({ ...editingFruit, fruit_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingFruit.status}
                  onChange={(e) =>
                    setEditingFruit({ ...editingFruit, status: e.target.value })
                  }
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="UNAVAILABLE">UNAVAILABLE</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={editingFruit.description || ''}
                  onChange={(e) =>
                    setEditingFruit({ ...editingFruit, description: e.target.value })
                  }
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit">Save Changes</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingFruit(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3>Fruit Catalogue</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fruit</th>
              <th>Description</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {fruits.map((fruit) => (
              <tr key={fruit.fruit_id}>
                <td>{fruit.fruit_id}</td>
                <td>{fruit.fruit_name}</td>
                <td>{fruit.description || '-'}</td>
                <td>
                  <span className={`badge ${fruit.status === 'AVAILABLE' ? 'badge-success' : 'badge-warning'}`}>
                    {fruit.status}
                  </span>
                </td>
                <td>
                  <button type="button" onClick={() => setEditingFruit(fruit)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Stock Quantities by Packaging Size</h3>
        <table>
          <thead>
            <tr>
              <th>Fruit</th>
              <th>Packaging Size</th>
              <th>Available Boxes</th>
              <th>Selling Price (LSL)</th>
              <th>Stock Status</th>
            </tr>
          </thead>
          <tbody>
            {stockRows.length === 0 ? (
              <tr><td colSpan="5">No stock records loaded.</td></tr>
            ) : (
              stockRows.map((row) => (
                <tr key={row.stock_id}>
                  <td>{row.fruit_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{row.packaging_size}</td>
                  <td><strong>{row.available_quantity}</strong></td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={row.selling_price}
                      style={{ width: '100px', marginRight: '0.4rem' }}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== Number(row.selling_price)) {
                          handlePriceUpdate(row.stock_id, e.target.value);
                        }
                      }}
                    />
                  </td>
                  <td>
                    {row.available_quantity < 10 ? (
                      <span className="badge badge-danger">Low Stock</span>
                    ) : (
                      <span className="badge badge-success">In Stock</span>
                    )}
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
