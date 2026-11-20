import { useCallback, useEffect, useState } from 'react';
import { apiRequest, extractList } from '../api/client';
import Modal from '../components/Modal';
import TableToolbar from '../components/TableToolbar';

function currentRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { startDate: format(start), endDate: format(end) };
}

export default function ReportsPage() {
  const [range, setRange] = useState(currentRange);
  const [revenue, setRevenue] = useState(null);
  const [topFruits, setTopFruits] = useState([]);
  const [topVendor, setTopVendor] = useState(null);
  const [stockLevels, setStockLevels] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFruit, setSelectedFruit] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [fruitSearch, setFruitSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [stockStatus, setStockStatus] = useState('ALL');

  const loadReports = useCallback(async () => {
    try {
      const [revenueRes, fruitRes, vendorRes, stockRes] = await Promise.all([
        apiRequest(`/reports/revenue?startDate=${range.startDate}&endDate=${range.endDate}`),
        apiRequest('/reports/top-fruits'),
        apiRequest('/reports/top-vendor'),
        apiRequest('/reports/stock-levels'),
      ]);
      setRevenue(revenueRes.data || null);
      setTopFruits(extractList(fruitRes));
      setTopVendor(vendorRes.data || null);
      setStockLevels(extractList(stockRes));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void Promise.resolve().then(loadReports);
  }, [loadReports]);

  const totalStockBoxes = stockLevels.reduce((sum, row) => sum + (Number(row.available_quantity) || 0), 0);
  const stockValue = stockLevels.reduce(
    (sum, row) => sum + (Number(row.available_quantity) || 0) * (Number(row.selling_price) || 0),
    0
  );
  const peak = Math.max(1, ...topFruits.map((row) => Number(row.total_boxes_sold) || 0));
  const normalizedFruitSearch = fruitSearch.trim().toLowerCase();
  const normalizedStockSearch = stockSearch.trim().toLowerCase();
  const filteredTopFruits = topFruits.filter((row) => String(row.fruit_name || '').toLowerCase().includes(normalizedFruitSearch));
  const getStockStatus = (quantity) => (quantity > 10 ? 'IN_STOCK' : quantity >= 1 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
  const filteredStockLevels = stockLevels.filter((row) => {
    const matchesSearch = String(row.fruit_name || '').toLowerCase().includes(normalizedStockSearch);
    const matchesStatus = stockStatus === 'ALL' || getStockStatus(Number(row.available_quantity) || 0) === stockStatus;
    return matchesSearch && matchesStatus;
  });
  const stockStatusOptions = [
    { value: 'IN_STOCK', label: 'In Stock' },
    { value: 'LOW_STOCK', label: 'Low Stock' },
    { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  ];

  return (
    <div className="records-page">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Reports</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>Revenue, sales ranking and stock valuation</p>
        </div>
        <form className="filter-bar record-toolbar" onSubmit={(event) => { event.preventDefault(); loadReports(); }}>
          <input type="date" aria-label="Revenue start date" value={range.startDate} onChange={(event) => setRange({ ...range, startDate: event.target.value })} required />
          <input type="date" aria-label="Revenue end date" value={range.endDate} onChange={(event) => setRange({ ...range, endDate: event.target.value })} required />
          <button type="submit" className="btn-primary">Run Report</button>
        </form>
      </div>

      <p className="muted" style={{ margin: '8px 0 0' }}>Date range applies to revenue only; rankings and stock figures are all-time/current.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="card">Loading reports...</div>
      ) : (
        <>
          <div className="metric-strip">
            <div className="metric-card">
              <div className="metric-label">Revenue</div>
              <div className="metric-value">M {Number(revenue?.total_revenue || 0).toFixed(2)}</div>
              <div className="metric-foot">Selected range: {String(range.startDate).slice(0, 10)} to {String(range.endDate).slice(0, 10)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Sales in Period</div>
              <div className="metric-value">{Number(revenue?.total_sales || 0)}</div>
              <div className="metric-foot">Orders recorded</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Current Stock Boxes</div>
              <div className="metric-value">{totalStockBoxes.toLocaleString()}</div>
              <div className="metric-foot">Units currently available</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Current Stock Value</div>
              <div className="metric-value">M {stockValue.toFixed(2)}</div>
              <div className="metric-foot">Quantity × selling price</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div className="card table-scroll record-table-card">
              <h3>Top Fruits by Boxes Sold (All Time)</h3>
              <p className="muted" style={{ margin: '4px 0 10px' }}>All-time ranking; not affected by the date range.</p>
              <TableToolbar
                search={fruitSearch}
                onSearchChange={setFruitSearch}
                searchPlaceholder="Search by fruit name"
              />
              <table className="record-table">
                <thead><tr><th>Fruit</th><th>Boxes Sold</th><th>Orders</th><th>Share</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredTopFruits.length === 0 ? (
                    <tr><td colSpan="5">No sales recorded yet.</td></tr>
                  ) : filteredTopFruits.map((row) => {
                    const boxes = Number(row.total_boxes_sold) || 0;
                    return (
                      <tr key={row.fruit_id}>
                        <td>{row.fruit_name}</td>
                        <td>{boxes}</td>
                        <td>{Number(row.order_count) || 0}</td>
                        <td>{Math.round((boxes / peak) * 100)}%</td>
                        <td className="table-actions">
                          <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={() => setSelectedFruit(row)}>View</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="card record-table-card">
              <h3>Top Vendor (All Time)</h3>
              <p className="muted" style={{ margin: '4px 0 10px' }}>All-time leader; not affected by the date range.</p>
              {topVendor ? (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><strong>{topVendor.vendor_name}</strong></div>
                    <div className="muted">{topVendor.location || 'No location recorded'}</div>
                    <div className="stat-value">{Number(topVendor.total_boxes) || 0} boxes</div>
                  </div>
                  <div className="table-actions">
                    <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={() => setSelectedVendor(topVendor)}>View</button>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0 }}>No vendor sales recorded yet.</p>
              )}
            </div>
          </div>

          <div className="card table-scroll record-table-card">
            <h3>Current Stock Valuation</h3>
            <p className="muted" style={{ margin: '4px 0 10px' }}>Current stock only; not affected by the date range.</p>
            <TableToolbar
              search={stockSearch}
              onSearchChange={setStockSearch}
              searchPlaceholder="Search by fruit name"
              status={stockStatus}
              statusOptions={stockStatusOptions}
              onStatusChange={setStockStatus}
            />
            <table className="record-table">
              <thead><tr><th>Fruit</th><th>Size</th><th>Available Boxes</th><th>Status</th><th>Unit Price (M)</th><th>Line Value (M)</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredStockLevels.length === 0 ? (
                  <tr><td colSpan="7">No stock records found.</td></tr>
                ) : filteredStockLevels.map((row) => {
                  const quantity = Number(row.available_quantity) || 0;
                  const price = Number(row.selling_price) || 0;
                  const status = getStockStatus(quantity);
                  const statusClass = status === 'IN_STOCK' ? 'status-paid' : status === 'LOW_STOCK' ? 'status-pending' : 'status-overdue';
                  const statusLabel = status === 'IN_STOCK' ? 'In Stock' : status === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock';
                  return (
                    <tr key={`${row.fruit_id}-${row.packaging_size}`}>
                      <td>{row.fruit_name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{row.packaging_size}</td>
                      <td>{quantity}</td>
                      <td><span className={`status-pill ${statusClass}`}>{statusLabel}</span></td>
                      <td>{price.toFixed(2)}</td>
                      <td>{(quantity * price).toFixed(2)}</td>
                      <td className="table-actions">
                        <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={() => setSelectedStock(row)}>View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedFruit && (
            <Modal
              title="Top Fruit Details"
              onClose={() => setSelectedFruit(null)}
              footer={<button type="button" className="btn-secondary" onClick={() => setSelectedFruit(null)}>Close</button>}
            >
              <div className="detail-grid">
                <div className="detail-item detail-span">
                  <span className="detail-label">Fruit</span>
                  <span className="detail-value">{selectedFruit.fruit_name || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Boxes Sold</span>
                  <span className="detail-value">{Number(selectedFruit.total_boxes_sold) || 0}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Order Count</span>
                  <span className="detail-value">{Number(selectedFruit.order_count) || 0}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Share</span>
                  <span className="detail-value">{Math.round(((Number(selectedFruit.total_boxes_sold) || 0) / peak) * 100)}%</span>
                </div>
              </div>
            </Modal>
          )}

          {selectedStock && (
            <Modal
              title="Stock Valuation Details"
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
                  <span className="detail-label">Selling Price</span>
                  <span className="detail-value">M {(Number(selectedStock.selling_price) || 0).toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Available Quantity</span>
                  <span className="detail-value">{Number(selectedStock.available_quantity) || 0}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Line Value</span>
                  <span className="detail-value">M {((Number(selectedStock.available_quantity) || 0) * (Number(selectedStock.selling_price) || 0)).toFixed(2)}</span>
                </div>
              </div>
            </Modal>
          )}

          {selectedVendor && (
            <Modal
              title="Top Vendor Details"
              onClose={() => setSelectedVendor(null)}
              footer={<button type="button" className="btn-secondary" onClick={() => setSelectedVendor(null)}>Close</button>}
            >
              <div className="detail-grid">
                <div className="detail-item detail-span">
                  <span className="detail-label">Vendor Name</span>
                  <span className="detail-value">{selectedVendor.vendor_name || '—'}</span>
                </div>
                <div className="detail-item detail-span">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{selectedVendor.location || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Boxes</span>
                  <span className="detail-value">{Number(selectedVendor.total_boxes) || 0}</span>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
