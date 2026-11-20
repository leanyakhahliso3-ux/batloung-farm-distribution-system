import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, extractList } from '../api/client';
import Modal from '../components/Modal';
import TableToolbar from '../components/TableToolbar';

const EMPTY_FORM = {
  fruit_name: '',
  description: '',
  status: 'AVAILABLE',
  small: '80.00',
  medium: '150.00',
  large: '250.00',
  small_qty: '0',
  medium_qty: '0',
  large_qty: '0',
};

const SIZES = ['small', 'medium', 'large'];
const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
];

const FRUIT_PHOTOS = {
  peaches: 'https://images.unsplash.com/photo-1568584711611-4dfa4cd196f1?auto=format&fit=crop&w=600&q=80',
  bananas: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e',
  apples: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80',
  mangoes: 'https://www.rosscreektropicals.com.au/cdn/shop/products/KP.jpg?v=1695091784&width=720',
  oranges: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=400&q=80',
  grapes: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80',
};

function formatMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `M ${amount.toFixed(2)}` : '-';
}

function StockStatusPill({ fruitStatus, quantity }) {
  if (fruitStatus === 'UNAVAILABLE') return <span className="status-pill status-overdue">Unavailable</span>;
  if ((Number(quantity) || 0) < 10) return <span className="status-pill status-pending">Low Stock</span>;
  return <span className="status-pill status-paid">Available</span>;
}

