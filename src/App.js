import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';
const SUPPLIERS_API = `${API_BASE}/suppliers`;
const TOKEN_KEY = 'batloung_token';
const USER_KEY = 'batloung_user';
const UNAUTHORIZED_EVENT = 'batloung:unauthorized';

const menuItems = [
  { name: 'Dashboard' },
  { name: 'Suppliers' },
  { name: 'Fruits'},
  { name: 'Stock Management'},
  { name: 'Vendors'},
  { name: 'Purchases' },
  { name: 'Sales'},
  { name: 'Payments'},
  { name: 'Reports'},
];

const provinces = [
  'Gauteng',
  'Free State',
  'KwaZulu-Natal',
  'Western Cape',
  'Eastern Cape',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

const packagingSizes = ['SMALL', 'MEDIUM', 'LARGE'];
const paymentMethods = ['CASH', 'MOBILE_MONEY', 'CREDIT'];
const fruitStatuses = ['Available', 'Unavailable'];

function todayISO() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function longDate() {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function money(value) {
  const amount = Number(value || 0);
  return `M ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseMoneyToCents(value) {
  const text = String(value ?? '').trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return 0;
  }

  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function calculateFormTotal(items, costField) {
  return items.reduce((total, item) => (
    total + parseMoneyToCents(item[costField]) * Number(item.quantity || 0)
  ), 0);
}

function newPaymentReference(row) {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  const type = row.type ? row.type.slice(0, 3).toUpperCase() : 'PAY';
  return `${type}-${stamp}-${random}`;
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function StatusBadge({ status }) {
  const text = String(status || '').replace(/_/g, ' ');
  let style = 'paid';

  if (status === 'UNPAID' || status === 'Unavailable') {
    style = 'unpaid';
  } else if (status === 'PARTIALLY_PAID') {
    style = 'low-stock';
  }

  return <span className={`status ${style}`}>{text}</span>;
}

const ENTITY_CONFIG = {
  Fruits: {
    title: 'Fruit',
    endpoint: `${API_BASE}/fruits`,
    idKey: 'fruit_id',
    description: 'Manage the fruits distributed by Batloung Farm.',
    fields: [
      { name: 'fruit_name', label: 'Fruit Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', full: true },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: fruitStatuses,
        required: true,
        default: 'Available',
      },
    ],
  },
  'Stock Management': {
    title: 'Stock Record',
    endpoint: `${API_BASE}/stock`,
    idKey: 'stock_id',
    description: 'Monitor available fruit boxes by packaging size.',
    fields: [
      {
        name: 'fruit_id',
        label: 'Fruit',
        type: 'select',
        optionsFrom: 'fruits',
        required: true,
      },
      {
        name: 'packaging_size',
        label: 'Packaging Size',
        type: 'select',
        options: packagingSizes,
        required: true,
        default: 'SMALL',
      },
      {
        name: 'available_quantity',
        label: 'Available Boxes',
        type: 'number',
        required: true,
        default: 0,
        min: 0,
      },
    ],
  },
  Vendors: {
    title: 'Vendor',
    endpoint: `${API_BASE}/vendors`,
    idKey: 'vendor_id',
    description: 'Manage registered street vendors and retailers.',
    fields: [
      { name: 'vendor_name', label: 'Vendor Name', type: 'text', required: true },
      { name: 'phone_number', label: 'Phone', type: 'tel', required: true },
      { name: 'location', label: 'Location', type: 'text', required: true },
      {
        name: 'registration_date',
        label: 'Registration Date',
        type: 'date',
        required: true,
        default: todayISO(),
      },
    ],
  },
  Purchases: {
    title: 'Purchase',
    endpoint: `${API_BASE}/purchases`,
    idKey: 'purchase_id',
    description: 'Record purchases of fruit from registered suppliers.',
    hasItems: true,
    itemCostField: 'unit_cost',
    itemCostLabel: 'Unit Cost (M)',
    fields: [
      {
        name: 'supplier_id',
        label: 'Supplier',
        type: 'select',
        optionsFrom: 'suppliers',
        required: true,
      },
      {
        name: 'purchase_date',
        label: 'Purchase Date',
        type: 'date',
        required: true,
        default: todayISO(),
      },
      {
        name: 'payment_method',
        label: 'Payment Method',
        type: 'select',
        options: paymentMethods,
        required: true,
        default: 'CREDIT',
      },
      {
        name: 'amount_paid',
        label: 'Initial Payment (M)',
        type: 'number',
        required: true,
        default: 0,
        min: 0,
        step: '0.01',
        createOnly: true,
      },
    ],
  },
  Sales: {
    title: 'Sale',
    endpoint: `${API_BASE}/sales`,
    idKey: 'sale_id',
    description: 'Record fruit sales to registered vendors.',
    hasItems: true,
    itemCostField: 'unit_price',
    itemCostLabel: 'Unit Price (M)',
    fields: [
      {
        name: 'vendor_id',
        label: 'Vendor',
        type: 'select',
        optionsFrom: 'vendors',
        required: true,
      },
      {
        name: 'sale_date',
        label: 'Sale Date',
        type: 'date',
        required: true,
        default: todayISO(),
      },
      {
        name: 'payment_method',
        label: 'Payment Method',
        type: 'select',
        options: paymentMethods,
        required: true,
        default: 'CASH',
      },
      {
        name: 'amount_paid',
        label: 'Initial Payment (M)',
        type: 'number',
        required: true,
        default: 0,
        min: 0,
        step: '0.01',
        createOnly: true,
      },
    ],
  },
};

const emptySupplierForm = {
  business_name: '',
  contact_person: '',
  phone: '',
  province: '',
  address: '',
};

async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem(TOKEN_KEY);

  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let result = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (response.status === 401 && !options.skipAuth) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'The request could not be completed.');
  }

  return result;
}

function useApiResource(url, initialValue, enabled = true) {
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const result = await apiFetch(url);
        if (active) {
          setData(result.data === undefined ? initialValueRef.current : result.data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Could not load data.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [url, reloadKey, enabled]);

  return {
    data,
    loading,
    error,
    reload: () => setReloadKey(key => key + 1),
  };
}

function App() {
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem(TOKEN_KEY),
    user: readStoredUser(),
  }));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [activePage, setActivePage] = useState('Dashboard');
  const [search, setSearch] = useState('');

  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(Boolean(auth.token));
  const [suppliersError, setSuppliersError] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('All Provinces');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [formError, setFormError] = useState('');

  const isAuthenticated = Boolean(auth.token);
  const canManage = ['ADMIN', 'MANAGER'].includes(auth.user && auth.user.role);
  const displayName = auth.user && auth.user.username
    ? auth.user.username
    : 'Staff member';
  const displayRole = auth.user && auth.user.role
    ? auth.user.role
    : 'No role';

  const fruitsResource = useApiResource(`${API_BASE}/fruits`, [], isAuthenticated);
  const stockResource = useApiResource(`${API_BASE}/stock`, [], isAuthenticated);
  const vendorsResource = useApiResource(`${API_BASE}/vendors`, [], isAuthenticated);
  const purchasesResource = useApiResource(`${API_BASE}/purchases`, [], isAuthenticated);
  const salesResource = useApiResource(`${API_BASE}/sales`, [], isAuthenticated);
  const paymentsResource = useApiResource(`${API_BASE}/payments`, [], isAuthenticated);
  const reportsResource = useApiResource(`${API_BASE}/reports/summary`, {
    summary: {},
    transactions: [],
    stock_alerts: [],
  }, isAuthenticated);

  const lowStockThreshold = Number(reportsResource.data.low_stock_threshold || 10);

  const resources = {
    Fruits: fruitsResource,
    'Stock Management': stockResource,
    Vendors: vendorsResource,
    Purchases: purchasesResource,
    Sales: salesResource,
    Payments: paymentsResource,
  };

  const [modalEntity, setModalEntity] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [formItems, setFormItems] = useState([]);
  const [savingResource, setSavingResource] = useState(false);

  const [paymentRow, setPaymentRow] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'CASH',
    payment_reference: '',
  });
  const [paymentError, setPaymentError] = useState('');
  const [paymentHistory, setPaymentHistory] = useState({
    row: null,
    loading: false,
    error: '',
    data: [],
  });

  const [detailsView, setDetailsView] = useState({
    entity: '',
    row: null,
    items: [],
    loading: false,
    error: '',
  });

  useEffect(() => {
    function handleUnauthorized() {
      setAuth({ token: null, user: null });
      setActivePage('Dashboard');
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError('');
    setLoggingIn(true);

    try {
      const result = await apiFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: loginForm,
        skipAuth: true,
      });

      localStorage.setItem(TOKEN_KEY, result.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.data.user));
      setAuth({ token: result.data.token, user: result.data.user });
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      setLoginError(error.message || 'Could not sign in.');
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    try {
      await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch {
      setAuth({ token: null, user: null });
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuth({ token: null, user: null });
    setActivePage('Dashboard');
  }

  async function loadSuppliers() {
    try {
      setSuppliersLoading(true);
      setSuppliersError('');

      const result = await apiFetch(SUPPLIERS_API);
      setSuppliers(result.data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setSuppliersError(
        'Could not load suppliers. Please check that the backend is running.'
      );
    } finally {
      setSuppliersLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setSuppliers([]);
      setSuppliersLoading(false);
      return;
    }

    loadSuppliers();
  }, [isAuthenticated]);

  const summary = reportsResource.data.summary || {};
  const transactions = reportsResource.data.transactions || [];
  const stockAlerts = reportsResource.data.stock_alerts || [];
  const outstanding = Number(summary.purchase_balance || 0) + Number(summary.sale_balance || 0);

  function openAddSupplierModal() {
    setEditingSupplier(null);
    setSupplierForm(emptySupplierForm);
    setFormError('');
    setShowSupplierModal(true);
  }

  function openEditSupplierModal(supplier) {
    setEditingSupplier(supplier);
    setSupplierForm({
      business_name: supplier.business_name,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      province: supplier.province,
      address: supplier.address,
    });
    setFormError('');
    setShowSupplierModal(true);
  }

  function closeSupplierModal() {
    setShowSupplierModal(false);
    setEditingSupplier(null);
    setSupplierForm(emptySupplierForm);
    setFormError('');
  }

  function handleSupplierInput(event) {
    const { name, value } = event.target;

    setSupplierForm(previous => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSupplierSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (
      !supplierForm.business_name.trim() ||
      !supplierForm.contact_person.trim() ||
      !supplierForm.phone.trim() ||
      !supplierForm.province ||
      !supplierForm.address.trim()
    ) {
      setFormError('Please complete all the fields.');
      return;
    }

    try {
      setSavingSupplier(true);

      const url = editingSupplier
        ? `${SUPPLIERS_API}/${editingSupplier.supplier_id}`
        : SUPPLIERS_API;

      await apiFetch(url, {
        method: editingSupplier ? 'PUT' : 'POST',
        body: supplierForm,
      });

      closeSupplierModal();
      await loadSuppliers();
      reportsResource.reload();
    } catch (error) {
      console.error('Supplier save error:', error);
      setFormError(error.message || 'Could not save supplier.');
    } finally {
      setSavingSupplier(false);
    }
  }

  async function handleDeleteSupplier(supplier) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${supplier.business_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(`${SUPPLIERS_API}/${supplier.supplier_id}`, {
        method: 'DELETE',
      });
      await loadSuppliers();
      reportsResource.reload();
    } catch (error) {
      console.error('Supplier delete error:', error);
      alert(error.message || 'Could not delete supplier.');
    }
  }

  function fieldOptions(field) {
    if (field.options) {
      return field.options.map(option => ({ value: option, label: option }));
    }

    if (field.optionsFrom === 'fruits') {
      return fruitsResource.data.map(fruit => ({
        value: fruit.fruit_id,
        label: fruit.fruit_name,
      }));
    }

    if (field.optionsFrom === 'suppliers') {
      return suppliers.map(supplier => ({
        value: supplier.supplier_id,
        label: supplier.business_name,
      }));
    }

    if (field.optionsFrom === 'vendors') {
      return vendorsResource.data.map(vendor => ({
        value: vendor.vendor_id,
        label: vendor.vendor_name,
      }));
    }

    return [];
  }

  function fieldsFromRow(config, row) {
    return config.fields.reduce((values, field) => {
      const value = row[field.name];
      values[field.name] = value === null || value === undefined
        ? field.default !== undefined ? field.default : ''
        : value;
      return values;
    }, {});
  }

  function openAddResource(entity) {
    const config = ENTITY_CONFIG[entity];

    setModalEntity(entity);
    setEditingRow(null);
    setFormValues(fieldsFromRow(config, {}));
    setFormItems([]);
    setFormError('');
  }

  async function openEditResource(entity, row) {
    const config = ENTITY_CONFIG[entity];
    const id = row[config.idKey];

    setModalEntity(entity);
    setEditingRow(row);
    setFormError('');
    setFormItems([]);
    setFormValues(fieldsFromRow(config, row));

    if (config.hasItems) {
      try {
        const result = await apiFetch(`${config.endpoint}/${id}`);
        setFormValues(fieldsFromRow(config, result.data));
        setFormItems((result.data.items || []).map(item => ({
          fruit_id: item.fruit_id,
          packaging_size: item.packaging_size,
          quantity: item.quantity,
          [config.itemCostField]: item[config.itemCostField],
        })));
      } catch (error) {
        setFormError(error.message || 'Could not load this record.');
      }
    }
  }

  function closeResourceModal() {
    setModalEntity('');
    setEditingRow(null);
    setFormValues({});
    setFormItems([]);
    setFormError('');
  }

  function handleFormInput(event) {
    const { name, value } = event.target;
    setFormValues(previous => ({ ...previous, [name]: value }));
  }

  function handleItemInput(index, event) {
    const { name, value } = event.target;
    setFormItems(previous => previous.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [name]: value } : item
    )));
  }

  function addFormItem() {
    const config = ENTITY_CONFIG[modalEntity];

    if (!config) {
      return;
    }

    setFormItems(previous => [
      ...previous,
      {
        fruit_id: '',
        packaging_size: packagingSizes[0],
        quantity: 1,
        [config.itemCostField]: 0,
      },
    ]);
  }

  function removeFormItem(index) {
    setFormItems(previous => previous.filter((item, itemIndex) => itemIndex !== index));
  }

  async function handleResourceSubmit(event) {
    event.preventDefault();

    const entity = modalEntity;
    const config = ENTITY_CONFIG[entity];

    if (!config) {
      return;
    }

    setFormError('');

    if (config.hasItems && formItems.length === 0) {
      setFormError('Add at least one fruit line.');
      return;
    }

    try {
      setSavingResource(true);

      const payload = config.fields.reduce((values, field) => {
        if (editingRow && field.createOnly) {
          return values;
        }

        if (formValues[field.name] !== undefined) {
          values[field.name] = formValues[field.name];
        }

        return values;
      }, {});

      if (config.hasItems) {
        payload.items = formItems;
      }

      const url = editingRow
        ? `${config.endpoint}/${editingRow[config.idKey]}`
        : config.endpoint;

      await apiFetch(url, {
        method: editingRow ? 'PUT' : 'POST',
        body: payload,
      });

      closeResourceModal();
      await resources[entity].reload();

      if (entity === 'Fruits' || entity === 'Purchases' || entity === 'Sales') {
        stockResource.reload();
      }

      if (entity === 'Purchases' || entity === 'Sales') {
        paymentsResource.reload();
      }

      reportsResource.reload();
    } catch (error) {
      setFormError(error.message || 'Could not save the record.');
    } finally {
      setSavingResource(false);
    }
  }

  async function handleResourceDelete(entity, row) {
    const config = ENTITY_CONFIG[entity];

    if (!window.confirm(`Are you sure you want to delete this ${config.title.toLowerCase()}?`)) {
      return;
    }

    try {
      await apiFetch(`${config.endpoint}/${row[config.idKey]}`, { method: 'DELETE' });
      await resources[entity].reload();

      if (entity === 'Fruits' || entity === 'Purchases' || entity === 'Sales') {
        stockResource.reload();
      }

      if (entity === 'Purchases' || entity === 'Sales') {
        paymentsResource.reload();
      }

      reportsResource.reload();
    } catch (error) {
      alert(error.message || 'Could not delete the record.');
    }
  }

  function openPaymentModal(row) {
    setPaymentRow(row);
    setPaymentForm({
      amount: '',
      payment_method: row.payment_method || 'CASH',
      payment_reference: newPaymentReference(row),
    });
    setPaymentError('');
  }

  function closePaymentModal() {
    setPaymentRow(null);
    setPaymentError('');
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    setPaymentError('');

    if (!paymentRow) {
      return;
    }

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(paymentRow.balance)) {
      setPaymentError(`Enter an amount between 0.01 and ${paymentRow.balance}.`);
      return;
    }

    try {
      await apiFetch(`${API_BASE}/payments`, {
        method: 'POST',
        body: {
          type: paymentRow.type.toLowerCase(),
          id: paymentRow.id,
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          payment_reference: paymentForm.payment_reference,
        },
      });

      closePaymentModal();
      await paymentsResource.reload();
      purchasesResource.reload();
      salesResource.reload();
      reportsResource.reload();
    } catch (error) {
      setPaymentError(error.message || 'Could not record the payment.');
    }
  }

  async function openPaymentHistory(row) {
    setPaymentHistory({ row, loading: true, error: '', data: [] });

    try {
      const result = await apiFetch(
        `${API_BASE}/payments/${row.type.toLowerCase()}/${row.id}`
      );
      setPaymentHistory({ row, loading: false, error: '', data: result.data || [] });
    } catch (error) {
      setPaymentHistory({
        row,
        loading: false,
        error: error.message || 'Could not load payment history.',
        data: [],
      });
    }
  }

  function closePaymentHistory() {
    setPaymentHistory({ row: null, loading: false, error: '', data: [] });
  }

  function detailFields(entity, row, items) {
    if (entity === 'Suppliers') {
      return [
        ['Supplier ID', row.supplier_id],
        ['Business Name', row.business_name],
        ['Contact Person', row.contact_person],
        ['Phone', row.phone],
        ['Province', row.province],
        ['Address', row.address],
      ];
    }

    if (entity === 'Fruits') {
      return [
        ['Fruit ID', row.fruit_id],
        ['Fruit Name', row.fruit_name],
        ['Description', row.description || '-'],
        ['Status', row.status],
      ];
    }

    if (entity === 'Stock Management') {
      return [
        ['Stock ID', row.stock_id],
        ['Fruit', row.fruit_name],
        ['Packaging Size', row.packaging_size],
        ['Available Boxes', row.available_quantity],
        ['Stock Status', Number(row.available_quantity) <= lowStockThreshold ? 'Low Stock' : 'Available'],
      ];
    }

    if (entity === 'Vendors') {
      return [
        ['Vendor ID', row.vendor_id],
        ['Vendor Name', row.vendor_name],
        ['Phone Number', row.phone_number],
        ['Location', row.location],
        ['Registration Date', row.registration_date],
      ];
    }

    if (entity === 'Purchases') {
      return [
        ['Reference', `PUR-${String(row.purchase_id).padStart(4, '0')}`],
        ['Supplier', row.supplier_name],
        ['Purchase Date', row.purchase_date],
        ['Payment Method', String(row.payment_method || '-').replace(/_/g, ' ')],
        ['Payment Status', row.payment_status || '-'],
        ['Item Count', row.item_count ?? (items ? items.length : '-')],
        ['Total Amount', money(row.total_amount)],
        ['Amount Paid', money(row.amount_paid)],
        ['Balance', money(row.balance)],
      ];
    }

    if (entity === 'Sales') {
      return [
        ['Reference', `SAL-${String(row.sale_id).padStart(4, '0')}`],
        ['Vendor', row.vendor_name],
        ['Sale Date', row.sale_date],
        ['Payment Method', String(row.payment_method || '-').replace(/_/g, ' ')],
        ['Payment Status', row.payment_status || '-'],
        ['Item Count', row.item_count ?? (items ? items.length : '-')],
        ['Total Amount', money(row.total_amount)],
        ['Amount Paid', money(row.amount_paid)],
        ['Balance', money(row.balance)],
      ];
    }

    if (entity === 'Payments') {
      return [
        ['Type', row.type],
        ['Reference', row.reference],
        ['Supplier / Vendor', row.name],
        ['Date', row.date],
        ['Payment Method', String(row.payment_method || '-').replace(/_/g, ' ')],
        ['Payment Status', row.payment_status || '-'],
        ['Total Amount', money(row.total_amount)],
        ['Amount Paid', money(row.amount_paid)],
        ['Balance', money(row.balance)],
      ];
    }

    return Object.entries(row || {}).map(([key, value]) => [key, value === null || value === undefined ? '-' : value]);
  }

  async function openDetails(entity, row) {
    const config = ENTITY_CONFIG[entity];
    const hasItems = Boolean(config && config.hasItems);

    setDetailsView({ entity, row, items: [], loading: hasItems, error: '' });

    if (hasItems) {
      try {
        const result = await apiFetch(`${config.endpoint}/${row[config.idKey]}`);
        const data = (result && result.data) || row;
        setDetailsView({
          entity,
          row: data,
          items: data.items || [],
          loading: false,
          error: '',
        });
      } catch (error) {
        setDetailsView(previous => ({
          ...previous,
          loading: false,
          error: error.message || 'Could not load details.',
        }));
      }
    }
  }

  function closeDetails() {
    setDetailsView({ entity: '', row: null, items: [], loading: false, error: '' });
  }

  function renderDashboard() {
    return (
      <>
        <div className="welcome-section">
          <div>
            <h2>Dashboard Overview</h2>
            <p>Welcome to Batloung Farm Distribution Management System.</p>
          </div>
          <div className="today-date">{longDate()}</div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div>
              <p>Total Suppliers</p>
              <h2>
                {suppliersLoading ? '...' : suppliersError ? '-' : suppliers.length}
              </h2>
              <span>Registered suppliers</span>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p>Fruit Types</p>
              <h2>{reportsResource.loading ? '...' : summary.total_fruits ?? '-'}</h2>
              <span>Fruit types in the database</span>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p>Total Boxes in Stock</p>
              <h2>{reportsResource.loading ? '...' : summary.boxes_in_stock ?? '-'}</h2>
              <span>Boxes currently available</span>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p>Low Stock Items</p>
              <h2>{reportsResource.loading ? '...' : summary.low_stock_items ?? '-'}</h2>
              <span>Items needing attention</span>
            </div>
          </div>
        </div>

        <div className="stats-grid secondary-stats">
          <div className="stat-card">
            <div>
              <p>Registered Vendors</p>
              <h2>{reportsResource.loading ? '...' : summary.total_vendors ?? '-'}</h2>
              <span>Vendors in the database</span>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p>Outstanding Payments</p>
              <h2>{reportsResource.loading ? '...' : money(outstanding)}</h2>
              <span>From purchases and sales</span>
            </div>
          </div>
        </div>

        <div className="content-card">
          <div className="section-heading">
            <div>
              <h3>Recent Transactions</h3>
              <p>Latest purchases and sales activities</p>
            </div>
            <button
              className="outline-button"
              onClick={() => setActivePage('Reports')}
            >
              View Reports
            </button>
          </div>

          {reportsResource.loading && (
            <p className="table-message">Loading transactions...</p>
          )}
          {reportsResource.error && (
            <p className="error-message table-message">{reportsResource.error}</p>
          )}
          {!reportsResource.loading && !reportsResource.error && (
            renderTransactions(transactions)
          )}
        </div>

        <div className="content-card">
          <div className="section-heading">
            <div>
              <h3>Stock Alerts</h3>
              <p>Fruits that require restocking</p>
            </div>
            <button
              className="outline-button"
              onClick={() => setActivePage('Stock Management')}
            >
              View Stock
            </button>
          </div>

          {renderStockAlerts(stockAlerts)}
        </div>
      </>
    );
  }

  function renderTransactions(rows) {
    function openTransactionDetails(transaction) {
      const match = String(transaction.reference || '').match(/(\d+)/);
      const id = match ? Number(match[1]) : null;

      if (!id) {
        return;
      }

      if (transaction.type === 'Purchase') {
        openDetails('Purchases', {
          purchase_id: id,
          supplier_name: transaction.name,
          purchase_date: transaction.date,
          total_amount: transaction.amount,
          payment_status: transaction.status,
        });
      } else if (transaction.type === 'Sale') {
        openDetails('Sales', {
          sale_id: id,
          vendor_name: transaction.name,
          sale_date: transaction.date,
          total_amount: transaction.amount,
          payment_status: transaction.status,
        });
      }
    }

    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Type</th>
              <th>Supplier / Vendor</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map(transaction => (
              <tr
                key={transaction.reference}
                className="clickable-row"
                onClick={() => openTransactionDetails(transaction)}
              >
                <td>{transaction.reference}</td>
                <td>{transaction.type}</td>
                <td>{transaction.name}</td>
                <td>{transaction.date}</td>
                <td>{money(transaction.amount)}</td>
                <td><StatusBadge status={transaction.status} /></td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6">No transactions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderStockAlerts(rows) {
    if (rows.length === 0) {
      return <p className="table-message">No low-stock items at the moment.</p>;
    }

    return (
      <div className="alert-list">
        {rows.map(alert => (
          <div
            className="alert-item clickable-alert"
            key={alert.stock_id}
            onClick={() => openDetails('Stock Management', alert)}
          >
            <div>
              <strong>{alert.fruit_name}</strong>
              <p>
                {alert.packaging_size} packaging - {alert.available_quantity} boxes remaining
              </p>
            </div>
            <span className="status low-stock">Low Stock</span>
          </div>
        ))}
      </div>
    );
  }

  function renderSuppliers() {
    const filteredSuppliers = suppliers.filter(supplier => {
      const matchesSearch =
        `${supplier.business_name} ${supplier.contact_person} ${supplier.phone} ${supplier.province} ${supplier.address}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesProvince =
        provinceFilter === 'All Provinces' ||
        supplier.province === provinceFilter;

      return matchesSearch && matchesProvince;
    });

    return (
      <div className="content-card">
        <div className="section-heading">
          <div>
            <h2>Supplier Management</h2>
            <p>Manage fruit suppliers and their information.</p>
          </div>

          {canManage && (
            <button className="primary-button" onClick={openAddSupplierModal}>
              + Add Supplier
            </button>
          )}
        </div>

        <div className="filter-row">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={provinceFilter}
            onChange={event => setProvinceFilter(event.target.value)}
          >
            <option>All Provinces</option>
            {provinces.map(province => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </div>

        {suppliersLoading && (
          <p className="table-message">Loading suppliers from the database...</p>
        )}

        {suppliersError && (
          <p className="error-message table-message">{suppliersError}</p>
        )}

        {!suppliersLoading && !suppliersError && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Business Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Province</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map(supplier => (
                    <tr key={supplier.supplier_id}>
                      <td>{supplier.supplier_id}</td>
                      <td>{supplier.business_name}</td>
                      <td>{supplier.contact_person}</td>
                      <td>{supplier.phone}</td>
                      <td>{supplier.province}</td>
                      <td>{supplier.address}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="secondary-button"
                            onClick={() => openDetails('Suppliers', supplier)}
                          >
                            View
                          </button>
                          {canManage && (
                            <>
                              <button
                                className="edit-button"
                                onClick={() => openEditSupplierModal(supplier)}
                              >
                                Edit
                              </button>
                              <button
                                className="delete-button"
                                onClick={() => handleDeleteSupplier(supplier)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">No suppliers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!suppliersLoading && !suppliersError && (
          <p className="record-count">
            Showing {filteredSuppliers.length} of {suppliers.length} suppliers
          </p>
        )}
      </div>
    );
  }

  function resourceColumns(entity) {
    const columns = {
      Fruits: ['ID', 'Fruit Name', 'Description', 'Status'],
      'Stock Management': ['Stock ID', 'Fruit', 'Packaging Size', 'Available Boxes', 'Status'],
      Vendors: ['ID', 'Vendor Name', 'Phone', 'Location', 'Registered'],
      Purchases: ['ID', 'Supplier', 'Date', 'Lines', 'Total', 'Paid', 'Balance', 'Status'],
      Sales: ['ID', 'Vendor', 'Date', 'Lines', 'Total', 'Paid', 'Balance', 'Status'],
    };

    return [...(columns[entity] || []), 'Actions'];
  }

  function resourceRow(entity, row) {
    const actions = (
      <td key="actions">
        <div className="action-buttons">
          <button className="secondary-button" onClick={() => openDetails(entity, row)}>
            View
          </button>
          {canManage && (
            <>
              <button className="edit-button" onClick={() => openEditResource(entity, row)}>
                Edit
              </button>
              <button className="delete-button" onClick={() => handleResourceDelete(entity, row)}>
                Delete
              </button>
            </>
          )}
        </div>
      </td>
    );

    if (entity === 'Fruits') {
      return (
        <tr key={row.fruit_id}>
          <td>{row.fruit_id}</td>
          <td>{row.fruit_name}</td>
          <td>{row.description || '-'}</td>
          <td><StatusBadge status={row.status} /></td>
          {actions}
        </tr>
      );
    }

    if (entity === 'Stock Management') {
      return (
        <tr key={row.stock_id}>
          <td>{row.stock_id}</td>
          <td>{row.fruit_name}</td>
          <td>{row.packaging_size}</td>
          <td>{row.available_quantity}</td>
          <td>
            <span className={`status ${row.available_quantity <= lowStockThreshold ? 'low-stock' : 'paid'}`}>
              {row.available_quantity <= lowStockThreshold ? 'Low Stock' : 'Available'}
            </span>
          </td>
          {actions}
        </tr>
      );
    }

    if (entity === 'Vendors') {
      return (
        <tr key={row.vendor_id}>
          <td>{row.vendor_id}</td>
          <td>{row.vendor_name}</td>
          <td>{row.phone_number}</td>
          <td>{row.location}</td>
          <td>{row.registration_date}</td>
          {actions}
        </tr>
      );
    }

    if (entity === 'Purchases') {
      return (
        <tr key={row.purchase_id}>
          <td>PUR-{String(row.purchase_id).padStart(4, '0')}</td>
          <td>{row.supplier_name}</td>
          <td>{row.purchase_date}</td>
          <td>{row.item_count}</td>
          <td>{money(row.total_amount)}</td>
          <td>{money(row.amount_paid)}</td>
          <td>{money(row.balance)}</td>
          <td><StatusBadge status={row.payment_status} /></td>
          {actions}
        </tr>
      );
    }

    return (
      <tr key={row.sale_id}>
        <td>SAL-{String(row.sale_id).padStart(4, '0')}</td>
        <td>{row.vendor_name}</td>
        <td>{row.sale_date}</td>
        <td>{row.item_count}</td>
        <td>{money(row.total_amount)}</td>
        <td>{money(row.amount_paid)}</td>
        <td>{money(row.balance)}</td>
        <td><StatusBadge status={row.payment_status} /></td>
        {actions}
      </tr>
    );
  }

  function renderResourcePage(entity) {
    const resource = resources[entity];
    const config = ENTITY_CONFIG[entity];
    const headers = resourceColumns(entity);
    const rows = resource.data.filter(row =>
      JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="content-card">
        <div className="section-heading">
          <div>
            <h2>{entity === 'Stock Management' ? 'Stock Management' : `${entity} Management`}</h2>
            <p>{config.description}</p>
          </div>
          {canManage && (
            <button className="primary-button" onClick={() => openAddResource(entity)}>
              + Add {config.title}
            </button>
          )}
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder={`Search ${entity.toLowerCase()}...`}
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        {resource.loading && (
          <p className="table-message">Loading {entity.toLowerCase()} from the database...</p>
        )}

        {resource.error && (
          <p className="error-message table-message">{resource.error}</p>
        )}

        {!resource.loading && !resource.error && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {headers.map(header => <th key={header}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? rows.map(row => resourceRow(entity, row)) : (
                  <tr>
                    <td colSpan={headers.length}>No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!resource.loading && !resource.error && (
          <p className="record-count">
            Showing {rows.length} of {resource.data.length} {entity.toLowerCase()} records
          </p>
        )}
      </div>
    );
  }

  function renderPayments() {
    const rows = paymentsResource.data.filter(row =>
      `${row.reference} ${row.name} ${row.type} ${row.payment_status}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );

    return (
      <div className="content-card">
        <div className="section-heading">
          <div>
            <h2>Payment Management</h2>
            <p>Record payments for purchases and sales.</p>
          </div>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        {paymentsResource.loading && (
          <p className="table-message">Loading payments from the database...</p>
        )}

        {paymentsResource.error && (
          <p className="error-message table-message">{paymentsResource.error}</p>
        )}

        {!paymentsResource.loading && !paymentsResource.error && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Supplier / Vendor</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? rows.map(row => (
                  <tr key={`${row.type}-${row.id}`}>
                    <td>{row.type}</td>
                    <td>{row.reference}</td>
                    <td>{row.name}</td>
                    <td>{row.date}</td>
                    <td>{money(row.total_amount)}</td>
                    <td>{money(row.amount_paid)}</td>
                    <td>{money(row.balance)}</td>
                    <td><StatusBadge status={row.payment_status} /></td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="secondary-button"
                          onClick={() => openDetails('Payments', row)}
                        >
                          View
                        </button>
                        {canManage && (
                          <button
                            className="edit-button"
                            onClick={() => openPaymentModal(row)}
                            disabled={Number(row.balance) <= 0}
                          >
                            Record Payment
                          </button>
                        )}
                        <button
                          className="secondary-button"
                          onClick={() => openPaymentHistory(row)}
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="9">No payments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  function renderReports() {
    return (
      <>
        <div className="stats-grid">
          <div className="stat-card">
            <div>
              <p>Total Purchases</p>
              <h2>{reportsResource.loading ? '...' : summary.total_purchases ?? '-'}</h2>
              <span>{reportsResource.loading ? '' : money(summary.purchase_total)}</span>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p>Total Sales</p>
              <h2>{reportsResource.loading ? '...' : summary.total_sales ?? '-'}</h2>
              <span>{reportsResource.loading ? '' : money(summary.sale_total)}</span>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p>Purchase Balance</p>
              <h2>{reportsResource.loading ? '...' : money(summary.purchase_balance)}</h2>
              <span>Still to be paid to suppliers</span>
            </div>
          </div>

          <div className="stat-card">
            <div>
              <p>Sales Balance</p>
              <h2>{reportsResource.loading ? '...' : money(summary.sale_balance)}</h2>
              <span>Still to be paid by vendors</span>
            </div>
          </div>
        </div>

        <div className="content-card">
          <div className="section-heading">
            <div>
              <h3>Recent Transactions</h3>
              <p>Latest purchases and sales activities</p>
            </div>
          </div>

          {reportsResource.loading && (
            <p className="table-message">Loading report...</p>
          )}
          {reportsResource.error && (
            <p className="error-message table-message">{reportsResource.error}</p>
          )}
          {!reportsResource.loading && !reportsResource.error && (
            renderTransactions(transactions)
          )}
        </div>

        <div className="content-card">
          <div className="section-heading">
            <div>
              <h3>Stock Alerts</h3>
              <p>Fruits that require restocking</p>
            </div>
          </div>

          {renderStockAlerts(stockAlerts)}
        </div>
      </>
    );
  }

  function renderPage() {
    if (activePage === 'Dashboard') {
      return renderDashboard();
    }

    if (activePage === 'Suppliers') {
      return renderSuppliers();
    }

    if (activePage === 'Payments') {
      return renderPayments();
    }

    if (activePage === 'Reports') {
      return renderReports();
    }

    if (ENTITY_CONFIG[activePage]) {
      return renderResourcePage(activePage);
    }

    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-brand">
            <div>
              <h1>BATLOUNG FARM</h1>
              <p>DISTRIBUTION SYSTEM</p>
            </div>
          </div>

          <h2>Sign in</h2>
          <p className="login-help">Use your staff account to continue.</p>

          <label>
            Username
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={loginForm.username}
              onChange={event => setLoginForm(previous => ({
                ...previous,
                username: event.target.value,
              }))}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={loginForm.password}
              onChange={event => setLoginForm(previous => ({
                ...previous,
                password: event.target.value,
              }))}
              required
            />
          </label>

          {loginError && <p className="form-error">{loginError}</p>}

          <button type="submit" className="primary-button" disabled={loggingIn}>
            {loggingIn ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  const resourceConfig = modalEntity ? ENTITY_CONFIG[modalEntity] : null;

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-top">
          <div className="brand">
            <h1 className="brand-title">BATLOUNG FARM</h1>
            <p className="brand-subtitle">DISTRIBUTION SYSTEM</p>
          </div>

          <div className="header-user">
            <span className="admin-label">
              {displayName} - {displayRole}
            </span>
            <button type="button" className="secondary-button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main menu">
          {menuItems.map(item => (
            <button
              key={item.name}
              type="button"
              className={`nav-item ${activePage === item.name ? 'active' : ''}`}
              onClick={() => {
                setActivePage(item.name);
                setSearch('');
                setProvinceFilter('All Provinces');
              }}
            >
              <span className="nav-text">{item.name}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="main-content">
        <div className="page-content">
          {renderPage()}
        </div>
      </main>

      <footer className="app-footer">
        <p>Batloung Farm Distribution System</p>
      </footer>

      {showSupplierModal && (
        <div className="modal-overlay" onClick={closeSupplierModal}>
          <div
            className="modal-card"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                <p>Enter the supplier information below.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeSupplierModal}
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit}>
              <div className="form-grid">
                <label>
                  Business Name
                  <input
                    type="text"
                    name="business_name"
                    value={supplierForm.business_name}
                    onChange={handleSupplierInput}
                    required
                  />
                </label>

                <label>
                  Contact Person
                  <input
                    type="text"
                    name="contact_person"
                    value={supplierForm.contact_person}
                    onChange={handleSupplierInput}
                    required
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    type="tel"
                    name="phone"
                    value={supplierForm.phone}
                    onChange={handleSupplierInput}
                    required
                  />
                </label>

                <label>
                  Province
                  <select
                    name="province"
                    value={supplierForm.province}
                    onChange={handleSupplierInput}
                    required
                  >
                    <option value="">Select province</option>
                    {provinces.map(province => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="full-width">
                  Business Address
                  <textarea
                    name="address"
                    value={supplierForm.address}
                    onChange={handleSupplierInput}
                    rows="3"
                    required
                  />
                </label>
              </div>

              {formError && (
                <p className="form-error">{formError}</p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeSupplierModal}
                  disabled={savingSupplier}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingSupplier}
                >
                  {savingSupplier
                    ? 'Saving...'
                    : editingSupplier
                      ? 'Save Changes'
                      : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resourceConfig && (
        <div className="modal-overlay" onClick={closeResourceModal}>
          <div
            className="modal-card"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>
                  {editingRow
                    ? `Edit ${resourceConfig.title}`
                    : `Add New ${resourceConfig.title}`}
                </h2>
                <p>Enter the {resourceConfig.title.toLowerCase()} information below.</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeResourceModal}
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleResourceSubmit}>
              <div className="form-grid">
                {resourceConfig.fields
                  .filter(field => !editingRow || !field.createOnly)
                  .map(field => (
                  <label
                    key={field.name}
                    className={field.full ? 'full-width' : undefined}
                  >
                    {field.label}

                    {field.type === 'select' && (
                      <select
                        name={field.name}
                        value={formValues[field.name] ?? ''}
                        onChange={handleFormInput}
                        required={field.required}
                      >
                        <option value="">Select {field.label.toLowerCase()}</option>
                        {fieldOptions(field).map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === 'textarea' && (
                      <textarea
                        name={field.name}
                        value={formValues[field.name] ?? ''}
                        onChange={handleFormInput}
                        rows="3"
                        required={field.required}
                      />
                    )}

                    {field.type !== 'select' && field.type !== 'textarea' && (
                      <input
                        type={field.type}
                        name={field.name}
                        value={formValues[field.name] ?? ''}
                        onChange={handleFormInput}
                        required={field.required}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                      />
                    )}
                  </label>
                  ))}

                {resourceConfig.hasItems && (
                  <div className="line-items full-width">
                    <div className="line-items-heading">Fruit Lines</div>

                    {formItems.map((item, index) => (
                      <div className="line-item-row" key={index}>
                        <select
                          name="fruit_id"
                          value={item.fruit_id}
                          onChange={event => handleItemInput(index, event)}
                          required
                        >
                          <option value="">Select fruit</option>
                          {fruitsResource.data.map(fruit => (
                            <option key={fruit.fruit_id} value={fruit.fruit_id}>
                              {fruit.fruit_name}
                            </option>
                          ))}
                        </select>

                        <select
                          name="packaging_size"
                          value={item.packaging_size}
                          onChange={event => handleItemInput(index, event)}
                          required
                        >
                          {packagingSizes.map(size => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>

                        <input
                          type="number"
                          name="quantity"
                          value={item.quantity}
                          onChange={event => handleItemInput(index, event)}
                          min="1"
                          placeholder="Qty"
                          required
                        />

                        <input
                          type="number"
                          name={resourceConfig.itemCostField}
                          value={item[resourceConfig.itemCostField]}
                          onChange={event => handleItemInput(index, event)}
                          min="0"
                          step="0.01"
                          placeholder={resourceConfig.itemCostLabel}
                          required
                        />

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => removeFormItem(index)}
                          aria-label="Remove line"
                        >

                          Remove
                        </button>
                      </div>
                    ))}

                    <div className="total-preview">
                      <span>Calculated total</span>
                      <strong>
                        {money(calculateFormTotal(formItems, resourceConfig.itemCostField) / 100)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="outline-button"
                      onClick={addFormItem}
                    >
                      + Add Fruit Line
                    </button>
                  </div>
                )}
              </div>

              {formError && (
                <p className="form-error">{formError}</p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeResourceModal}
                  disabled={savingResource}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingResource}
                >
                  {savingResource
                    ? 'Saving...'
                    : editingRow
                      ? 'Save Changes'
                      : `Add ${resourceConfig.title}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentRow && (
        <div className="modal-overlay" onClick={closePaymentModal}>
          <div
            className="modal-card"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>Record Payment</h2>
                <p>
                  {paymentRow.reference} Ã¢â‚¬â€œ {paymentRow.name}. Balance: {money(paymentRow.balance)}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closePaymentModal}
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="form-grid">
                <label>
                  Payment Amount (M)
                  <input
                    type="number"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={event => setPaymentForm(previous => ({
                      ...previous,
                      amount: event.target.value,
                    }))}
                    min="0.01"
                    max={paymentRow.balance}
                    step="0.01"
                    required
                  />
                </label>

                <label>
                  Payment Reference
                  <input
                    type="text"
                    value={paymentForm.payment_reference}
                    readOnly
                  />
                </label>

                <label>
                  Payment Method
                  <select
                    name="payment_method"
                    value={paymentForm.payment_method}
                    onChange={event => setPaymentForm(previous => ({
                      ...previous,
                      payment_method: event.target.value,
                    }))}
                    required
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </label>
              </div>

              {paymentError && (
                <p className="form-error">{paymentError}</p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closePaymentModal}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-button">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentHistory.row && (
        <div className="modal-overlay" onClick={closePaymentHistory}>
          <div
            className="modal-card"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>Payment History</h2>
                <p>{paymentHistory.row.reference} - {paymentHistory.row.name}</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closePaymentHistory}
                aria-label="Close"
              >
                Close
              </button>
            </div>

            {paymentHistory.loading && (
              <p className="table-message">Loading payment history...</p>
            )}

            {paymentHistory.error && (
              <p className="form-error">{paymentHistory.error}</p>
            )}

            {!paymentHistory.loading && !paymentHistory.error && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Date</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.data.length > 0 ? paymentHistory.data.map(payment => (
                      <tr key={payment.payment_id}>
                        <td>{payment.payment_reference}</td>
                        <td>{money(payment.amount)}</td>
                        <td>{String(payment.payment_method).replace(/_/g, ' ')}</td>
                        <td>{payment.paid_at}</td>
                        <td>{payment.recorded_by || '-'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5">No payments found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closePaymentHistory}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsView.entity && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div
            className="modal-card details-modal"
            onClick={event => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2>
                  {detailsView.entity === 'Payments'
                    ? 'Payment Details'
                    : detailsView.entity === 'Suppliers'
                      ? 'Supplier Details'
                      : `${(ENTITY_CONFIG[detailsView.entity] && ENTITY_CONFIG[detailsView.entity].title) || detailsView.entity} Details`}
                </h2>
                <p>Recorded information</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeDetails}
                aria-label="Close"
              >
                Close
              </button>
            </div>

            {detailsView.loading && (
              <p className="table-message">Loading details...</p>
            )}

            {detailsView.error && (
              <p className="form-error">{detailsView.error}</p>
            )}

            {!detailsView.loading && !detailsView.error && detailsView.row && (
              <>
                <div className="details-section">
                  <h3 className="details-section-title">Information</h3>
                  <div className="details-grid">
                    {detailFields(detailsView.entity, detailsView.row, detailsView.items).map(([label, value]) => {
                      const isStatus = ['Payment Status', 'Status', 'Stock Status'].includes(label);
                      const statusValue = String(value);
                      return (
                        <div className="detail-item" key={label}>
                          <span className="detail-label">{label}</span>
                          <span className="detail-value">
                            {isStatus ? (
                              ['PAID', 'PARTIALLY_PAID', 'UNPAID'].includes(statusValue)
                                ? <StatusBadge status={statusValue} />
                                : <span className={`status ${statusValue.toLowerCase().includes('low') ? 'low-stock' : statusValue.toLowerCase().includes('unpaid') ? 'unpaid' : 'paid'}`}>{statusValue}</span>
                            ) : (
                              value === null || value === undefined || value === '' ? '-' : String(value)
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {(detailsView.entity === 'Purchases' || detailsView.entity === 'Sales') && (
                  <div className="details-section">
                    <h3 className="details-section-title">Fruit Lines</h3>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Fruit</th>
                            <th>Packaging</th>
                            <th>Quantity</th>
                            <th>{detailsView.entity === 'Purchases' ? 'Unit Cost' : 'Unit Price'}</th>
                            <th>Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailsView.items.length > 0 ? detailsView.items.map((item, index) => (
                            <tr key={item.purchase_detail_id || item.sales_detail_id || index}>
                              <td>{item.fruit_name || item.fruit_id}</td>
                              <td>{item.packaging_size}</td>
                              <td>{item.quantity}</td>
                              <td>{money(detailsView.entity === 'Purchases' ? item.unit_cost : item.unit_price)}</td>
                              <td>{money(item.line_total)}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="5">No fruit lines found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
