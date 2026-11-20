import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';

const emptySaleItem = {
  fruit_id: '',
  packaging_size: 'small',
  quantity: 1,
};

export default function SalesPage() {
  const [vendors, setVendors] = useState([]);
  const [fruits, setFruits] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [sales, setSales] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('0');
  const [items, setItems] = useState([{ ...emptySaleItem }]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSaleData = async () => {
    try {
      setError('');
      const [venRes, fruitRes, stockRes, salesRes] = await Promise.all([
        apiRequest('/vendors'),
        apiRequest('/fruits'),
        apiRequest('/fruits/stock'),
        apiRequest('/sales'),
      ]);

      const vendorList = venRes.data || [];
      const fruitList = fruitRes.data || [];

      setVendors(vendorList);
      setFruits(fruitList);
      setStockRows(stockRes.data || []);
      setSales(salesRes.data || []);

      if (!vendorId && vendorList.length > 0) {
        setVendorId(String(vendorList[0].vendor_id));
      }

      if (fruitList.length > 0 && !items[0].fruit_id) {
        setItems([{ ...emptySaleItem, fruit_id: String(fruitList[0].fruit_id) }]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadSaleData();
  }, []);

  const getStockInfo = (fruitId, packagingSize) => {
    return stockRows.find(
      (s) =>
        Number(s.fruit_id) === Number(fruitId) &&
        s.packaging_size === packagingSize
    );
  };

  const addItemRow = () => {
    const defaultFruitId = fruits.length > 0 ? String(fruits[0].fruit_id) : '';
    setItems([...items, { ...emptySaleItem, fruit_id: defaultFruitId }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const updateItem = (index, field, value) => {
    setItems(
      items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const totalAmount = items.reduce((sum, item) => {
    const stock = getStockInfo(item.fruit_id, item.packaging_size);
    const price = stock ? Number(stock.selling_price) : 0;
    const qty = Number(item.quantity) || 0;
    return sum + price * qty;
  }, 0);

  const paidNumeric = Number(amountPaid) || 0;
  const balanceDue = Math.max(0, totalAmount - paidNumeric);

  const previewPaymentStatus =
    paidNumeric >= totalAmount && totalAmount > 0
      ? 'PAID'
      : paidNumeric > 0
      ? 'PARTIALLY_PAID'
      : 'UNPAID';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');

      const payload = {
        vendor_id: Number(vendorId),
        payment_method: paymentMethod,
        amount_paid: paidNumeric,
        items: items.map((item) => ({
          fruit_id: Number(item.fruit_id),
          packaging_size: item.packaging_size,
          quantity: Number(item.quantity),
        })),
      };

      await apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setMessage('Sale completed, stock updated, and payment recorded.');
      setAmountPaid('0');
      const defaultFruitId = fruits.length > 0 ? String(fruits[0].fruit_id) : '';
      setItems([{ ...emptySaleItem, fruit_id: defaultFruitId }]);
      loadSaleData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSettleBalance = async (sale) => {
    try {
      setError('');
      setMessage('');
      await apiRequest(`/sales/${sale.sale_id}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({
          payment_method: sale.payment_method === 'CREDIT' ? 'CASH' : sale.payment_method,
          amount_paid: Number(sale.total_amount),
        }),
      });
      setMessage(`Sale #${sale.sale_id} marked as PAID.`);
      loadSaleData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Vendor Sales & Payment Management</h1>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>Create New Sale</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Vendor</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                required
              >
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.vendor_name} — {v.location}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CREDIT">Outstanding / Credit</option>
              </select>
            </div>

            <div className="form-group">
              <label>Amount Paid Now (LSL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Auto Total / Balance Due</label>
              <input
                type="text"
                readOnly
                value={`Total: M ${totalAmount.toFixed(2)} | Due: M ${balanceDue.toFixed(2)} (${previewPaymentStatus})`}
                style={{ fontWeight: 700, backgroundColor: '#f9fafb' }}
              />
            </div>
          </div>

          <h4 style={{ margin: '1rem 0 0.5rem' }}>Sale Items</h4>
          {items.map((item, idx) => {
            const stock = getStockInfo(item.fruit_id, item.packaging_size);
            const available = stock ? stock.available_quantity : 0;
            const price = stock ? Number(stock.selling_price) : 0;

            return (
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
                  <label>Quantity (Avail: {available} @ M {price.toFixed(2)})</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
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
            );
          })}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button type="button" className="btn-secondary" onClick={addItemRow}>
              + Add Fruit Item
            </button>
            <button type="submit">Complete Sale</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Sales & Payment Records</h3>
        <table>
          <thead>
            <tr>
              <th>Sale ID</th>
              <th>Vendor</th>
              <th>Method</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance Due</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr><td colSpan="8">No sales recorded yet.</td></tr>
            ) : (
              sales.map((s) => {
                const due = Number(s.balance_due || 0);
                const badgeClass =
                  s.payment_status === 'PAID'
                    ? 'badge-success'
                    : s.payment_status === 'PARTIALLY_PAID'
                    ? 'badge-warning'
                    : 'badge-danger';

                return (
                  <tr key={s.sale_id}>
                    <td>#{s.sale_id}</td>
                    <td>{s.vendor_name}</td>
                    <td>{s.payment_method}</td>
                    <td>M {Number(s.total_amount).toFixed(2)}</td>
                    <td>M {Number(s.amount_paid).toFixed(2)}</td>
                    <td><strong>M {due.toFixed(2)}</strong></td>
                    <td><span className={`badge ${badgeClass}`}>{s.payment_status}</span></td>
                    <td>
                      {due > 0 && (
                        <button type="button" onClick={() => handleSettleBalance(s)}>
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