export default function FruitsStockPage() {
  const [fruits, setFruits] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [detailsFruit, setDetailsFruit] = useState(null);
  const [detailsStock, setDetailsStock] = useState(null);
  const [editingFruitId, setEditingFruitId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [fruitRes, stockRes, purchaseRes, salesRes] = await Promise.all([
        apiRequest('/fruits'),
        apiRequest('/fruits/stock'),
        apiRequest('/purchases'),
        apiRequest('/sales'),
      ]);
      setFruits(extractList(fruitRes));
      setStockRows(extractList(stockRes));
      setPurchaseCount(extractList(purchaseRes).length);
      setSalesCount(extractList(salesRes).length);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  function openAddModal() {
    setForm(EMPTY_FORM);
    setEditingFruitId(null);
    setModal('add');
    setMessage('');
    setError('');
  }

  function openEditModal(fruit) {
    setForm({
      fruit_name: fruit.fruit_name || '',
      description: fruit.description || '',
      status: fruit.status || 'AVAILABLE',
      small: getPrice(fruit.fruit_id, 'small', true),
      medium: getPrice(fruit.fruit_id, 'medium', true),
      large: getPrice(fruit.fruit_id, 'large', true),
      small_qty: String(findStockRow(fruit.fruit_id, 'small')?.available_quantity ?? 0),
      medium_qty: String(findStockRow(fruit.fruit_id, 'medium')?.available_quantity ?? 0),
      large_qty: String(findStockRow(fruit.fruit_id, 'large')?.available_quantity ?? 0),
    });
    setEditingFruitId(fruit.fruit_id);
    setModal('edit');
    setMessage('');
    setError('');
  }

  async function handleSaveFruit(event) {
    event.preventDefault();
    const name = form.fruit_name.trim();
    if (!name) {
      setError('Fruit name is required.');
      return;
    }

    const prices = {};
    for (const size of SIZES) {
      const rawPrice = String(form[size] ?? '').trim();
      const price = Number(rawPrice);
      if (rawPrice === '' || !Number.isFinite(price) || price < 0) {
        setError(`The ${size} price must be zero or more.`);
        return;
      }
      prices[size] = price;
    }

    const quantities = {};
    for (const size of SIZES) {
      const rawQuantity = String(form[`${size}_qty`] ?? '').trim();
      const quantity = Number(rawQuantity);
      if (rawQuantity === '' || !Number.isInteger(quantity) || quantity < 0) {
        setError(`The ${size} quantity must be a whole number of zero or more.`);
        return;
      }
      quantities[size] = quantity;
    }

    setSaving(true);
    try {
      if (modal === 'edit') {
        const stockRowsToUpdate = SIZES.map((size) => {
          const stock = findStockRow(editingFruitId, size);
          if (!stock) {
            throw new Error(`No stock row found for ${size}.`);
          }
          return { stock, size };
        });

        await apiRequest(`/fruits/${editingFruitId}`, {
          method: 'PUT',
          body: JSON.stringify({ fruit_name: name, description: form.description.trim(), status: form.status }),
        });

        for (const { stock, size } of stockRowsToUpdate) {
          await apiRequest(`/fruits/stock/${stock.stock_id}/details`, {
            method: 'PUT',
            body: JSON.stringify({
              selling_price: prices[size],
              available_quantity: quantities[size],
            }),
          });
        }

        setMessage(`${name}: prices and stock quantities updated.`);
      } else {
        await apiRequest('/fruits', {
          method: 'POST',
          body: JSON.stringify({ fruit_name: name, description: form.description.trim(), status: form.status, prices }),
        });
        setMessage('Fruit added with small, medium and large stock entries.');
      }

      setError('');
      await loadData();
      setModal(null);
      setEditingFruitId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFruit() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const response = await apiRequest(`/fruits/${deleteTarget.fruit_id}`, { method: 'DELETE' });
      setMessage(response.message || 'Fruit marked as UNAVAILABLE.');
      setDetailsFruit(null);
      setDeleteTarget(null);
      setError('');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleActivateFruit(fruit) {
    setSaving(true);
    try {
      const response = await apiRequest(`/fruits/${fruit.fruit_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fruit_name: fruit.fruit_name,
          description: fruit.description || '',
          status: 'AVAILABLE',
        }),
      });
      setMessage(response.message || `${fruit.fruit_name} is now AVAILABLE.`);
      setError('');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveStock(row, field, value) {
    try {
      const endpoint = field === 'price' ? `/fruits/stock/${row.stock_id}` : `/fruits/stock/${row.stock_id}/quantity`;
      const body = field === 'price' ? { selling_price: Number(value) } : { available_quantity: Number(value) };
      await apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) });
      setMessage(`${row.fruit_name} (${row.packaging_size}) ${field} updated.`);
      setError('');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function getFruitStatus(fruitId) {
    return fruits.find((fruit) => Number(fruit.fruit_id) === Number(fruitId))?.status || 'UNAVAILABLE';
  }

  function findStockRow(fruitId, size) {
    return stockRows.find((row) => Number(row.fruit_id) === Number(fruitId) && String(row.packaging_size).toLowerCase() === size);
  }

  function getPrice(fruitId, size, raw = false) {
    const row = findStockRow(fruitId, size);
    if (!row) return raw ? '' : '-';
    return raw ? String(row.selling_price) : formatMoney(row.selling_price);
  }

  function getFruitStock(fruitId) {
    return stockRows
      .filter((row) => Number(row.fruit_id) === Number(fruitId))
      .reduce((sum, row) => sum + (Number(row.available_quantity) || 0), 0);
  }

  const query = search.trim().toLowerCase();
  const visibleFruits = fruits.filter((fruit) => {
    const matchesQuery = !query
      || String(fruit.fruit_name || '').toLowerCase().includes(query)
      || String(fruit.description || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || fruit.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const visibleStock = stockRows.filter((row) => {
    const matchesQuery = !query || String(row.fruit_name || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || getFruitStatus(row.fruit_id) === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const availableStockRows = stockRows.filter((row) => getFruitStatus(row.fruit_id) === 'AVAILABLE');
  const unavailableStockRows = stockRows.filter((row) => getFruitStatus(row.fruit_id) === 'UNAVAILABLE');
  const availableBoxes = availableStockRows.reduce((sum, row) => sum + (Number(row.available_quantity) || 0), 0);
  const unavailableBoxes = unavailableStockRows.reduce((sum, row) => sum + (Number(row.available_quantity) || 0), 0);
  const allBoxes = availableBoxes + unavailableBoxes;
  const availablePercent = allBoxes ? Math.round((availableBoxes / allBoxes) * 100) : 0;
  const unavailablePercent = allBoxes ? 100 - availablePercent : 0;
  const lowStockCount = stockRows.filter((row) => (Number(row.available_quantity) || 0) < 10).length;

  return (
    <div className="fruit-page records-page">
      <section className="fruit-hero">
        <div className="fruit-hero-kicker">Fresh produce, carefully managed</div>
        <h1>Our Fruits, Our Pride</h1>
        <p>Quality fruits, carefully sourced and well managed.</p>
        <div className="fruit-hero-badge">{fruits.length} fruits in catalogue</div>
      </section>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="summary-grid">
        <div className="card summary-card">
          <div><div className="summary-label">Fruits</div><div className="summary-number">{fruits.length}</div></div>
        </div>
        <div className="card summary-card">
          <div><div className="summary-label">Stock Items</div><div className="summary-number">{stockRows.length}</div></div>
        </div>
        <div className="card summary-card">
          <div><div className="summary-label">Purchases</div><div className="summary-number">{purchaseCount}</div></div>
        </div>
        <div className="card summary-card">
          <div><div className="summary-label">Sales</div><div className="summary-number">{salesCount}</div></div>
        </div>
      </div>

      <div className="fruit-toolbar">
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search fruits..."
          status={statusFilter}
          statusOptions={FILTERS.filter((filter) => filter.value !== 'ALL')}
          onStatusChange={setStatusFilter}
        >
          <div className="filter-bar">
            <div className="segmented">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={statusFilter === filter.value ? 'active' : ''}
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn-primary" onClick={openAddModal}>Add Fruit</button>
            <button type="button" className="btn-secondary" onClick={loadData}>Refresh</button>
          </div>
        </TableToolbar>
      </div>

      {loading ? (
        <div className="card">Loading fruit stock...</div>
      ) : (
        <>
          <div className="fruits-layout">
            <div>
              {visibleFruits.length === 0 ? (
                <div className="card">No fruit records found.</div>
              ) : (
                <div className="fruit-grid">
                  {visibleFruits.map((fruit) => {
                    const stockQuantity = getFruitStock(fruit.fruit_id);
                    const photoKey = String(fruit.fruit_name || '').trim().toLowerCase();
                    const photo = FRUIT_PHOTOS[photoKey];
                    return (
                      <article className="fruit-card" key={fruit.fruit_id}>
                        <div className="fruit-card-body">
                          <div className="fruit-card-main">
                            {photo && <img className="fruit-card-photo" src={photo} alt={fruit.fruit_name} loading="lazy" />}
                            <div className="fruit-card-text">
                              <div className="fruit-card-heading">
                                <h3>{fruit.fruit_name}</h3>
                                <span className={`status-pill ${fruit.status === 'AVAILABLE' ? 'status-paid' : 'status-overdue'}`}>
                                  {fruit.status === 'AVAILABLE' ? 'Available' : 'Unavailable'}
                                </span>
                              </div>
                              <p className="fruit-card-description">{fruit.description || 'No description available.'}</p>
                            </div>
                          </div>
                          <div className="fruit-stock-line">{stockQuantity} boxes in stock</div>
                          <div className="price-grid">
                            {SIZES.map((size) => (
                              <div className="price-pill" key={size}>
                                <span>{size}</span>
                                <strong>{getPrice(fruit.fruit_id, size)}</strong>
                              </div>
                            ))}
                          </div>
                          <div className="fruit-actions">
                            <button type="button" className="btn-secondary" onClick={() => setDetailsFruit(fruit)}>View Details</button>
                            <button type="button" className="btn-secondary" onClick={() => openEditModal(fruit)}>Edit</button>
                            {fruit.status === 'AVAILABLE' ? (
                              <button type="button" className="btn-danger" onClick={() => setDeleteTarget(fruit)}>Deactivate</button>
                            ) : (
                              <button type="button" className="btn-secondary" onClick={() => handleActivateFruit(fruit)} disabled={saving}>Activate</button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="side-panel">
              <div className="card stock-overview">
                <h3>Stock Overview</h3>
                <div className="stock-metric">
                  <div className="stock-metric-top">
                    <span className="stock-metric-label">Available stock</span>
                    <span className="stock-metric-value">{availableBoxes} boxes</span>
                  </div>
                  <div className="stock-meter"><span style={{ width: `${availablePercent}%` }} /></div>
                  <div className="muted" style={{ fontSize: '0.76rem', marginTop: '6px' }}>{availableStockRows.length} packaging items</div>
                </div>
                <div className="stock-metric">
                  <div className="stock-metric-top">
                    <span className="stock-metric-label">Unavailable stock</span>
                    <span className="stock-metric-value">{unavailableBoxes} boxes</span>
                  </div>
                  <div className="stock-meter unavailable"><span style={{ width: `${unavailablePercent}%` }} /></div>
                  <div className="muted" style={{ fontSize: '0.76rem', marginTop: '6px' }}>{unavailableStockRows.length} packaging items</div>
                </div>
                <div className="stock-metric">
                  <div className="stock-metric-top">
                    <span className="stock-metric-label">Low stock items</span>
                    <span className="stock-metric-value">{lowStockCount}</span>
                  </div>
                  <div className="muted" style={{ fontSize: '0.76rem' }}>Fewer than 10 boxes available</div>
                </div>
              </div>

              <div className="card quick-actions">
                <h3>Quick Actions</h3>
                <button type="button" className="quick-action" onClick={openAddModal}><span>Add Fruit</span></button>
                <Link className="quick-action" data-no-overlay="true" to="/stock"><span>Manage Stock</span></Link>
                <Link className="quick-action" data-no-overlay="true" to="/reports"><span>View Reports</span></Link>
              </div>
            </aside>
          </div>

          <div className="card table-scroll record-table-card">
            <h3>Stock by Packaging Size</h3>
            <table className="record-table">
              <thead>
                <tr><th>Fruit</th><th>Size</th><th>Available Boxes</th><th>Selling Price (M)</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {visibleStock.length === 0 ? (
                  <tr><td colSpan="6">No stock records found.</td></tr>
                ) : visibleStock.map((row) => (
                  <StockRow key={`${row.stock_id}-${row.available_quantity}-${row.selling_price}`} row={row} fruitStatus={getFruitStatus(row.fruit_id)} onSave={saveStock} onView={setDetailsStock} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detailsFruit && (
        <Modal
          title={`${detailsFruit.fruit_name} Details`}
          onClose={() => setDetailsFruit(null)}
          footer={<button type="button" className="btn-secondary" onClick={() => setDetailsFruit(null)}>Close</button>}
        >
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value">{detailsFruit.status === 'AVAILABLE' ? 'Available' : 'Unavailable'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Total stock</span>
              <span className="detail-value">{getFruitStock(detailsFruit.fruit_id)} boxes</span>
            </div>
            <div className="detail-item detail-span">
              <span className="detail-label">Description</span>
              <span className="detail-value">{detailsFruit.description || '-'}</span>
            </div>
            {SIZES.map((size) => (
              <div className="detail-item" key={`${size}-price`}>
                <span className="detail-label">{size.charAt(0).toUpperCase() + size.slice(1)} price</span>
                <span className="detail-value">{getPrice(detailsFruit.fruit_id, size)}</span>
              </div>
            ))}
            {SIZES.map((size) => (
              <div className="detail-item" key={`${size}-quantity`}>
                <span className="detail-label">{size.charAt(0).toUpperCase() + size.slice(1)} stock</span>
                <span className="detail-value">{findStockRow(detailsFruit.fruit_id, size)?.available_quantity ?? 0} boxes</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {detailsStock && (
        <Modal
          title={`${detailsStock.fruit_name} - ${String(detailsStock.packaging_size || '').charAt(0).toUpperCase()}${String(detailsStock.packaging_size || '').slice(1)} Stock Details`}
          onClose={() => setDetailsStock(null)}
          footer={<button type="button" className="btn-secondary" onClick={() => setDetailsStock(null)}>Close</button>}
        >
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Fruit</span>
              <span className="detail-value">{detailsStock.fruit_name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Packaging size</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>{detailsStock.packaging_size}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Available quantity</span>
              <span className="detail-value">{detailsStock.available_quantity} boxes</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Selling price</span>
              <span className="detail-value">{formatMoney(detailsStock.selling_price)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Stock status</span>
              <span className="detail-value">{Number(detailsStock.available_quantity) < 10 ? 'Low stock' : 'In stock'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Fruit status</span>
              <span className="detail-value">{getFruitStatus(detailsStock.fruit_id) === 'AVAILABLE' ? 'Available' : 'Unavailable'}</span>
            </div>
            <div className="detail-item detail-span">
              <span className="detail-label">Line value</span>
              <span className="detail-value">{formatMoney((Number(detailsStock.available_quantity) || 0) * (Number(detailsStock.selling_price) || 0))}</span>
            </div>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal
          title={modal === 'edit' ? 'Edit Fruit' : 'Add Fruit'}
          onClose={() => !saving && setModal(null)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button type="submit" form="fruit-form" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Fruit'}</button>
            </>
          }
        >
          <form id="fruit-form" className="form-grid" onSubmit={handleSaveFruit}>
            {error && <div className="alert alert-error" role="alert" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>{error}</div>}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="fruit_name">Fruit Name</label>
              <input id="fruit_name" type="text" required value={form.fruit_name} onChange={(event) => setForm({ ...form, fruit_name: event.target.value })} placeholder="e.g. Peaches" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="description">Description</label>
              <input id="description" type="text" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Variety or notes" />
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="UNAVAILABLE">UNAVAILABLE</option>
              </select>
            </div>
            {SIZES.map((size) => (
              <div className="form-group" key={size}>
                <label htmlFor={`price-${size}`}>{size.charAt(0).toUpperCase() + size.slice(1)} price (M)</label>
                <input id={`price-${size}`} type="number" min="0" step="0.01" required value={form[size]} onChange={(event) => setForm({ ...form, [size]: event.target.value })} />
              </div>
            ))}
            {modal === 'edit' && SIZES.map((size) => (
              <div className="form-group" key={`qty-${size}`}>
                <label htmlFor={`quantity-${size}`}>{size.charAt(0).toUpperCase() + size.slice(1)} quantity (boxes)</label>
                <input id={`quantity-${size}`} type="number" min="0" step="1" required value={form[`${size}_qty`]} onChange={(event) => setForm({ ...form, [`${size}_qty`]: event.target.value })} />
              </div>
            ))}
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Deactivate Fruit"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</button>
              <button type="button" className="btn-danger" onClick={handleDeleteFruit} disabled={saving}>{saving ? 'Working...' : 'Deactivate'}</button>
            </>
          }
        >
          <p style={{ margin: 0 }}>Mark <strong>{deleteTarget.fruit_name}</strong> as UNAVAILABLE? Stock and sale history will be preserved.</p>
        </Modal>
      )}
    </div>
  );
}

function StockRow({ row, fruitStatus, onSave, onView }) {
  const [price, setPrice] = useState(String(row.selling_price));
  const [quantity, setQuantity] = useState(String(row.available_quantity));

  return (
    <tr>
      <td>{row.fruit_name}</td>
      <td style={{ textTransform: 'capitalize' }}>{row.packaging_size}</td>
      <td>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input className="form-group-input quantity-input" type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <button type="button" className="btn-secondary" onClick={() => onSave(row, 'quantity', quantity)}>Save</button>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input className="form-group-input quantity-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          <button type="button" className="btn-secondary" onClick={() => onSave(row, 'price', price)}>Save</button>
        </div>
      </td>
      <td>
        <StockStatusPill fruitStatus={fruitStatus} quantity={row.available_quantity} />
      </td>
      <td className="table-actions">
        <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={() => onView(row)}>View</button>
      </td>
    </tr>
  );
}
