import { useCallback, useEffect, useState } from 'react';
import { apiRequest, extractList } from '../api/client';
import Modal from '../components/Modal';
import TableToolbar from '../components/TableToolbar';

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const getVendorId = (vendor) => vendor?.vendor_id ?? vendor?.id;
const getFruitId = (fruit) => fruit?.fruit_id ?? fruit?.id;

const PAYMENT_METHOD_LABELS = { CASH: 'Cash', MOBILE_MONEY: 'Mobile Money', CREDIT: 'Credit' };
const SALE_STATUS_META = {
  PAID: { label: 'Paid', className: 'status-paid' },
  PARTIALLY_PAID: { label: 'Pending', className: 'status-pending' },
  UNPAID: { label: 'Overdue', className: 'status-overdue' },
};
const SALE_STATUS_OPTIONS = [
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIALLY_PAID', label: 'Pending' },
  { value: 'UNPAID', label: 'Overdue' },
];
const PAYMENT_TYPE_LABELS = { LEGACY: 'Imported', PAYMENT: 'Payment', ADJUSTMENT: 'Correction' };
const paymentMethodLabel = (value) => PAYMENT_METHOD_LABELS[value] || value || '-';
const paymentTypeLabel = (value) => PAYMENT_TYPE_LABELS[value] || value || '-';
const saleStatus = (value) => SALE_STATUS_META[value] || { label: value || '-', className: 'status-pending' };

