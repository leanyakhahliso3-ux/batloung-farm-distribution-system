import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

export default function Dashboard() {
  const [lowStock, setLowStock] = useState([]);
  const [topFruits, setTopFruits] = useState([]);
  const [topVendor, setTopVendor] = useState(null);
  const [stockLevels, setStockLevels] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });
  const [error, setError] = useState('');

  const loadReports = async () => {
    try {
      setError('');
      const [lowRes, fruitsRes, vendorRes, stockRes] = await Promise.all([
        apiRequest('/fruits/stock/low'),
        apiRequest('/reports/top-fruits'),
        apiRequest('/reports/top-vendor'),
        apiRequest('/reports/stock-levels'),
      ]);

      setLowStock(lowRes.data || []);
      setTopFruits(fruitsRes.data || []);
      setTopVendor(vendorRes.data || null);
      setStockLevels(stockRes.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchRevenue = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await apiRequest(
        `/reports/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      setRevenue(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadReports();
    fetchRevenue();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Distribution Overview & Reports</h1>
        <button onClick={loadReports}>Refresh Data</button>
      </div>

      {error && <div className="alert alert-error">API Notice: {error}</div>}

      <div className="grid-cards">
        <div className="card">
          <label>Low Stock Items (< 10 boxes)</label>
          <div className="stat-value">{lowStock.length}</div>
        </div>
        <div className="card">
          <label>Top Vendor (Most Boxes Purchased)</label>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {topVendor ? `${topVendor.vendor_name} (${topVendor.total_boxes} boxes)` : 'No sales yet'}
          </div>
        </div>
        <div className="card">
          <label>Revenue ({dateRange.startDate} to {dateRange.endDate})</label>
          <div className="stat-value">
            M {Number(revenue?.total_revenue || 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Filter Sales Revenue by Date Range</h3>
        <form className="form-grid" onSubmit={fetchRevenue}>
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              required
            />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit">Calculate Revenue</button>
          </div>
        </form>
      </div>

      <div className="grid-cards">
        <div className="card">
          <h3>Top 5 Most Frequently Sold Fruits</h3>
          <table>
            <thead>
              <tr>
                <th>Fruit</th>
                <th>Boxes Sold</th>
                <th>Times Ordered</th>
              </tr>
            </thead>
            <tbody>
              {topFruits.length === 0 ? (
                <tr><td colSpan="3">No sales data available.</td></tr>
              ) : (
                topFruits.map((item) => (
                  <tr key={item.fruit_id}>
                    <td>{item.fruit_name}</td>
                    <td>{item.total_boxes_sold}</td>
                    <td>{item.order_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Low Stock Alerts</h3>
          <table>
            <thead>
              <tr>
                <th>Fruit</th>
                <th>Size</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.length === 0 ? (
                <tr><td colSpan="3">All stock levels are healthy.</td></tr>
              ) : (
                lowStock.map((item) => (
                  <tr key={item.stock_id}>
                    <td>{item.fruit_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{item.packaging_size}</td>
                    <td><span className="badge badge-danger">{item.available_quantity} boxes</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Current Stock Levels by Fruit & Packaging Size</h3>
        <table>
          <thead>
            <tr>
              <th>Fruit</th>
              <th>Packaging Size</th>
              <th>Selling Price (LSL)</th>
              <th>Available Boxes</th>
            </tr>
          </thead>
          <tbody>
            {stockLevels.map((row) => (
              <tr key={`${row.fruit_id}-${row.packaging_size}`}>
                <td>{row.fruit_name}</td>
                <td style={{ textTransform: 'capitalize' }}>{row.packaging_size}</td>
                <td>M {Number(row.selling_price).toFixed(2)}</td>
                <td>
                  <span className={`badge ${row.available_quantity < 10 ? 'badge-warning' : 'badge-success'}`}>
                    {row.available_quantity} boxes
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
