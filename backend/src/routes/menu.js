const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { CATEGORIES } = require('../db/database');
const { requireAuth } = require('./auth');

// GET predefined categories
router.get('/categories', (req, res) => {
  res.json({ success: true, data: CATEGORIES });
});

// GET all available menu items (public)
router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM menu_items WHERE available = 1').all();
  res.json({ success: true, data: items });
});

// GET ALL menu items including unavailable (admin)
router.get('/all', requireAuth, (req, res) => {
  const items = db.prepare('SELECT * FROM menu_items ORDER BY category, name').all();
  res.json({ success: true, data: items });
});

// GET a single menu item
router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, data: item });
});

// POST add new menu item (admin)
router.post('/', requireAuth, (req, res) => {
  const { name, description, price, category, available } = req.body;
  if (!name || price === undefined || price === '') {
    return res.status(400).json({ success: false, message: 'Name and price are required' });
  }
  const result = db
    .prepare('INSERT INTO menu_items (name, description, price, category, available) VALUES (?, ?, ?, ?, ?)')
    .run(name, description || '', parseFloat(price), category || 'Other', available !== false ? 1 : 0);
  res.status(201).json({ success: true, data: { id: result.lastInsertRowid } });
});

// PUT full update of a menu item (admin)
router.put('/:id', requireAuth, (req, res) => {
  const { name, description, price, category, available } = req.body;
  if (!name || price === undefined || price === '') {
    return res.status(400).json({ success: false, message: 'Name and price are required' });
  }
  const result = db.prepare(
    'UPDATE menu_items SET name=?, description=?, price=?, category=?, available=? WHERE id=?'
  ).run(name, description || '', parseFloat(price), category || 'Other', available ? 1 : 0, req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, message: 'Item updated' });
});

// PUT update availability (admin)
router.put('/:id/availability', requireAuth, (req, res) => {
  const { available } = req.body;
  db.prepare('UPDATE menu_items SET available = ? WHERE id = ?').run(available ? 1 : 0, req.params.id);
  res.json({ success: true, message: 'Availability updated' });
});

// DELETE a menu item (admin)
router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, message: 'Item deleted' });
});

module.exports = router;