const EMPTY_ITEM = { fruit_id: '', packaging_size: 'medium', quantity: '1' };
const EMPTY_FORM = {
  vendor_id: '',
  payment_method: 'CASH',
  amount_paid: '0',
  sale_date: todayString(),
  items: [{ ...EMPTY_ITEM }],
};
const EMPTY_PAYMENT = { sale: null, amount: '', payment_method: 'CASH' };

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [fruits, setFruits] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [payment, setPayment] = useState(EMPTY_PAYMENT);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [saleRes, vendorRes, fruitRes, stockRes] = await Promise.all([
        apiRequest('/sales'),
        apiRequest('/vendors'),
        apiRequest('/fruits'),
        apiRequest('/fruits/stock'),
      ]);
      setSales(extractList(saleRes));
      setVendors(extractList(vendorRes));
      setFruits(extractList(fruitRes));
      setStockRows(extractList(stockRes));
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

  const vendorValue = form.vendor_id || (vendors.length ? String(getVendorId(vendors[0]) ?? '') : '');
  const defaultFruitId = fruits.length ? String(getFruitId(fruits[0]) ?? '') : '';
  const activeItems = form.items.map((item) => (item.fruit_id ? item : { ...item, fruit_id: defaultFruitId }));

  const findStock = (item) => stockRows.find((row) => (
    Number(row.fruit_id) === Number(item.fruit_id) && row.packaging_size === item.packaging_size
  ));
  const itemTotal = (item) => {
    const stock = findStock(item);
    return (Number(stock?.selling_price) || 0) * (Number(item.quantity) || 0);
  };
  const estimatedTotal = activeItems.reduce((sum, item) => sum + itemTotal(item), 0);

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

  async function handleAddSale(event) {
    event.preventDefault();
    if (!vendorValue) {
      setError('Select a vendor before recording a sale.');
      return;
    }

    const items = [];
    for (const item of activeItems) {
      if (!item.fruit_id || item.quantity === '') {
        setError('Every sale item needs a fruit and quantity.');
        return;
      }
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        setError('Item quantities must be whole numbers greater than zero.');
        return;
      }
      const stock = findStock(item);
      if (!stock) {
        setError('No stock entry exists for one of the selected fruit and packaging sizes.');
        return;
      }
      if (Number(stock.available_quantity) < quantity) {
        setError(`Insufficient stock for ${stock.fruit_name} (${item.packaging_size}).`);
        return;
      }
      items.push({ fruit_id: Number(item.fruit_id), packaging_size: item.packaging_size, quantity });
    }

    const amountPaid = Number(form.amount_paid) || 0;
    if (amountPaid < 0 || amountPaid > estimatedTotal + 0.0001) {
      setError('Amount paid cannot be negative or exceed the sale total.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify({
          vendor_id: Number(vendorValue),
          sale_date: form.sale_date,
          payment_method: form.payment_method,
          amount_paid: amountPaid,
          items,
        }),
      });
      setMessage(`${items.length} sale item${items.length === 1 ? '' : 's'} recorded; stock decreased.`);
      setError('');
      setForm({ ...EMPTY_FORM, sale_date: todayString() });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadPaymentHistory(saleId) {
    setPaymentHistoryLoading(true);
    try {
      const response = await apiRequest(`/sales/${saleId}/payments`);
      setPaymentHistory(extractList(response));
    } catch (err) {
      setError(err.message);
    } finally {
      setPaymentHistoryLoading(false);
    }
  }

  function openPayment(sale) {
    setPayment({ sale, amount: '', payment_method: sale.payment_method || 'CASH' });
    setPaymentHistory([]);
    setMessage('');
    setError('');
    void loadPaymentHistory(sale.sale_id);
  }

  async function handlePaymentSave(event) {
    event.preventDefault();
    const amount = Number(payment.amount);
    const balance = Math.max(0, Number(payment.sale.balance_due) || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an instalment amount greater than zero.');
      return;
    }
    if (amount > balance + 0.0001) {
      setError('Instalment amount cannot exceed the outstanding balance.');
      return;
    }

    setSaving(true);
    try {
      const response = await apiRequest(`/sales/${payment.sale.sale_id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          payment_method: payment.payment_method,
        }),
      });
      const updatedSale = response.data;
      setPayment({ sale: updatedSale, amount: '', payment_method: updatedSale.payment_method || payment.payment_method });
      setMessage(`Payment recorded for sale #${updatedSale.sale_id}.`);
      setError('');
      await loadData();
      await loadPaymentHistory(updatedSale.sale_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const query = search.trim().toLowerCase();
  const filtered = sales.filter((sale) => {
    const matchesQuery = !query
      || String(sale.vendor_name || '').toLowerCase().includes(query)
      || String(sale.items || '').toLowerCase().includes(query)
      || String(sale.sale_id || '').includes(query);
    const saleDate = String(sale.sale_date || '').slice(0, 10);
    const matchesStartDate = !startDate || saleDate >= startDate;
    const matchesEndDate = !endDate || saleDate <= endDate;
    const matchesStatus = status === 'ALL' || sale.payment_status === status;
    return matchesQuery && matchesStartDate && matchesEndDate && matchesStatus;
  });

  return (
    <div className="records-page">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Sales</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>Outgoing fruit orders and vendor sales</p>
        </div>
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search sales..."
          showDate
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          status={status}
          statusOptions={SALE_STATUS_OPTIONS}
          onStatusChange={setStatus}
        >
          <button type="button" className="btn-secondary" onClick={loadData}>Refresh</button>
        </TableToolbar>
      </div>

      <form onSubmit={handleAddSale} className="card form-grid record-form-card">
        <div className="form-group">
          <label htmlFor="vendor_id">Vendor / Buyer</label>
          <select id="vendor_id" required value={vendorValue} onChange={(event) => setForm({ ...form, vendor_id: event.target.value })}>
            <option value="">{vendors.length ? 'Select vendor' : 'No vendors available'}</option>
            {vendors.map((vendor) => (
              <option key={getVendorId(vendor)} value={getVendorId(vendor)}>{vendor.vendor_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="payment_method">Payment Method</label>
          <select id="payment_method" value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}>
            <option value="CASH">Cash</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CREDIT">Credit</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="amount_paid">Amount Paid Now (M)</label>
          <input id="amount_paid" type="number" min="0" step="0.01" value={form.amount_paid} onChange={(event) => setForm({ ...form, amount_paid: event.target.value })} />
          <span className="muted" style={{ fontSize: '0.76rem' }}>Estimated total: M {estimatedTotal.toFixed(2)}</span>
        </div>
        <div className="form-group">
          <label htmlFor="sale_date">Sale Date</label>
          <input id="sale_date" type="date" required value={form.sale_date} onChange={(event) => setForm({ ...form, sale_date: event.target.value })} />
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Sale Items</strong>
            <button type="button" className="btn-secondary" onClick={addItem}>+ Add Item</button>
          </div>
          {activeItems.map((item, index) => {
            const stock = findStock(item);
            return (
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
                    <span className="muted" style={{ fontSize: '0.76rem' }}>
                      {stock ? `${stock.available_quantity} available at M ${Number(stock.selling_price).toFixed(2)}` : 'No stock entry'}
                    </span>
                  </div>
                </div>
                <div className="line-item-actions">
                  <button type="button" className="btn-danger" onClick={() => removeItem(index)}>Remove</button>
                </div>
              </div>
            );
          })}
          <div style={{ textAlign: 'right', fontWeight: 600 }}>Estimated total: M {estimatedTotal.toFixed(2)}</div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : '+ Record Sale'}</button>
        </div>
      </form>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card table-scroll record-table-card">
        {loading ? (
          <p style={{ margin: 0 }}>Loading sales...</p>
        ) : filtered.length === 0 ? (
          <p style={{ margin: 0 }}>No sale records found.</p>
        ) : (
          <table className="record-table">
            <thead>
              <tr><th>ID</th><th>Vendor</th><th>Items</th><th>Boxes</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((sale) => (
                <tr key={sale.sale_id}>
                  <td>{sale.sale_id}</td>
                  <td>{sale.vendor_name}</td>
                  <td>{sale.items || '-'}</td>
                  <td>{Number(sale.total_boxes) || 0}</td>
                  <td>M {Number(sale.total_amount || 0).toFixed(2)}</td>
                  <td>M {Number(sale.amount_paid || 0).toFixed(2)}</td>
                  <td>M {Number(sale.balance_due || 0).toFixed(2)}</td>
                  <td><span className={`status-pill ${saleStatus(sale.payment_status).className}`}>{saleStatus(sale.payment_status).label}</span></td>
                  <td>{String(sale.sale_date || '').slice(0, 10) || '-'}</td>
                  <td className="table-actions">
                    <button type="button" className="record-action record-detail-button" data-no-overlay="true" onClick={() => setSelectedSale(sale)}>View</button>
                    <button type="button" className="record-action" onClick={() => openPayment(sale)}>Add Payment</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {payment.sale && (
        <Modal
          title={`Payments - Sale #${payment.sale.sale_id}`}
          onClose={() => !saving && setPayment(EMPTY_PAYMENT)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setPayment(EMPTY_PAYMENT)} disabled={saving}>Cancel</button>
              <button type="submit" form="payment-form" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Payment'}</button>
            </>
          }
        >
          <form id="payment-form" className="form-grid" onSubmit={handlePaymentSave}>
            <div className="detail-grid" style={{ gridColumn: '1 / -1' }}>
              <div className="detail-item"><span className="detail-label">Sale ID</span><span className="detail-value">{payment.sale.sale_id}</span></div>
              <div className="detail-item"><span className="detail-label">Vendor</span><span className="detail-value">{payment.sale.vendor_name || '-'}</span></div>
              <div className="detail-item"><span className="detail-label">Total Amount</span><span className="detail-value">M {Number(payment.sale.total_amount || 0).toFixed(2)}</span></div>
              <div className="detail-item"><span className="detail-label">Amount Paid</span><span className="detail-value">M {Number(payment.sale.amount_paid || 0).toFixed(2)}</span></div>
              <div className="detail-item"><span className="detail-label">Balance Due</span><span className="detail-value">M {Math.max(0, Number(payment.sale.balance_due) || 0).toFixed(2)}</span></div>
            </div>
            <div className="form-group">
              <label htmlFor="payment_amount">Instalment Amount (M)</label>
              <input id="payment_amount" type="number" min="0.01" max={Math.max(0, Number(payment.sale.balance_due) || 0).toFixed(2)} step="0.01" required value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} />
              <span className="muted" style={{ fontSize: '0.76rem' }}>Enter the amount being paid now.</span>
            </div>
            <div className="form-group">
              <label htmlFor="payment_method_modal">Payment Method</label>
              <select id="payment_method_modal" value={payment.payment_method} onChange={(event) => setPayment({ ...payment, payment_method: event.target.value })}>
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ margin: '12px 0 8px', fontSize: '1rem' }}>Payment History</h3>
              {paymentHistoryLoading ? (
                <p className="muted" style={{ margin: 0 }}>Loading payment history...</p>
              ) : paymentHistory.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>No payment history recorded for this sale.</p>
              ) : (
                <div className="table-scroll">
                  <table className="record-table">
                    <thead>
                      <tr><th>Date</th><th>Type</th><th>Amount</th><th>Method</th></tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((entry) => (
                        <tr key={entry.entry_id}>
                          <td>{String(entry.entry_date || '').slice(0, 10) || '-'}</td>
                          <td>{paymentTypeLabel(entry.entry_type)}</td>
                          <td>M {Number(entry.amount || 0).toFixed(2)}</td>
                          <td>{paymentMethodLabel(entry.payment_method)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </form>
        </Modal>
      )}

      {selectedSale && (
        <Modal title={`Sale #${selectedSale.sale_id}`} onClose={() => setSelectedSale(null)}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Sale ID</span><span className="detail-value">{selectedSale.sale_id}</span></div>
            <div className="detail-item"><span className="detail-label">Vendor</span><span className="detail-value">{selectedSale.vendor_name || '-'}</span></div>
            <div className="detail-item"><span className="detail-label">Sale Date</span><span className="detail-value">{String(selectedSale.sale_date || '').slice(0, 10) || '-'}</span></div>
            <div className="detail-item"><span className="detail-label">Payment Method</span><span className="detail-value">{paymentMethodLabel(selectedSale.payment_method)}</span></div>
            <div className="detail-item"><span className="detail-label">Payment Status</span><span className="detail-value"><span className={`status-pill ${saleStatus(selectedSale.payment_status).className}`}>{saleStatus(selectedSale.payment_status).label}</span></span></div>
            <div className="detail-item"><span className="detail-label">Total Amount</span><span className="detail-value">M {Number(selectedSale.total_amount || 0).toFixed(2)}</span></div>
            <div className="detail-item"><span className="detail-label">Amount Paid</span><span className="detail-value">M {Number(selectedSale.amount_paid || 0).toFixed(2)}</span></div>
            <div className="detail-item"><span className="detail-label">Balance Due</span><span className="detail-value">M {Number(selectedSale.balance_due || 0).toFixed(2)}</span></div>
            <div className="detail-item"><span className="detail-label">Total Boxes</span><span className="detail-value">{Number(selectedSale.total_boxes) || 0}</span></div>
            <div className="detail-item detail-span"><span className="detail-label">Items</span><span className="detail-value">{selectedSale.items || '-'}</span></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
