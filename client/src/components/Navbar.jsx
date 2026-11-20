import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/fruits', label: 'Fruits & Stock' },
  { to: '/suppliers', label: 'Suppliers' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/purchases', label: 'Purchases' },
  { to: '/sales', label: 'Sales' },
  { to: '/stock', label: 'Stock' },
  { to: '/reports', label: 'Reports' },
];

export default function Navbar() {
  return (
    <nav className="ap-nav">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) => `ap-nav-link ${isActive ? 'active' : ''}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
