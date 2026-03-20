const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth } = require('./auth');
const { testEmail, testWhatsApp, sendNotifications } = require('../notifications');

const PUBLIC_KEYS = [
  'email_enabled', 'email_recipients',
  'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass',
  'whatsapp_enabled', 'whatsapp_recipients',
  'admin_username',
];

// GET /api/settings
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const result = {};
  rows.forEach(r => {
    if (PUBLIC_KEYS.includes(r.key)) result[r.key] = r.value;
  });
  res.json({ success: true, data: result });
});

// PUT /api/settings
router.put('/', requireAuth, (req, res) => {
  const allowed = [...PUBLIC_KEYS, 'admin_password'];
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const upsertAll = db.transaction(() => {
    for (const [key, value] of Object.entries(req.body)) {
      if (allowed.includes(key)) update.run(key, String(value));
    }
  });
  upsertAll();
  res.json({ success: true, message: 'Settings saved' });
});

// POST /api/settings/test-email
router.post('/test-email', requireAuth, async (req, res) => {
  const result = await testEmail(db);
  res.json(result);
});

// POST /api/settings/test-whatsapp
router.post('/test-whatsapp', requireAuth, async (req, res) => {
  const result = await testWhatsApp(db);
  res.json(result);
});

// GET /api/settings/debug-notifications — check what's actually stored (admin only)
router.get('/debug-notifications', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => { s[r.key] = r.value; });
  res.json({
    email_enabled: s.email_enabled,
    email_recipients: s.email_recipients,
    smtp_user: s.smtp_user ? '***configured***' : '(empty)',
    smtp_pass: s.smtp_pass ? '***configured***' : '(empty)',
    whatsapp_enabled: s.whatsapp_enabled,
    whatsapp_recipients: s.whatsapp_recipients,
    note: 'whatsapp_enabled must be exactly "1" and whatsapp_recipients must be valid JSON array of {phone, apikey} objects',
  });
});

// POST /api/settings/test-order-notification — simulate EXACT order notification path (admin only)
router.post('/test-order-notification', requireAuth, async (req, res) => {
  const fakeOrder = {
    id: 9999,
    client_name: 'Test Customer',
    client_email: 'test@example.com',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date().toISOString().split('T')[0],
    total: 1.500,
    notes: 'Test order notification',
    items: [{ name: 'Butter Croissant', quantity: 2, unit_price: 0.490 }],
  };

  try {
    sendNotifications(db, fakeOrder);
    res.json({ ok: true, message: 'Notification triggered — check your WhatsApp in 30 seconds. Check Railway logs for details.' });
  } catch (err) {
    res.json({ ok: false, message: `sendNotifications crashed: ${err.message}` });
  }
});

module.exports = router;
