import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.setItem('batloung_token', 'test-token');
  localStorage.setItem(
    'batloung_user',
    JSON.stringify({ user_id: 1, username: 'admin', role: 'ADMIN' })
  );

  global.fetch = jest.fn(url => {
    const data = String(url).includes('/reports/summary')
      ? {
          summary: {
            total_suppliers: 0,
            total_fruits: 0,
            total_vendors: 0,
            total_purchases: 0,
            total_sales: 0,
            low_stock_items: 0,
            boxes_in_stock: 0,
            purchase_total: 0,
            sale_total: 0,
            purchase_balance: 0,
            sale_balance: 0,
          },
          transactions: [],
          stock_alerts: [],
          low_stock_threshold: 10,
        }
      : [];

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data }),
    });
  });
});

afterEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

async function renderApp() {
  await act(async () => {
    render(<App />);
  });
}

test('renders the dashboard overview', async () => {
  await renderApp();
  expect(screen.getByText(/Dashboard Overview/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Sign out/i })).toBeInTheDocument();
});

test('navigates to the supplier and fruit pages', async () => {
  await renderApp();

  fireEvent.click(screen.getByRole('button', { name: /Suppliers/i }));
  expect(screen.getByText('Supplier Management')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Fruits/i }));
  await waitFor(() => {
    expect(screen.getByText('Fruits Management')).toBeInTheDocument();
  });
});

test('opens the add fruit form from the fruits page', async () => {
  await renderApp();

  fireEvent.click(screen.getByRole('button', { name: /Fruits/i }));
  const addButton = await screen.findByRole('button', { name: /Add Fruit/i });
  fireEvent.click(addButton);

  expect(screen.getByText('Add New Fruit')).toBeInTheDocument();
  expect(document.querySelector('input[name="fruit_name"]')).toBeInTheDocument();
});
