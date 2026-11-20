import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-brand">Batloung Farm Distribution (Maseru)</div>
      <nav className="nav-links">
        <NavLink to="/" end>Dashboard & Reports</NavLink>
        <NavLink to="/suppliers">Suppliers</NavLink>
        <NavLink to="/fruits-stock">Fruits & Stock</NavLink>
        <NavLink to="/vendors">Vendors</NavLink>
        <NavLink to="/purchases">Purchases</NavLink>
        <NavLink to="/sales">Sales & Payments</NavLink>
      </nav>
    </header>
  );
}
