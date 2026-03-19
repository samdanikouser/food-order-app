const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth } = require('./auth');
const { sendNotifications } = require('../notifications');

const itemsQuery = (orderId) => db.prepare(`
  SELECT oi.*, mi.name, mi.category
  FROM order_items oi
  JOIN menu_items mi ON oi.menu_item_id = mi.id
  WHERE oi.order_id = ?
`).all(orderId);

// GET /api/orders/history?email=xxx  — public, client-facing order history by email
router.get('/history', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const orders = db.prepare(
    "SELECT * FROM orders WHERE client_email = ? ORDER BY created_at DESC LIMIT 50"
  ).all(email.toLowerCase().trim());

  const fullOrders = orders.map(o => ({ ...o, items: itemsQuery(o.id) }));
  res.json({ success: true, data: fullOrders });
});

// GET /api/orders  — supports ?date=YYYY-MM-DD  OR  ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', requireAuth, (req, res) => {
  const { date, from, to } = req.query;
  let orders;

  if (from && to) {
    orders = db.prepare(
      "SELECT * FROM orders WHERE order_date >= ? AND order_date <= ? ORDER BY created_at DESC"
    ).all(from, to);
  } else if (date) {
    orders = db.prepare(
      "SELECT * FROM orders WHERE order_date = ? ORDER BY created_at DESC"
    ).all(date);
  } else {
    orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  }

  const fullOrders = orders.map(o => ({ ...o, items: itemsQuery(o.id) }));
  res.json({ success: true, data: fullOrders });
});

// GET /api/orders/today
router.get('/today', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const orders = db.prepare(
    "SELECT * FROM orders WHERE order_date = ? ORDER BY created_at DESC"
  ).all(today);
  const fullOrders = orders.map(o => ({ ...o, items: itemsQuery(o.id) }));
  res.json({ success: true, data: fullOrders, date: today });
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, data: { ...order, items: itemsQuery(order.id) } });
});

// POST /api/orders  — place new order (public — clients use this)
router.post('/', (req, res) => {
  const { client_name, client_email, items, notes } = req.body;

  if (!client_name || !client_email || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Name, email, and at least one item are required' });
  }

  let total = 0;
  const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ? AND available = 1');
  for (const item of items) {
    const row = menuItem.get(item.menu_item_id);
    if (!row) return res.status(400).json({ success: false, message: `Menu item ${item.menu_item_id} not found` });
    total += row.price * item.quantity;
  }

  const order_date = new Date().toISOString().split('T')[0];
  const insertOrder = db.prepare(
    'INSERT INTO orders (client_name, client_email, order_date, total, notes) VALUES (?, ?, ?, ?, ?)'
  );
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
  );

  const placeOrder = db.transaction(() => {
    const result = insertOrder.run(client_name, client_email, order_date, total, notes || '');
    const orderId = result.lastInsertRowid;
    for (const item of items) {
      const row = menuItem.get(item.menu_item_id);
      insertItem.run(orderId, item.menu_item_id, item.quantity, row.price);
    }
    return orderId;
  });

  const orderId = placeOrder();

  // Fire notifications asynchronously (won't delay the response)
  const fullOrder = {
    id: orderId,
    client_name,
    client_email,
    order_date,
    total,
    notes: notes || '',
    items: itemsQuery(orderId),
  };
  sendNotifications(db, fullOrder);

  res.status(201).json({ success: true, data: { order_id: orderId, total } });
});

// PUT /api/orders/:id/status  (protected)
router.put('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'delivered'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true, message: 'Status updated' });
});

module.exports = router;
