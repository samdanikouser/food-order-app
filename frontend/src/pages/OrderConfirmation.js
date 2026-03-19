import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const kwd = (amount) => `KWD ${Number(amount).toFixed(3)}`;

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/orders/${orderId}`)
      .then(res => setOrder(res.data.data))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <div className="loading">☕ Loading your order…</div>;
  if (!order)  return <div className="error-msg">Order not found.</div>;

  return (
    <div style={{ maxWidth: 540, margin: '40px auto' }}>
      <div className="card" style={{ padding: '40px 32px', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(139,69,19,0.08)',
          border: '2px solid rgba(200,134,10,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '2rem',
          boxShadow: '0 4px 16px rgba(139,69,19,0.1)'
        }}>
          ✅
        </div>

        <h2 style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: '2rem', fontWeight: 600, color: '#1A0A04', marginBottom: 8
        }}>
          Order Confirmed
        </h2>
        <p style={{ color: '#9A7060', marginBottom: 28, fontSize: '0.92rem' }}>
          Thank you, <strong style={{ color: '#5A3520' }}>{order.client_name}</strong>!<br />
          Your order has been received and is being prepared. ☕
        </p>

        {/* Order Meta */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 16, fontSize: '0.82rem', color: '#9A7060',
          padding: '10px 14px', background: '#FAF5EF', borderRadius: 8,
          border: '1px solid #E8D5C0'
        }}>
          <span>Order <strong style={{ color: '#8B4513' }}>#{order.id}</strong></span>
          <span>{order.order_date}</span>
        </div>

        {/* Items Table */}
        <table className="order-detail-table" style={{ textAlign: 'left', marginBottom: 16 }}>
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
              <td colSpan={2} style={{
                fontWeight: 700, paddingTop: 14,
                color: '#8B4513', fontSize: '1rem', borderBottom: 'none'
              }}>Total</td>
              <td style={{
                fontWeight: 700, paddingTop: 14,
                color: '#8B4513', fontSize: '1rem', borderBottom: 'none'
              }}>{kwd(order.total)}</td>
            </tr>
          </tfoot>
        </table>

        {order.notes && (
          <p style={{ textAlign: 'left', marginBottom: 16, fontSize: '0.85rem', color: '#9A7060', fontStyle: 'italic' }}>
            📝 {order.notes}
          </p>
        )}

        <Link
          to="/"
          className="btn btn-primary"
          style={{ display: 'inline-block', textDecoration: 'none', width: '100%', paddingTop: 12, paddingBottom: 12 }}
        >
          Place Another Order ☕
        </Link>
      </div>
    </div>
  );
}
