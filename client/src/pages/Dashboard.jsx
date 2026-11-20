import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, extractList } from '../api/client';
import Modal from '../components/Modal';

const TREND_MONTHS = [
  { key: '06', label: 'Jun' },
  { key: '07', label: 'Jul' },
  { key: '08', label: 'Aug' },
  { key: '09', label: 'Sep' },
  { key: '10', label: 'Oct' },
  { key: '11', label: 'Nov' },
];
const COLORS = ['#f0704f', '#2fae9d', '#f5b84b', '#7c6cf0', '#2a3c61'];
const FRUIT_PHOTOS = {
  peaches: 'https://images.unsplash.com/photo-1568584711611-4dfa4cd196f1?auto=format&fit=crop&w=600&q=80',
  bananas: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e',
  apples: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80',
  mangoes: 'https://www.rosscreektropicals.com.au/cdn/shop/products/KP.jpg?v=1695091784&width=720',
  oranges: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=400&q=80',
  grapes: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80',
};

function currentRange() {
  const now = new Date();
  const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return {
    startDate: format(new Date(now.getFullYear(), 0, 1)),
    endDate: format(new Date(now.getFullYear(), 11, 31)),
  };
}

function StatCard({ to, label, value, foot }) {
  return (
    <Link to={to} className="dashboard-stat-card">
      <span className="dashboard-stat-copy">
        <span className="dashboard-stat-label">{label}</span>
        <span className="dashboard-stat-value">{value}</span>
        <span className="dashboard-stat-foot">{foot}</span>
      </span>
    </Link>
  );
}

function formatMoneyShort(value) {
  const amount = Number(value) || 0;
  if (amount === 0) return '0';
  if (amount >= 1000) return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return amount.toFixed(0);
}

function SalesOverviewChart({ points }) {
  const width = 420, height = 180, padLeft = 42, padRight = 18, padTop = 22, padBottom = 30;
  const plotW = width - padLeft - padRight, plotH = height - padTop - padBottom;
  const peak = Math.max(0, ...points.map((point) => Number(point.value) || 0));
  const maxVal = Math.max(1000, Math.ceil(peak / 1000) * 1000);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? padLeft + plotW / 2 : padLeft + (index / (points.length - 1)) * plotW;
    const value = Math.max(0, Math.min(maxVal, Number(point.value) || 0));
    return { ...point, x, y: padTop + plotH - (value / maxVal) * plotH };
  });
  const linePath = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
    : '';
  const yTicks = [1, 0.75, 0.5, 0.25].map((ratio) => ({
    label: `${Number(((maxVal * ratio) / 1000).toFixed(2))}k`,
    y: padTop + plotH - ratio * plotH,
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sales-chart" aria-label="Sales Overview Chart">
      <defs>
        <linearGradient id="apTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2fae9d" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2fae9d" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {yTicks.map((tick) => (
        <g key={tick.label}>
          <line x1={padLeft} y1={tick.y} x2={width - padRight} y2={tick.y} stroke="#dfe7db" strokeWidth="1" />
          <text x={padLeft - 8} y={tick.y + 4} textAnchor="end" fontSize="10" fill="#6d7d70">{tick.label}</text>
        </g>
      ))}
      <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke="#dfe7db" strokeWidth="1" />
      <line x1={padLeft} y1={padTop + plotH} x2={width - padRight} y2={padTop + plotH} stroke="#dfe7db" strokeWidth="1" />
      {areaPath && <path d={areaPath} fill="url(#apTrendFill)" />}
      {linePath && <path d={linePath} fill="none" stroke="#2fae9d" strokeWidth="2.4" />}
      {coords.map((point, index) => (
        <g key={point.key}>
          <circle cx={point.x} cy={point.y} r="4" fill="#2fae9d" stroke="#ffffff" strokeWidth="1.2" />
          <text
            x={point.x}
            y={Math.max(12, point.y - 9)}
            textAnchor={index === 0 ? 'start' : index === coords.length - 1 ? 'end' : 'middle'}
            fontSize="10"
            fontWeight="800"
            fill="#1d5a3e"
          >
            M {formatMoneyShort(point.value)}
          </text>
          <text x={point.x} y={height - 8} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#20372a">{point.month}</text>
        </g>
      ))}
    </svg>
  );
}

