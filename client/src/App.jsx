import { Component } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import FruitsStockPage from './pages/FruitsStockPage';
import SuppliersPage from './pages/SuppliersPage';
import VendorsPage from './pages/VendorsPage';
import PurchasesPage from './pages/PurchasesPage';
import SalesPage from './pages/SalesPage';
import StockPage from './pages/StockPage';
import ReportsPage from './pages/ReportsPage';

function SecondarySection({ title, description }) {
  return (
    <div className="records-page">
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </div>
      <div className="card settings-card">
        <p>Use the navigation to manage suppliers, fruits, stock, purchases, sales and reports.</p>
      </div>
    </div>
  );
}

function NotFoundSection() {
  return (
    <div className="records-page">
      <div className="page-header">
        <div>
          <h1>Page not found</h1>
          <p className="muted">This page does not exist in the distribution system.</p>
        </div>
      </div>
      <div className="card settings-card">
        <Link to="/" className="btn-primary">Back to dashboard</Link>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div className="error-card"><h2>Render Error</h2><pre>{String(this.state.error?.message || this.state.error)}</pre></div>;
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/fruits" element={<FruitsStockPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SecondarySection title="System Settings" description="Configure Batloung Farm distribution preferences." />} />
            <Route path="*" element={<NotFoundSection />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
