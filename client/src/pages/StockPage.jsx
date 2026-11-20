import { useCallback, useEffect, useState } from 'react';
import { apiRequest, extractList } from '../api/client';
import Modal from '../components/Modal';
import TableToolbar from '../components/TableToolbar';

const SIZES = ['', 'small', 'medium', 'large'];

const STOCK_STATUS_OPTIONS = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
];

function getStockStatus(row) {
  const quantity = Number(row.available_quantity) || 0;
  if (quantity > 10) return 'IN_STOCK';
  if (quantity >= 1) return 'LOW_STOCK';
  return 'OUT_OF_STOCK';
}

function StockStatusPill({ row }) {
  const status = getStockStatus(row);
  if (status === 'IN_STOCK') return <span className="status-pill status-paid">In Stock</span>;
  if (status === 'LOW_STOCK') return <span className="status-pill status-pending">Low Stock</span>;
  return <span className="status-pill status-overdue">Out of Stock</span>;
}

export default function StockPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [size, setSize] = useState('');
  const [threshold, setThreshold] = useState('10');
  const [appliedThreshold, setAppliedThreshold] = useState('10');
  const [rows, setRows] = useState([]);
  const [lowRows, setLowRows] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState(null);

  const loadStock = useCallback(async () => {
    try {
      const query = size ? `?size=${size}` : '';
      const [stockRes, lowRes] = await Promise.all([
        apiRequest(`/fruits/stock${query}`),
        apiRequest(`/fruits/stock/low?threshold=${Number(appliedThreshold) || 0}`),
      ]);
      setRows(extractList(stockRes));
      setLowRows(extractList(lowRes));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [size, appliedThreshold]);

  useEffect(() => {
    void Promise.resolve().then(loadStock);
  }, [loadStock]);

  async function saveQuantity(row, value) {
    try {
      await apiRequest(`/fruits/stock/${row.stock_id}/quantity`, {
        method: 'PUT',
        body: JSON.stringify({ available_quantity: Number(value) }),
      });
      setMessage(`${row.fruit_name} (${row.packaging_size}) quantity updated.`);
      setError('');
      await loadStock();
    } catch (err) {
      setError(err.message);
    }
  }

  const totalBoxes = rows.reduce((sum, row) => sum + (Number(row.available_quantity) || 0), 0);
  const stockValue = rows.reduce(
    (sum, row) => sum + (Number(row.available_quantity) || 0) * (Number(row.selling_price) || 0),
    0
  );

  const query = search.trim().toLowerCase();
  const visibleRows = rows.filter((row) => {
    const matchesQuery = !query || String(row.fruit_name || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || getStockStatus(row) === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="records-page">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Stock Overview</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>Live packaging stock and low-stock alerts</p>
        </div>
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search fruit name..."
          status={statusFilter}
          statusOptions={STOCK_STATUS_OPTIONS}
          onStatusChange={setStatusFilter}
        >
          <select value={size} onChange={(event) => setSize(event.target.value)} aria-label="Filter by packaging size">
            {SIZES.map((option) => (
              <option key={option || 'all'} value={option}>{option ? option.charAt(0).toUpperCase() + option.slice(1) : 'All sizes'}</option>
            ))}
          </select>
          <input type="number" min="0" value={threshold} onChange={(event) => setThreshold(event.target.value)} aria-label="Low stock threshold" />
          <button type="button" className="btn-secondary" onClick={() => setAppliedThreshold(threshold)}>Apply</button>
          <button type="button" className="btn-secondary" onClick={loadStock}>Refresh</button>
        </TableToolbar>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="metric-strip">
        <div className="metric-card">
          <div className="metric-label">Stock Records</div>
          <div className="metric-value">{rows.length}</div>
          <div className="metric-foot">Packaging lines tracked</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Available Boxes</div>
          <div className="metric-value">{totalBoxes.toLocaleString()}</div>
          <div className="metric-foot">Units currently on hand</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Stock Value</div>
          <div className="metric-value">M {stockValue.toFixed(2)}</div>
          <div className="metric-foot">Quantity × selling price</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Low-Stock Lines</div>
          <div className="metric-value">{lowRows.length}</div>
          <div className="metric-foot">At or below threshold {appliedThreshold || '0'}</div>
        </div>
      </div>

      <div className="card table-scroll record-table-card">
        {loading ? (
          <p style={{ margin: 0 }}>Loading stock...</p>
        ) : (
          <table className="record-table">
            <thead>
              <tr><th>Fruit</th><th>Size</th><th>Available Boxes</th><th>Status</th><th>Price (M)</th><th>Line Value (M)</th><th>Update Quantity</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr><td colSpan="8">No stock records found.</td></tr>
              ) : visibleRows.map((row) => (
                <StockLine key={`${row.stock_id}-${row.available_quantity}`} row={row} onSave={saveQuantity} onView={() => setSelectedStock(row)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedStock && (
        <Modal
          title="Stock Details"
          onClose={() => setSelectedStock(null)}
          footer={<button type="button" className="btn-secondary" onClick={() => setSelectedStock(null)}>Close</button>}
        >
          <div className="detail-grid">
            <div className="detail-item detail-span">
              <span className="detail-label">Fruit</span>
              <span className="detail-value">{selectedStock.fruit_name || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Packaging Size</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>{selectedStock.packaging_size || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Available Quantity</span>
              <span className="detail-value">{Number(selectedStock.available_quantity) || 0}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Selling Price</span>
              <span className="detail-value">M {(Number(selectedStock.selling_price) || 0).toFixed(2)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Line Value</span>
              <span className="detail-value">M {((Number(selectedStock.available_quantity) || 0) * (Number(selectedStock.selling_price) || 0)).toFixed(2)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StockLine({ row, onSave, onView }) {
  const [quantity, setQuantity] = useState(String(row.available_quantity));

  const lineValue = (Number(row.available_quantity) || 0) * (Number(row.selling_price) || 0);

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{row.fruit_name}</td>
      <td style={{ textTransform: 'capitalize' }}>{row.packaging_size}</td>
      <td>{Number(row.available_quantity) || 0}</td>
      <td><StockStatusPill row={row} /></td>
      <td>{Number(row.selling_price || 0).toFixed(2)}</td>
      <td>{lineValue.toFixed(2)}</td>
      <td className="table-actions">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input className="quantity-input" type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <button type="button" className="record-action" onClick={() => onSave(row, quantity)}>Save</button>
        </div>
      </td>
      <td className="table-actions">
        <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={onView}>View</button>
      </td>
    </tr>
  );
}
