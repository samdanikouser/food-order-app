import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
});

const CATEGORIES = [
  'Espresso Classics', 'Espresso with Milk', 'Brewed Coffee', 'Cold Brew & Iced',
  'Non-Coffee Drinks', 'Matcha & Tea', 'Specialty Drinks', 'Food & Bites', 'Other'
];

const EMPTY_FORM = { name: '', description: '', price: '', category: 'Espresso Classics', available: true };

export default function MenuManagementPage() {
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(null);
  const [msg, setMsg]                 = useState({ text: '', type: '' });
  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState('All');

  // Modal state
  const [showModal, setShowModal]     = useState(false);
  const [editItem, setEditItem]       = useState(null); // null = add, object = edit
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formErr, setFormErr]         = useState('');

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadItems = useCallback(() => {
    setLoading(true);
    axios.get('/api/menu/all', authHeader())
      .then(res => setItems(res.data.data))
      .catch(() => setMsg({ text: 'Failed to load menu items.', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3500);
  };

  // ── Open modal ──────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category: item.category || 'Other',
      available: item.available === 1,
    });
    setFormErr('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditItem(null); };

  // ── Save (add or update) ────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormErr('Name is required.'); return; }
    if (form.price === '' || isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) {
      setFormErr('Enter a valid price.'); return;
    }
    setSaving(true); setFormErr('');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(parseFloat(form.price).toFixed(3)),
      category: form.category,
      available: form.available,
    };
    try {
      if (editItem) {
        await axios.put(`/api/menu/${editItem.id}`, payload, authHeader());
        flash(`✅ "${form.name}" updated successfully.`);
      } else {
        await axios.post('/api/menu', payload, authHeader());
        flash(`✅ "${form.name}" added to the menu.`);
      }
      closeModal();
      loadItems();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle availability ─────────────────────────────────
  const toggleAvailability = async (item) => {
    try {
      await axios.put(`/api/menu/${item.id}/availability`, { available: item.available !== 1 }, authHeader());
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: i.available === 1 ? 0 : 1 } : i));
    } catch {
      flash('Failed to update availability.', 'error');
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await axios.delete(`/api/menu/${id}`, authHeader());
      setItems(prev => prev.filter(i => i.id !== id));
      flash('✅ Item deleted.');
    } catch {
      flash('Failed to delete item.', 'error');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  // ── Filtered list ───────────────────────────────────────
  const filtered = items.filter(item => {
    const matchCat = filterCat === 'All' || item.category === filterCat;
    const matchSearch = !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const categories = ['All', ...CATEGORIES.filter(c => items.some(i => i.category === c)),
    ...items.map(i => i.category).filter(c => !CATEGORIES.includes(c) && c).filter((v, i, a) => a.indexOf(v) === i)
  ];

  // ── Group by category ───────────────────────────────────
  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) return <div className="loading">☕ Loading menu...</div>;

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 className="page-title">Menu Management</h1>
      <p className="page-subtitle">Add, edit, or remove items from the menu</p>

      {msg.text && (
        <div className={msg.type === 'error' ? 'error-msg' : 'success-msg'}>{msg.text}</div>
      )}

      {/* ── Toolbar ── */}
      <div className="menu-mgmt-toolbar">
        <input
          className="menu-search-input"
          placeholder="🔍 Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="menu-cat-filter"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd} style={{ whiteSpace: 'nowrap' }}>
          + Add Item
        </button>
      </div>

      <div className="menu-mgmt-summary">
        {items.length} items total &nbsp;·&nbsp;
        <span style={{ color: '#2D9D6B' }}>{items.filter(i => i.available === 1).length} available</span>
        &nbsp;·&nbsp;
        <span style={{ color: '#C0392B' }}>{items.filter(i => i.available !== 1).length} hidden</span>
      </div>

      {/* ── Items grouped by category ── */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9A7A5A', padding: '40px 0' }}>No items match your filter.</div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} className="menu-mgmt-group">
            <div className="menu-mgmt-group-title">{cat} <span>({catItems.length})</span></div>
            {catItems.map(item => (
              <div key={item.id} className={`menu-mgmt-row ${item.available !== 1 ? 'unavailable' : ''}`}>
                <div className="menu-mgmt-info">
                  <div className="menu-mgmt-name">
                    {item.name}
                    {item.available !== 1 && <span className="menu-hidden-badge">Hidden</span>}
                  </div>
                  {item.description && (
                    <div className="menu-mgmt-desc">{item.description}</div>
                  )}
                </div>
                <div className="menu-mgmt-price">KWD {parseFloat(item.price).toFixed(3)}</div>
                <div className="menu-mgmt-actions">
                  <button
                    className={`toggle-avail-btn ${item.available === 1 ? 'on' : 'off'}`}
                    onClick={() => toggleAvailability(item)}
                    title={item.available === 1 ? 'Click to hide' : 'Click to show'}
                  >
                    {item.available === 1 ? '👁 Visible' : '🚫 Hidden'}
                  </button>
                  <button className="btn btn-secondary edit-btn" onClick={() => openEdit(item)}>
                    ✏️ Edit
                  </button>
                  <button
                    className="btn delete-btn"
                    onClick={() => setConfirmDelete(item)}
                    disabled={deleting === item.id}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) closeModal(); }}>
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editItem ? '✏️ Edit Item' : '➕ Add New Item'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              {formErr && <div className="error-msg" style={{ marginBottom: 12 }}>{formErr}</div>}

              <div className="form-group">
                <label>Item Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Flat White"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional short description"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Price (KWD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="0.000"
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 4 }}>
                <label className="toggle-label" style={{ gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={form.available}
                    onChange={e => setForm(p => ({ ...p, available: e.target.checked }))}
                  />
                  <span className="toggle-text">{form.available ? 'Visible to customers' : 'Hidden from customers'}</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Dialog ── */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>🗑 Delete Item</h2>
            </div>
            <p style={{ color: '#4A2C0A', margin: '0 0 20px' }}>
              Are you sure you want to permanently delete <strong>"{confirmDelete.name}"</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn delete-btn"
                style={{ padding: '8px 20px' }}
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={deleting === confirmDelete.id}
              >
                {deleting === confirmDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