function buildMonthlyTrend(sales) {
  const year = new Date().getFullYear();
  const buckets = TREND_MONTHS.map((month) => ({
    key: `${year}-${month.key}`,
    month: month.label,
    value: 0,
  }));
  for (const sale of sales) {
    const key = String(sale.sale_date || '').slice(0, 7);
    const bucket = buckets.find((item) => item.key === key);
    if (bucket) bucket.value += Number(sale.total_amount) || 0;
  }
  return buckets;
}

const QUICK_ACTIONS = [
  { to: '/fruits', title: 'Add Fruit', description: 'Grow the catalogue' },
  { to: '/purchases', title: 'Record Purchase', description: 'Receive new stock' },
  { to: '/sales', title: 'Record Sale', description: 'Track an order' },
  { to: '/vendors', title: 'Manage Vendors', description: 'Update partners' },
];

export default function Dashboard() {
  const [fruitCount, setFruitCount] = useState(0);
  const [stockItemCount, setStockItemCount] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [stockLevels, setStockLevels] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [topFruits, setTopFruits] = useState([]);
  const [topVendor, setTopVendor] = useState(null);
  const [supplierCount, setSupplierCount] = useState(0);
  const [sales, setSales] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState(currentRange);
  const [selectedFruit, setSelectedFruit] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedLowStock, setSelectedLowStock] = useState(null);
  const [clockLabel, setClockLabel] = useState('');

  useEffect(() => {
    const updateClock = () => setClockLabel(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = useCallback(async () => {
    setSelectedFruit(null);
    setSelectedVendor(null);
    setSelectedLowStock(null);
    try {
      const [fruitRes, stockRowsRes, purchaseRes, stockRes, lowRes, fruitSalesRes, vendorRes, supplierRes, salesRes, revenueRes] = await Promise.all([
        apiRequest('/fruits'),
        apiRequest('/fruits/stock'),
        apiRequest('/purchases'),
        apiRequest('/reports/stock-levels'),
        apiRequest('/fruits/stock/low?threshold=10'),
        apiRequest('/reports/top-fruits'),
        apiRequest('/reports/top-vendor'),
        apiRequest('/suppliers'),
        apiRequest('/sales'),
        apiRequest(`/reports/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
      ]);
      setFruitCount(extractList(fruitRes).length);
      setStockItemCount(extractList(stockRowsRes).length);
      setPurchaseCount(extractList(purchaseRes).length);
      setStockLevels(extractList(stockRes));
      setLowStock(extractList(lowRes));
      setTopFruits(extractList(fruitSalesRes));
      setTopVendor(vendorRes.data || null);
      setSupplierCount(extractList(supplierRes).length);
      setSales(extractList(salesRes));
      setRevenue(revenueRes.data || null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [dateRange]);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  const totalBoxes = stockLevels.reduce((sum, row) => sum + (Number(row.available_quantity) || 0), 0);
  const totalSales = sales.reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);
  const peakBoxes = Math.max(1, ...topFruits.map((item) => Number(item.total_boxes_sold) || 0));
  const trend = buildMonthlyTrend(sales);
  const stockHealth = Math.max(0, 100 - Math.round((lowStock.length / Math.max(1, stockLevels.length)) * 100));

  return (
    <div className="dashboard-page">
      <div className="dashboard-title-row">
        <div>
          <h1>Welcome back ,Julia</h1>
        </div>
        <div className="dashboard-user-chip">
          <span>
            <strong>Farm Desk</strong>
            <small>Batloung Farm</small>
          </span>
        </div>
      </div>

      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="dashboard-hero-pulse">
            <span>Live farm desk · {clockLabel || 'now'}</span>
          </div>
          <span className="dashboard-hero-kicker">Fresh from Batloung Farm</span>
          <h2><em>Welcome to Our Farm.<br />Where Every Harvest Has a Story.</em></h2>
          <Link to="/suppliers" className="dashboard-hero-button">Manage Your Farm</Link>
        </div>
      </section>

      {error && <div className="alert alert-error">API notice: {error}</div>}

      <div className="dashboard-stat-grid">
        <StatCard to="/fruits" label="Fruits" value={fruitCount} foot="in catalogue" />
        <StatCard to="/stock" label="Stock Items" value={stockItemCount} foot="packaging rows" />
        <StatCard to="/purchases" label="Purchases" value={purchaseCount} foot="recorded orders" />
        <StatCard to="/sales" label="Sales" value={sales.length} foot="recorded sales" />
        <StatCard to="/stock" label="Total Stock" value={`${totalBoxes.toLocaleString()} boxes`} foot="available quantity" />
        <StatCard to="/sales" label="Total Sales" value={`M ${totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} foot="all recorded sales" />
        <StatCard to="/suppliers" label="Suppliers" value={supplierCount} foot="across provinces" />
        <StatCard to="/stock" label="Low Stock" value={lowStock.length} foot="below 10 boxes" />
      </div>

      <section className="panel-card revenue-card">
        <div className="revenue-summary">
          <span className="panel-kicker">Revenue report</span>
          <h2>Revenue for selected period</h2>
          <div className="revenue-amount">M {Number(revenue?.total_revenue || 0).toFixed(2)}</div>
        </div>
        <form className="revenue-form" onSubmit={(event) => { event.preventDefault(); loadDashboard(); }}>
          <label>
            <span>From</span>
            <input type="date" value={dateRange.startDate} onChange={(event) => setDateRange({ ...dateRange, startDate: event.target.value })} required />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={dateRange.endDate} onChange={(event) => setDateRange({ ...dateRange, endDate: event.target.value })} required />
          </label>
          <button type="submit" className="btn-primary">Calculate Revenue</button>
        </form>
      </section>

      <div className="dashboard-content-grid">
        <section className="panel-card dashboard-panel-card">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Business performance</span>
              <h2>Sales Overview</h2>
            </div>
            <span className="panel-chip">Last 6 months</span>
          </div>
          <SalesOverviewChart points={trend} />
        </section>

        <section className="panel-card dashboard-panel-card">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Warehouse health</span>
              <h2>Stock Overview</h2>
            </div>
            <span className="panel-chip">{stockLevels.length} rows</span>
          </div>
          <div className="stock-overview-list">
            <div className="stock-overview-row"><span>Available boxes</span><strong>{totalBoxes.toLocaleString()}</strong></div>
            <div className="stock-overview-row"><span>Low stock items</span><strong>{lowStock.length}</strong></div>
            <div className="stock-overview-row"><span>Stock health</span><strong>{stockHealth}%</strong></div>
          </div>
          <div className="stock-health-meter"><span style={{ width: `${stockHealth}%` }} /></div>
          {lowStock.length > 0 && (
            <div className="low-stock-list">
              {lowStock.slice(0, 3).map((row) => (
                <span key={`${row.stock_id}-${row.fruit_name}`}>
                  <button type="button" className="low-stock-chip" data-no-overlay="true" onClick={() => setSelectedLowStock(row)}>
                    {row.fruit_name} ({row.packaging_size})
                  </button>
                </span>
              ))}
            </div>
          )}
          <Link to="/stock" className="panel-link">Open stock overview</Link>
        </section>

        <section className="panel-card dashboard-panel-card">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Customer favourites</span>
              <h2>Top Fruits</h2>
            </div>
            <span className="panel-chip">by boxes sold</span>
          </div>
          <div className="top-fruit-list">
            {topFruits.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No sales data available yet.</p>
            ) : topFruits.map((fruit, index) => {
              const percent = Math.min(
                100,
                Math.max(0, Math.round(((Number(fruit.total_boxes_sold) || 0) / peakBoxes) * 100))
              );
              const photoKey = String(fruit.fruit_name || '').trim().toLowerCase();
              const photo = FRUIT_PHOTOS[photoKey];
              return (
                <div className="top-fruit-row" key={fruit.fruit_id || fruit.fruit_name}>
                  {photo && <img className="top-fruit-photo" src={photo} alt={fruit.fruit_name} loading="lazy" />}
                  <div className="top-fruit-details">
                    <div className="top-fruit-heading">
                      <strong>{fruit.fruit_name}</strong>
                      <span>
                        {percent}%{' '}
                        <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={() => setSelectedFruit({ ...fruit, percent })}>View</button>
                      </span>
                    </div>
                    <div className="top-fruit-meter">
                      <span style={{ width: `${percent}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                    </div>
                    <small>{Number(fruit.total_boxes_sold) || 0} boxes sold</small>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel-card dashboard-panel-card">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Jump back in</span>
              <h2>Quick Actions</h2>
            </div>
          </div>
          <div className="quick-action-grid">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.to} to={action.to} className="quick-action-tile">
                <span>
                  <strong>{action.title}</strong>
                  <small>{action.description}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="panel-card top-vendor-card">
        <div>
          <span className="panel-kicker">Top performing partner</span>
          <h2>Top Vendor</h2>
        </div>
        <div className="top-vendor-value">
          {topVendor ? (
            <>
              <span>{`${topVendor.vendor_name} (${topVendor.total_boxes} boxes)`}</span>{' '}
              <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={() => setSelectedVendor(topVendor)}>View</button>
            </>
          ) : 'No sales recorded yet.'}
        </div>
      </section>

      {selectedFruit && (
        <Modal
          title="Fruit Details"
          onClose={() => setSelectedFruit(null)}
          footer={<button type="button" className="btn-secondary" onClick={() => setSelectedFruit(null)}>Close</button>}
        >
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Fruit</span>
              <span className="detail-value">{selectedFruit.fruit_name || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Total Boxes Sold</span>
              <span className="detail-value">{Number(selectedFruit.total_boxes_sold) || 0}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Percentage</span>
              <span className="detail-value">{selectedFruit.percent}%</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Orders</span>
              <span className="detail-value">{selectedFruit.order_count != null && selectedFruit.order_count !== '' ? selectedFruit.order_count : '—'}</span>
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
            <div className="detail-item">
              <span className="detail-label">Vendor</span>
              <span className="detail-value">{selectedVendor.vendor_name || '—'}</span>
            </div>
            {selectedVendor.location ? (
              <div className="detail-item detail-span">
                <span className="detail-label">Location</span>
                <span className="detail-value">{selectedVendor.location}</span>
              </div>
            ) : null}
            <div className="detail-item">
              <span className="detail-label">Total Boxes</span>
              <span className="detail-value">{selectedVendor.total_boxes ?? '—'}</span>
            </div>
          </div>
        </Modal>
      )}

      {selectedLowStock && (
        <Modal
          title="Low Stock Details"
          onClose={() => setSelectedLowStock(null)}
          footer={<button type="button" className="btn-secondary" onClick={() => setSelectedLowStock(null)}>Close</button>}
        >
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Fruit</span>
              <span className="detail-value">{selectedLowStock.fruit_name || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Packaging Size</span>
              <span className="detail-value">{selectedLowStock.packaging_size || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Available Quantity</span>
              <span className="detail-value">{selectedLowStock.available_quantity ?? '—'}</span>
            </div>
            {selectedLowStock.selling_price != null && selectedLowStock.selling_price !== '' ? (
              <div className="detail-item">
                <span className="detail-label">Selling Price</span>
                <span className="detail-value">{selectedLowStock.selling_price}</span>
              </div>
            ) : null}
            <div className="detail-item">
              <span className="detail-label">Threshold</span>
              <span className="detail-value">10</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
