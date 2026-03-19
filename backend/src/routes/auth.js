const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  const storedUser = db.prepare("SELECT value FROM settings WHERE key = 'admin_username'").get();
  const storedPass = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();

  if (
    username === storedUser?.value &&
    password === storedPass?.value
  ) {
    // Simple token: base64(username:password) — sufficient for internal use
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false, message: 'Invalid username or password' });
});

// Middleware to protect admin routes
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const token = auth.slice(7);
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');
    const storedUser = db.prepare("SELECT value FROM settings WHERE key = 'admin_username'").get();
    const storedPass = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
    if (username === storedUser?.value && password === storedPass?.value) {
      return next();
    }
  } catch (_) {}
  res.status(401).json({ success: false, message: 'Unauthorized' });
}

module.exports = { router, requireAuth };
