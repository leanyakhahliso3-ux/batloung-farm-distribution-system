import { useCallback, useEffect, useState } from 'react';
import { apiRequest, extractList } from '../api/client';
import Modal from '../components/Modal';
import TableToolbar from '../components/TableToolbar';

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const getSupplierId = (supplier) => supplier?.supplier_id ?? supplier?.id;
const getFruitId = (fruit) => fruit?.fruit_id ?? fruit?.id;

const EMPTY_ITEM = { fruit_id: '', packaging_size: 'medium', quantity: '1', unit_cost: '' };
const EMPTY_FORM = { supplier_id: '', purchase_date: todayString(), items: [{ ...EMPTY_ITEM }] };
const PURCHASE_STATUS_OPTIONS = [{ value: 'RECORDED', label: 'Recorded' }];
const purchaseStatus = (purchase) => purchase.status || 'RECORDED';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [fruits, setFruits] = useState([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [purchaseRes, supplierRes, fruitRes] = await Promise.all([
        apiRequest('/purchases'),
        apiRequest('/suppliers'),
        apiRequest('/fruits'),
      ]);
      setPurchases(extractList(purchaseRes));
      setSuppliers(extractList(supplierRes));
      setFruits(extractList(fruitRes));
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

  const supplierValue = form.supplier_id || (suppliers.length ? String(getSupplierId(suppliers[0]) ?? '') : '');
  const defaultFruitId = fruits.length ? String(getFruitId(fruits[0]) ?? '') : '';
  const activeItems = form.items.map((item) => (item.fruit_id ? item : { ...item, fruit_id: defaultFruitId }));

  function updateItem(index, patch) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { ...EMPTY_ITEM, fruit_id: current.items[0]?.fruit_id || defaultFruitId }],
    }));
  }

  function removeItem(index) {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1
        ? [{ ...EMPTY_ITEM, fruit_id: defaultFruitId }]
        : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleAddPurchase(event) {
    event.preventDefault();
    if (!supplierValue) {
      setError('Select a supplier before recording a purchase.');
      return;
    }

    const items = [];
    for (const item of activeItems) {
      if (!item.fruit_id || item.quantity === '' || item.unit_cost === '') {
        setError('Every purchase item needs a fruit, quantity and unit cost.');
        return;
      }
      const quantity = Number(item.quantity);
      const unitCost = Number(item.unit_cost);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        setError('Item quantities must be whole numbers greater than zero.');
        return;
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        setError('Item unit costs cannot be negative.');
        return;
      }
      items.push({
        fruit_id: Number(item.fruit_id),
        packaging_size: item.packaging_size,
        quantity,
        unit_cost: unitCost,
      });
    }

    setSaving(true);
    try {
      await apiRequest('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: Number(supplierValue),
          purchase_date: form.purchase_date,
          items,
        }),
      });
      setMessage(`${items.length} purchase item${items.length === 1 ? '' : 's'} recorded; stock increased.`);
      setError('');
      setForm({ ...EMPTY_FORM, purchase_date: todayString() });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const query = search.trim().toLowerCase();
  const filtered = purchases.filter((purchase) => {
    const matchesQuery = !query
      || String(purchase.business_name || '').toLowerCase().includes(query)
      || String(purchase.items || '').toLowerCase().includes(query)
      || String(purchase.purchase_id || '').includes(query);
    const purchaseDate = String(purchase.purchase_date || '').slice(0, 10);
    const matchesStartDate = !startDate || purchaseDate >= startDate;
    const matchesEndDate = !endDate || purchaseDate <= endDate;
    const matchesStatus = status === 'ALL' || purchaseStatus(purchase) === status;
    return matchesQuery && matchesStartDate && matchesEndDate && matchesStatus;
  });
  const estimatedTotal = activeItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
    0
  );

  return (
    <div className="records-page">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Purchases</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>Incoming fruit procurement from suppliers</p>
        </div>
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search purchases..."
          showDate
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          status={status}
          statusOptions={PURCHASE_STATUS_OPTIONS}
          onStatusChange={setStatus}
        >
          <button type="button" className="btn-secondary" onClick={loadData}>Refresh</button>
        </TableToolbar>
      </div>

      <form onSubmit={handleAddPurchase} className="card form-grid record-form-card">
        <div className="form-group">
          <label htmlFor="supplier_id">Supplier</label>
          <select id="supplier_id" required value={supplierValue} onChange={(event) => setForm({ ...form, supplier_id: event.target.value })}>
            <option value="">{suppliers.length ? 'Select supplier' : 'No suppliers available'}</option>
            {suppliers.map((supplier) => (
              <option key={getSupplierId(supplier)} value={getSupplierId(supplier)}>{supplier.business_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="purchase_date">Purchase Date</label>
          <input id="purchase_date" type="date" required value={form.purchase_date} onChange={(event) => setForm({ ...form, purchase_date: event.target.value })} />
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Purchase Items</strong>
            <button type="button" className="btn-secondary" onClick={addItem}>+ Add Item</button>
          </div>
          {activeItems.map((item, index) => (
            <div key={index} className="line-item-row">
              <div className="line-item-fields">
                <div className="form-group">
                  <label htmlFor={`fruit-${index}`}>Fruit</label>
                  <select id={`fruit-${index}`} required value={item.fruit_id} onChange={(event) => updateItem(index, { fruit_id: event.target.value })}>
                    <option value="">{fruits.length ? 'Select fruit' : 'No fruits available'}</option>
                    {fruits.map((fruit) => (
                      <option key={getFruitId(fruit)} value={getFruitId(fruit)}>{fruit.fruit_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor={`size-${index}`}>Packaging Size</label>
                  <select id={`size-${index}`} value={item.packaging_size} onChange={(event) => updateItem(index, { packaging_size: event.target.value })}>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor={`quantity-${index}`}>Quantity (boxes)</label>
                  <input id={`quantity-${index}`} type="number" min="1" step="1" required value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor={`cost-${index}`}>Unit Cost (M)</label>
                  <input id={`cost-${index}`} type="number" min="0" step="0.01" required value={item.unit_cost} onChange={(event) => updateItem(index, { unit_cost: event.target.value })} />
                </div>
              </div>
              <div className="line-item-actions">
                <button type="button" className="btn-danger" onClick={() => removeItem(index)}>Remove</button>
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'right', fontWeight: 600 }}>Estimated total: M {estimatedTotal.toFixed(2)}</div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : '+ Record Purchase'}</button>
        </div>
      </form>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card table-scroll record-table-card">
        {loading ? (
          <p style={{ margin: 0 }}>Loading purchases...</p>
        ) : filtered.length === 0 ? (
          <p style={{ margin: 0 }}>No purchase records found.</p>
        ) : (
          <table className="record-table">
            <thead>
              <tr><th>ID</th><th>Supplier</th><th>Items</th><th>Boxes</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((purchase) => (
                <tr key={purchase.purchase_id}>
                  <td>{purchase.purchase_id}</td>
                  <td>{purchase.business_name}</td>
                  <td>{purchase.items || '-'}</td>
                  <td>{Number(purchase.total_boxes) || 0}</td>
                  <td>M {Number(purchase.total_amount || 0).toFixed(2)}</td>
                  <td><span className="status-pill status-paid">Recorded</span></td>
                  <td>{String(purchase.purchase_date || '').slice(0, 10) || '-'}</td>
                  <td className="table-actions">
                    <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={() => setSelectedPurchase(purchase)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedPurchase && (
        <Modal title={`Purchase #${selectedPurchase.purchase_id}`} onClose={() => setSelectedPurchase(null)}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Purchase ID</span><span className="detail-value">{selectedPurchase.purchase_id}</span></div>
            <div className="detail-item"><span className="detail-label">Supplier</span><span className="detail-value">{selectedPurchase.business_name || '-'}</span></div>
            <div className="detail-item"><span className="detail-label">Purchase Date</span><span className="detail-value">{String(selectedPurchase.purchase_date || '').slice(0, 10) || '-'}</span></div>
            <div className="detail-item"><span className="detail-label">Total Amount</span><span className="detail-value">M {Number(selectedPurchase.total_amount || 0).toFixed(2)}</span></div>
            <div className="detail-item"><span className="detail-label">Total Boxes</span><span className="detail-value">{Number(selectedPurchase.total_boxes) || 0}</span></div>
            <div className="detail-item detail-span"><span className="detail-label">Items</span><span className="detail-value">{selectedPurchase.items || '-'}</span></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
