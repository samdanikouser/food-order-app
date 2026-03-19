import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import OrderConfirmation from './pages/OrderConfirmation';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import MenuManagementPage from './pages/MenuManagementPage';
import logo2 from './images/logo2.png';
import logo1 from './images/logo1.png';
import './App.css';

// ── Protected Route wrapper ───────────────────────────────
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

// ── Navbar (needs hooks so it's a component) ─────────────
function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = localStorage.getItem('adminToken');
  const onAdminPage = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <nav className="navbar">
      <Link to={onAdminPage ? '/admin' : '/'} className="nav-brand">
        <img src={onAdminPage ? logo1 : logo2} alt="Studio Roast" className="nav-logo-main" />
      </Link>
      <div className="nav-links">
        {isAdmin && onAdminPage ? (
          <>
            <Link to="/admin">Dashboard</Link>
            <Link to="/admin/menu">Menu</Link>
            <Link to="/admin/settings">Settings</Link>
            <button className="nav-logout-btn" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/">Order</Link>
            <Link to="/admin/login">Admin</Link>
          </>
        )}
      </div>
    </nav>
  );
}

// ── App ───────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            {/* Client routes */}
            <Route path="/" element={<MenuPage />} />
            <Route path="/confirmation/:orderId" element={<OrderConfirmation />} />

            {/* Admin login */}
            <Route path="/admin/login" element={<LoginPage />} />

            {/* Protected admin routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/admin/menu" element={<ProtectedRoute><MenuManagementPage /></ProtectedRoute>} />
          </Routes>
        </main>
        <footer className="footer">
          <div className="footer-logo-wrap">
            <img src={logo1} alt="SVN" className="footer-logo" />
          </div>
          <p>© 2026 <span>Studio Roast</span></p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
