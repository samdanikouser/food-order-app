const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth } = require('./auth');
const { testEmail, testWhatsApp } = require('../notifications');

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

module.exports = router;
