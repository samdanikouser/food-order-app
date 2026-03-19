import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const kwd = (amount) => `KWD ${Number(amount).toFixed(3)}`;

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#8B6800', bg: '#FFF3CC' },
  confirmed: { label: 'Confirmed', color: '#2E7D4A', bg: '#E8F5EC' },
  delivered: { label: 'Delivered', color: '#5A3520', bg: '#F0EAE4' },
};

export default function MenuPage() {
  const [menuItems, setMenuItems]   = useState([]);
  const [cart, setCart]             = useState({});
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  // Order history
  const [history, setHistory]               = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedOrder, setExpandedOrder]   = useState(null);
  const [lookupEmail, setLookupEmail]       = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/menu')
      .then(res => setMenuItems(res.data.data))
      .catch(() => setError('Could not load menu. Make sure the backend is running.'))
      .finally(() => setLoading(false));

    const saved = localStorage.getItem('clientEmail');
    if (saved) {
      setClientEmail(saved);
      setLookupEmail(saved);
      fetchHistory(saved);
    }
  }, []); // eslint-disable-line

  const fetchHistory = useCallback(async (email) => {
    if (!email) return;
    setHistoryLoading(true);
    try {
      const res = await axios.get(`/api/orders/history?email=${encodeURIComponent(email.trim())}`);
      setHistory(res.data.data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const updateQty = (id, delta) => {
    setCart(prev => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  };

  const cartItems = menuItems.filter(i => cart[i.id]);
  const total     = cartItems.reduce((sum, i) => sum + i.price * cart[i.id], 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName || !clientEmail) { setError('Please enter your name and email.'); return; }
    if (cartCount === 0) { setError('Please add at least one item to your order.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const items = Object.entries(cart).map(([id, qty]) => ({
        menu_item_id: parseInt(id), quantity: qty,
      }));
      const res = await axios.post('/api/orders', {
        client_name: clientName, client_email: clientEmail, items, notes
      });
      localStorage.setItem('clientEmail', clientEmail);
      navigate(`/confirmation/${res.data.data.order_id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['All', ...new Set(menuItems.map(i => i.category))];
  const visibleItems = selectedCat === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === selectedCat);

  const visibleCategories = selectedCat === 'All'
    ? [...new Set(menuItems.map(i => i.category))]
    : [selectedCat];

  if (loading) return <div className="loading">☕ Loading menu...</div>;

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Today's Menu</h1>
        <p className="page-subtitle">Select your items and place your daily order</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* Category Pills */}
      <div className="cat-pills">
        {categories.map(cat => (
          <button
            key={cat}
            className={`cat-pill${selectedCat === cat ? ' active' : ''}`}
            onClick={() => setSelectedCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu + Order Panel */}
      <div className="order-section">
        {/* Menu Items */}
        <div>
          {visibleCategories.map(cat => (
            <div key={cat}>
              <div className="category-heading">{cat}</div>
              <div className="menu-grid">
                {visibleItems.filter(i => i.category === cat).map(item => (
                  <div key={item.id} className={`menu-card${cart[item.id] ? ' selected' : ''}`}>
                    <div className="menu-card-name">{item.name}</div>
                    {item.description && <div className="menu-card-desc">{item.description}</div>}
                    <div className="menu-card-footer">
                      <span className="menu-card-price">{kwd(item.price)}</span>
                      {cart[item.id] > 0 && (
                        <span style={{
                          fontSize: '0.72rem',
                          background: 'rgba(139,69,19,0.1)',
                          color: '#8B4513',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontWeight: 600,
                          border: '1px solid rgba(139,69,19,0.2)'
                        }}>
                          ×{cart[item.id]}
                        </span>
                      )}
                    </div>
                    <div className="qty-controls">
                      <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                      <span className="qty-value">{cart[item.id] || 0}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary + Form */}
        <div className="order-summary">
          <div className="card" style={{ marginBottom: 14 }}>
            <h3>Your Order {cartCount > 0 && (
              <span style={{
                fontSize: '0.78rem',
                background: 'rgba(139,69,19,0.1)',
                color: '#8B4513',
                padding: '2px 10px',
                borderRadius: '20px',
                fontWeight: 600,
                marginLeft: 6,
                border: '1px solid rgba(139,69,19,0.2)'
              }}>{cartCount}</span>
            )}</h3>
            {cartItems.length === 0
              ? <div className="empty-cart">No items selected yet ☕</div>
              : <>
                  {cartItems.map(i => (
                    <div key={i.id} className="summary-item">
                      <span style={{ color: '#5A3520' }}>{i.name} <span style={{ color: '#B09080' }}>×{cart[i.id]}</span></span>
                      <span style={{ color: '#8B4513', fontWeight: 600 }}>{kwd(i.price * cart[i.id])}</span>
                    </div>
                  ))}
                  <div className="summary-total">
                    <span>Total</span><span>{kwd(total)}</span>
                  </div>
                </>
            }
          </div>

          <div className="card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Your Name</label>
                <input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Ahmad Al-Rashid"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => { setClientEmail(e.target.value); setLookupEmail(e.target.value); }}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Special Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Allergies, preferences..."
                  rows={2}
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting || cartCount === 0}
              >
                {submitting ? 'Placing Order…' : `Place Order — ${kwd(total)}`}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Order History ── */}
      <div className="history-section">
        <div className="history-header">
          <div>
            <h2 className="history-title">My Order History</h2>
            <p className="history-subtitle">Track the status of your previous orders</p>
          </div>
          <div className="history-lookup">
            <input
              className="history-email-input"
              type="email"
              value={lookupEmail}
              onChange={e => setLookupEmail(e.target.value)}
              placeholder="Enter your email to look up orders"
              onKeyDown={e => e.key === 'Enter' && fetchHistory(lookupEmail)}
            />
            <button
              className="btn btn-secondary history-lookup-btn"
              onClick={() => fetchHistory(lookupEmail)}
              disabled={historyLoading}
            >
              {historyLoading ? '…' : 'Look up'}
            </button>
          </div>
        </div>

        {historyLoading && <div className="loading" style={{ padding: '24px 0' }}>Loading your orders…</div>}

        {!historyLoading && history.length === 0 && lookupEmail && (
          <div className="history-empty">No orders found for this email address.</div>
        )}

        {!historyLoading && history.length > 0 && (
          <div className="history-list">
            {history.map(order => {
              const meta   = STATUS_META[order.status] || STATUS_META.pending;
              const isOpen = expandedOrder === order.id;
              return (
                <div key={order.id} className="history-card">
                  <div
                    className="history-card-header"
                    onClick={() => setExpandedOrder(isOpen ? null : order.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setExpandedOrder(isOpen ? null : order.id)}
                  >
                    <div className="history-card-left">
                      <span className="history-order-num">Order #{order.id}</span>
                      <span className="history-order-date">{order.order_date}</span>
                      <span className="history-order-items">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="history-card-right">
                      <span className="history-order-total">{kwd(order.total)}</span>
                      <span
                        className="history-status-badge"
                        style={{ color: meta.color, background: meta.bg }}
                      >
                        {meta.label}
                      </span>
                      <span className="history-chevron">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="history-card-body">
                      <table className="history-items-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map(item => (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td style={{ color: '#9A7060' }}>{item.quantity}</td>
                              <td style={{ color: '#8B4513', fontWeight: 600 }}>{kwd(item.unit_price * item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={2} style={{ fontWeight: 700, paddingTop: 10, color: '#8B4513', borderBottom: 'none' }}>Total</td>
                            <td style={{ fontWeight: 700, paddingTop: 10, color: '#8B4513', borderBottom: 'none' }}>{kwd(order.total)}</td>
                          </tr>
                        </tfoot>
                      </table>

                      {order.notes && (
                        <p style={{ fontSize: '0.85rem', color: '#9A7060', marginTop: 10 }}>
                          📝 {order.notes}
                        </p>
                      )}

                      {/* Status Timeline */}
                      <div className="status-timeline">
                        {['pending', 'confirmed', 'delivered'].map((s, idx) => {
                          const steps   = ['pending', 'confirmed', 'delivered'];
                          const current = steps.indexOf(order.status);
                          const isDone  = idx <= current;
                          const isActive = idx === current;
                          return (
                            <div key={s} className={`timeline-step${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                              <div className="timeline-dot" />
                              {idx < 2 && <div className={`timeline-line${isDone && idx < current ? ' done' : ''}`} />}
                              <span className="timeline-label">
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
