import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const kwd = (amount) => `KWD ${Number(amount).toFixed(3)}`;
const STATUS_OPTIONS = ['pending', 'confirmed', 'delivered'];

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
});

const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const from = `${ym}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${ym}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
};

// ── PDF Generation ─────────────────────────────────────
function generatePDF(orders, filterLabel) {
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pending   = orders.filter(o => o.status === 'pending').length;
  const confirmed = orders.filter(o => o.status === 'confirmed').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;

  const orderRows = orders.map(order => `
    <tr>
      <td>${order.id}</td>
      <td>${order.client_name}<br/><span class="sub">${order.client_email}</span></td>
      <td>${order.order_date || order.created_at?.slice(0,10) || '—'}</td>
      <td>${order.created_at?.slice(11,16) || '—'}</td>
      <td>
        ${order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
        ${order.notes ? `<br/><span class="notes">📝 ${order.notes}</span>` : ''}
      </td>
      <td class="gold">${kwd(order.total)}</td>
      <td><span class="badge badge-${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Studio Roast — Orders Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1A0F07; font-size: 12px; }
    .page { padding: 32px 36px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #D4A843; }
    .brand-name { font-size: 22px; font-weight: 700; color: #1A0F07; letter-spacing: 0.04em; }
    .brand-sub { font-size: 11px; color: #8A6040; text-transform: uppercase; letter-spacing: 0.1em; }
    .report-meta { text-align: right; }
    .report-title { font-size: 14px; font-weight: 600; color: #D4A843; text-transform: uppercase; letter-spacing: 0.08em; }
    .report-period { font-size: 11px; color: #8A6040; margin-top: 4px; }
    .report-generated { font-size: 10px; color: #B09070; margin-top: 2px; }
    .stats { display: flex; gap: 14px; margin-bottom: 24px; }
    .stat { flex: 1; border: 1px solid #EDD9B8; border-top: 3px solid #D4A843; border-radius: 8px; padding: 12px 14px; text-align: center; }
    .stat-value { font-size: 18px; font-weight: 700; color: #1A0F07; }
    .stat-label { font-size: 10px; color: #8A6040; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 3px; }
    .stat-revenue .stat-value { color: #C8860A; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: #2C1A0E; color: #F0E6D3; }
    thead th { padding: 9px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em; }
    tbody tr { border-bottom: 1px solid #F0E0C8; }
    tbody tr:nth-child(even) { background: #FFFBF6; }
    tbody tr:hover { background: #FFF3E0; }
    td { padding: 8px 10px; vertical-align: top; }
    .sub { color: #8A6040; font-size: 10px; }
    .notes { color: #9A7A5A; font-size: 10px; font-style: italic; }
    .gold { color: #C8860A; font-weight: 700; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-pending   { background: #FFF0CC; color: #7A5C00; }
    .badge-confirmed { background: #D6EFD8; color: #1A5C20; }
    .badge-delivered { background: #E8DDD0; color: #4A2C0A; }
    .footer-line { margin-top: 24px; padding-top: 12px; border-top: 1px solid #EDD9B8; font-size: 10px; color: #B09070; display: flex; justify-content: space-between; }
    @media print { .page { padding: 20px; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-name">Studio Roast</div>
        <div class="brand-sub">Kuwait</div>
      </div>
      <div class="report-meta">
        <div class="report-title">Orders Report</div>
        <div class="report-period">Period: ${filterLabel}</div>
        <div class="report-generated">Generated: ${new Date().toLocaleString()}</div>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${orders.length}</div>
        <div class="stat-label">Total Orders</div>
      </div>
      <div class="stat stat-revenue">
        <div class="stat-value">${kwd(totalRevenue)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
      <div class="stat">
        <div class="stat-value">${pending}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat">
        <div class="stat-value">${confirmed}</div>
        <div class="stat-label">Confirmed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${delivered}</div>
        <div class="stat-label">Delivered</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Client</th>
          <th>Date</th>
          <th>Time</th>
          <th>Items</th>
          <th>Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${orderRows || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#9A7A5A">No orders found</td></tr>'}
      </tbody>
    </table>

    <div class="footer-line">
      <span>Studio Roast Kuwait — Confidential</span>
      <span>Total ${orders.length} order${orders.length !== 1 ? 's' : ''} — ${kwd(totalRevenue)}</span>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400);
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const today     = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const [filterMode, setFilterMode] = useState('day');
  const [date, setDate]             = useState(today);
  const [fromMonth, setFromMonth]   = useState(thisMonth);
  const [toMonth, setToMonth]       = useState(thisMonth);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const filterLabel = filterMode === 'day'
    ? date
    : `${fromMonth} → ${toMonth}`;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url;
      if (filterMode === 'day') {
        url = `/api/orders?date=${date}`;
      } else {
        const { from } = monthRange(fromMonth);
        const { to }   = monthRange(toMonth);
        url = `/api/orders?from=${from}&to=${to}`;
      }
      const res = await axios.get(url, authHeader());
      setOrders(res.data.data);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [filterMode, date, fromMonth, toMonth]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId, status) => {
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status }, authHeader());
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch {
      alert('Failed to update status.');
    }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  const statCards = [
    { label: 'Total Orders',       value: orders.length,                                       color: '#1A0A04' },
    { label: 'Total Order Values', value: kwd(totalRevenue),                                   color: '#8B4513' },
    { label: 'Pending',            value: orders.filter(o => o.status === 'pending').length,   color: '#C8860A' },
    { label: 'Delivered',          value: orders.filter(o => o.status === 'delivered').length, color: '#2E7D4A' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 6 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Manage incoming orders — Studio Roast Kuwait</p>
        </div>
        <button
          className="btn btn-secondary"
          style={{ whiteSpace: 'nowrap', marginTop: 8 }}
          onClick={() => generatePDF(orders, filterLabel)}
          disabled={orders.length === 0}
          title="Download orders as PDF"
        >
          ⬇ Export PDF
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="filter-bar">
        <div className="filter-mode-toggle">
          <button
            className={`filter-tab${filterMode === 'day' ? ' active' : ''}`}
            onClick={() => setFilterMode('day')}
          >By Day</button>
          <button
            className={`filter-tab${filterMode === 'range' ? ' active' : ''}`}
            onClick={() => setFilterMode('range')}
          >Monthly Range</button>
        </div>

        {filterMode === 'day' ? (
          <div className="filter-inputs">
            <label style={{ fontWeight: 500, color: '#8A7060', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</label>
            <input type="date" className="date-picker" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        ) : (
          <div className="filter-inputs">
            <label style={{ fontWeight: 500, color: '#8A7060', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>From</label>
            <input type="month" className="date-picker" value={fromMonth} onChange={e => setFromMonth(e.target.value)} />
            <label style={{ fontWeight: 500, color: '#8A7060', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>To</label>
            <input type="month" className="date-picker" value={toMonth} onChange={e => setToMonth(e.target.value)} />
          </div>
        )}

        <button className="btn btn-secondary" onClick={fetchOrders} style={{ whiteSpace: 'nowrap' }}>
          ↻ Refresh
        </button>
      </div>

      {/* ── Summary Stats ── */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
          {statCards.map(stat => (
            <div key={stat.label} className="card stat-card" style={{ textAlign: 'center', padding: '20px 12px' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: stat.color, fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9A7060', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading">☕ Loading orders…</div>}

      {!loading && orders.length === 0 && (
        <div className="card no-orders">
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <p style={{ color: '#B09080', fontStyle: 'italic' }}>No orders found for the selected period</p>
        </div>
      )}

      {!loading && orders.map(order => (
        <div key={order.id} className="card order-card">
          <div className="order-card-header">
            <div>
              <span className="order-card-name">{order.client_name}</span>
              <span style={{ marginLeft: 8, color: '#B09080', fontSize: '0.82rem' }}>#{order.id}</span>
              {filterMode === 'range' && (
                <span style={{ marginLeft: 10, color: '#C8860A', fontSize: '0.8rem', fontWeight: 500 }}>
                  {order.order_date}
                </span>
              )}
            </div>
            <span className={`status-badge status-${order.status}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>

          <div className="order-card-meta">
            {order.client_email} &nbsp;·&nbsp; {order.created_at?.slice(11,16)} &nbsp;·&nbsp;
            <span style={{ color: '#8B4513', fontWeight: 600 }}>{kwd(order.total)}</span>
            {order.delivery_date && (
              <span style={{ marginLeft: 8, color: '#2E7D4A', fontSize: '0.82rem', fontWeight: 500 }}>
                📦 Delivery: {order.delivery_date}
              </span>
            )}
          </div>

          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', marginBottom: 14 }}>
            <thead>
              <tr>
                <th style={{ padding: '5px 0', fontWeight: 500, color: '#9A7060', textAlign: 'left', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #EDD9C8' }}>Item</th>
                <th style={{ padding: '5px 0', fontWeight: 500, color: '#9A7060', textAlign: 'left', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #EDD9C8' }}>Qty</th>
                <th style={{ padding: '5px 0', fontWeight: 500, color: '#9A7060', textAlign: 'left', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #EDD9C8' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id}>
                  <td style={{ padding: '6px 0', color: '#5A3520', borderBottom: '1px solid #F5EAE0' }}>{item.name}</td>
                  <td style={{ padding: '6px 0', color: '#9A7060', borderBottom: '1px solid #F5EAE0' }}>{item.quantity}</td>
                  <td style={{ padding: '6px 0', color: '#8B4513', fontWeight: 600, borderBottom: '1px solid #F5EAE0' }}>
                    {kwd(item.unit_price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {order.notes && (
            <p style={{ fontSize: '0.82rem', color: '#9A7060', marginBottom: 12, fontStyle: 'italic' }}>
              📝 {order.notes}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 500, color: '#9A7060', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</label>
            <select
              className="status-select"
              value={order.status}
              onChange={e => updateStatus(order.id, e.target.value)}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
