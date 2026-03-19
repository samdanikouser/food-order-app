const Database = require('better-sqlite3');
const path = require('path');

// Use RAILWAY_VOLUME_MOUNT_PATH (or any DATA_DIR env var) for persistent storage,
// otherwise fall back to the local file next to the backend folder.
const dbDir  = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '../../');
const dbPath = path.join(dbDir, 'food_orders.db');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT DEFAULT 'main',
    available INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    order_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    total REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed default settings if not present
const settingsDefaults = {
  admin_username: 'admin',
  admin_password: 'admin123',
  email_enabled: '0',
  // email_recipients: JSON array of email strings  e.g. '["a@b.com","c@d.com"]'
  email_recipients: '[]',
  smtp_host: 'smtp.gmail.com',
  smtp_port: '587',
  smtp_user: '',
  smtp_pass: '',
  whatsapp_enabled: '0',
  // whatsapp_recipients: JSON array of {phone, apikey} objects
  whatsapp_recipients: '[]',
};
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
Object.entries(settingsDefaults).forEach(([k, v]) => insertSetting.run(k, v));

// Seed menu items if empty
const count = db.prepare('SELECT COUNT(*) as count FROM menu_items').get();
if (count.count === 0) {
  const insert = db.prepare(
    'INSERT INTO menu_items (name, description, price, category) VALUES (?, ?, ?, ?)'
  );

  const items = [
    // SANDWICHES & LIGHT MEALS
    ['Turkey & Cheese Sandwich', '', 0.67, 'Sandwiches & Light Meals'],
    ['Breakfast Scrambled Egg Sandwich', '', 0.36, 'Sandwiches & Light Meals'],
    ['Turkey Pesto Panini', '', 0.69, 'Sandwiches & Light Meals'],
    ['Grilled Cheese Sourdough Melt', '', 0.66, 'Sandwiches & Light Meals'],
    ['Smoked Salmon & Cream Cheese Sourdough', '', 1.23, 'Sandwiches & Light Meals'],
    ['Overnight Oats (Hazelnut / Classic)', '', 0.37, 'Sandwiches & Light Meals'],
    ['Protein Porridge Cup', '', 0.59, 'Sandwiches & Light Meals'],

    // OPEN TOASTS – SOURDOUGH BREADS
    ['Classic Avocado Toast', 'On sourdough bread', 0.38, 'Open Toasts – Sourdough Breads'],
    ['Pistachio Labneh Toast', 'On sourdough bread', 0.49, 'Open Toasts – Sourdough Breads'],
    ['Honey Ricotta Toast', 'On sourdough bread', 0.92, 'Open Toasts – Sourdough Breads'],
    ['Nut Butter Banana Toast', 'On sourdough bread', 1.26, 'Open Toasts – Sourdough Breads'],

    // CROISSANTERIE
    ['Butter Croissant', '', 0.49, 'Croissanterie'],
    ['Pain au Chocolat (Sea Salt Option)', '', 0.48, 'Croissanterie'],
    ['Almond Croissant', '', 0.41, 'Croissanterie'],
    ['Cube Croissant', '', 0.51, 'Croissanterie'],
    ['Feta & Sesame Croissant', '', 0.44, 'Croissanterie'],
    ['Pistachio Croissant', '', 0.88, 'Croissanterie'],
    ['Lotus Biscoff Croissant', '', 0.83, 'Croissanterie'],
    ['Cruffin', '', 0.71, 'Croissanterie'],
    ['Zaatar Croissant', '', 0.44, 'Croissanterie'],
    ['Kunafa Croissant', '', 2.00, 'Croissanterie'],
    ['Cream Danish', '', 0.23, 'Croissanterie'],
    ['Seasonal Fruit Danish', '', 0.39, 'Croissanterie'],
    ['Crookie', '', 0.81, 'Croissanterie'],

    // BAKERY
    ['Cinnamon Roll', '', 0.36, 'Bakery'],
    ['Cardamom Bun (Swedish)', '', 0.16, 'Bakery'],

    // CAKES
    ['Banana Bread Slice', '', 0.10, 'Cakes'],
    ['Carrot Cake Slice', '', 0.27, 'Cakes'],
    ['Lemon Loaf / Citrus Loaf', '', 0.22, 'Cakes'],
    ['Marble Pound Cake', '', 0.19, 'Cakes'],
    ['Date-Walnut Cake', '', 0.43, 'Cakes'],

    // PASTRY
    ['Pistachio Rose Tart', '', 0.54, 'Pastry'],
    ['Saffron Milk Cake Slice', '', 0.46, 'Pastry'],
    ['Lotus Biscoff Cheesecake', '', 0.31, 'Pastry'],
    ['Arabic Coffee & Cardamom Tiramisu', '', 1.07, 'Pastry'],

    // COOKIES
    ['Double Chocolate Cookie', '', 0.20, 'Cookies'],
    ['Salted Caramel Brownie', '', 0.38, 'Cookies'],

    // CONFECTIONERY
    ['Protein Bars', '', 0.26, 'Confectionery'],
    ['Granola Bar', '', 0.25, 'Confectionery'],
    ['Protein Balls', '', 0.07, 'Confectionery'],
  ];

  items.forEach(item => insert.run(...item));
  console.log(`Menu seeded with ${items.length} items.`);
}

// Predefined categories (used by admin add-item dropdown and client menu pills)
const CATEGORIES = [
  'Sandwiches & Light Meals',
  'Open Toasts – Sourdough Breads',
  'Croissanterie',
  'Bakery',
  'Cakes',
  'Pastry',
  'Cookies',
  'Confectionery',
];

// Migrate: add delivery_date column if missing
try {
  db.prepare("SELECT delivery_date FROM orders LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE orders ADD COLUMN delivery_date TEXT");
  console.log('Migration: added delivery_date column to orders table.');
}

module.exports = db;
module.exports.CATEGORIES = CATEGORIES;
