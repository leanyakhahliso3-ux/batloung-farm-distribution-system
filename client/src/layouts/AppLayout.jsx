import { useEffect, useReducer, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ClickSpinner from '../components/ClickSpinner';

const links = [
  { label: 'Dashboard', to: '/' },
  { label: 'Suppliers', to: '/suppliers' },
  { label: 'Fruits', to: '/fruits' },
  { label: 'Stock', to: '/stock' },
  { label: 'Purchases', to: '/purchases' },
  { label: 'Sales', to: '/sales' },
  { label: 'Reports', to: '/reports' },
  { label: 'Settings', to: '/settings' },
  { label: 'Vendors', to: '/vendors' },
];

const loadingThemes = [
  { tint: '#2fae9d', soft: '#e4f6f2', glow: 'rgba(47, 174, 157, 0.42)' },
  { tint: '#f0704f', soft: '#fde9e2', glow: 'rgba(240, 112, 79, 0.42)' },
  { tint: '#f5b84b', soft: '#fff3d8', glow: 'rgba(245, 184, 75, 0.42)' },
  { tint: '#7c6cf0', soft: '#ece9ff', glow: 'rgba(124, 108, 240, 0.42)' },
];

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [todayLabel, setTodayLabel] = useState('');
  const [loadedPath, setLoadedPath] = useState(null);
  const [themeIndex, nextTheme] = useReducer((index) => (index + 1) % loadingThemes.length, 0);
  const firstPathRef = useRef(true);

  const routeLabel = links.find((item) => item.to === pathname)?.label || 'Page';
  const routeLoading = loadedPath !== pathname;
  const loadingTheme = loadingThemes[themeIndex];

  useEffect(() => {
    if (!firstPathRef.current) nextTheme();
    firstPathRef.current = false;
    const timer = setTimeout(() => setLoadedPath(pathname), 4000);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const updateDate = () => setTodayLabel(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    updateDate();
    const timer = setInterval(updateDate, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ap-shell">
      <ClickSpinner />
      <aside className={`ap-sidebar ${menuOpen ? 'open' : ''}`}>
        <div>
          <div className="ap-brand">
            <div className="ap-brand-title">Batloung Farm</div>
            <div className="ap-brand-sub">Distribution System</div>
          </div>
          <nav className="ap-nav">
            {links.map((item) => {
              const isActive = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`ap-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="ap-sidebar-note">From our orchards<br />to your tables.</div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          data-no-overlay="true"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="ap-main-wrap">
        <header className="ap-topbar">
          <div className="ap-topbar-leading">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
            >
              Menu
            </button>
            <div>
              <div className="ap-topbar-title">Batloung Farm Distribution</div>
              <div className="ap-topbar-sub">Harvest &amp; Packaging Operations</div>
            </div>
          </div>
          <div className="ap-topbar-right">
            <span className="ap-date-pill">{todayLabel}</span>
            <span className="ap-date-pill">Currency: M</span>
            <span className="ap-desk-badge">
              <span>Farm Desk</span>
            </span>
          </div>
        </header>

        <main className="ap-main">
          {routeLoading ? (
            <div
              className="route-loading-overlay"
              role="status"
              aria-live="polite"
              style={{
                '--loading-tint': loadingTheme.tint,
                '--loading-soft': loadingTheme.soft,
                '--loading-glow': loadingTheme.glow,
              }}
            >
              <div className="route-loading-card">
                <strong>Loading {routeLabel}</strong>
                <div className="loading-dots">
                  <span className="loading-dot loading-dot-1">.</span>
                  <span className="loading-dot loading-dot-2">.</span>
                  <span className="loading-dot loading-dot-3">.</span>
                </div>
              </div>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
}
