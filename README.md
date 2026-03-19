# Studio Roast — Daily Food Order App

A full-stack daily food ordering web application for **Studio Roast Kuwait**. Clients browse the menu, place orders with an expected delivery date, and track order status. Admins manage orders, menu items, and notification settings from a dashboard.

**Live URL:** [https://studio-roast-production.up.railway.app](https://studio-roast-production.up.railway.app)

---

## Architecture Overview

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18 (Single Page Application)  |
| Backend  | Node.js + Express                   |
| Database | SQLite (better-sqlite3)             |
| Hosting  | Railway.app (Nixpacks build)        |
| PWA      | Service Worker + Web App Manifest   |

The frontend is a React SPA served as static files by the Express backend. All API calls go through `/api/*` routes. SQLite provides zero-config persistence, and on Railway the database file is stored on a persistent volume.

---

## Project Structure

```
food-order-app/
├── backend/
│   ├── src/
│   │   ├── index.js              ← Server entry, static file serving
│   │   ├── notifications.js      ← Email & WhatsApp notification system
│   │   ├── db/
│   │   │   └── database.js       ← SQLite setup, migrations, seed data
│   │   └── routes/
│   │       ├── auth.js           ← Admin login & JWT authentication
│   │       ├── menu.js           ← Menu CRUD + categories endpoint
│   │       ├── orders.js         ← Order placement, history, status
│   │       └── settings.js       ← SMTP & notification settings
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── index.html            ← PWA meta tags, manifest link
│   │   ├── manifest.json         ← Web App Manifest for PWA
│   │   ├── sw.js                 ← Service Worker (caching strategy)
│   │   ├── icon-192.png          ← PWA icon 192×192
│   │   ├── icon-512.png          ← PWA icon 512×512
│   │   └── apple-touch-icon.png  ← iOS home screen icon
│   ├── src/
│   │   ├── App.js                ← Routing, navbar, logo switching
│   │   ├── App.css               ← All styles (espresso theme)
│   │   ├── index.js              ← React entry + SW registration
│   │   ├── serviceWorkerRegistration.js
│   │   └── pages/
│   │       ├── MenuPage.js       ← Client: menu, cart, order form
│   │       ├── OrderConfirmation.js ← Client: order receipt
│   │       └── AdminDashboard.js ← Admin: orders, stats, PDF export
│   └── package.json
├── docs/
│   └── EMAIL_SETUP.md            ← Step-by-step email SMTP guide
├── nixpacks.toml                 ← Railway build config (Python, gcc)
├── StudioRoast_Architecture.docx ← Full architecture document
└── README.md
```

---

## Features

### Client Side
- Browse menu organized by category (Sandwiches & Light Meals, Open Toasts – Sourdough Breads, Croissanterie, Bakery, Cakes, Pastry, Cookies, Confectionery)
- Add items to cart with quantity controls
- Custom order field for items not on the menu
- Expected delivery date picker
- Special notes / dietary instructions
- Order confirmation page with order ID
- Order history lookup by email with status timeline
- PWA: installable on mobile and desktop, works offline for cached pages

### Admin Side
- Secure login with JWT authentication
- Dashboard with order stats (total orders, revenue, pending, delivered)
- Filter orders by day or monthly range
- Update order status: Pending → Confirmed → Delivered
- Export orders to PDF report
- Manage menu items (add, edit, toggle availability, delete)
- Configure email and WhatsApp notifications
- Send test notifications

### Notifications
- Email notifications via SMTP (Gmail, Outlook, SendGrid supported)
- WhatsApp notifications via CallMeBot API
- Styled HTML email with order details, delivery date, and item table
- See [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md) for setup instructions

---

## Database Schema

### menu_items
| Column      | Type    | Description                     |
|-------------|---------|---------------------------------|
| id          | INTEGER | Primary key, auto-increment     |
| name        | TEXT    | Item name                       |
| description | TEXT    | Optional description            |
| price       | REAL    | Price in KWD                    |
| category    | TEXT    | Category name                   |
| available   | INTEGER | 1 = available, 0 = hidden       |

### orders
| Column        | Type    | Description                          |
|---------------|---------|--------------------------------------|
| id            | INTEGER | Primary key, auto-increment          |
| client_name   | TEXT    | Customer name                        |
| client_email  | TEXT    | Customer email                       |
| order_date    | TEXT    | Date order was placed (YYYY-MM-DD)   |
| delivery_date | TEXT    | Expected delivery date (YYYY-MM-DD)  |
| status        | TEXT    | pending / confirmed / delivered      |
| total         | REAL    | Order total in KWD                   |
| notes         | TEXT    | Special notes + custom order text    |
| created_at    | TEXT    | Timestamp                            |

### order_items
| Column       | Type    | Description                    |
|--------------|---------|--------------------------------|
| id           | INTEGER | Primary key, auto-increment    |
| order_id     | INTEGER | FK → orders.id                 |
| menu_item_id | INTEGER | FK → menu_items.id             |
| quantity     | INTEGER | Number of units                |
| unit_price   | REAL    | Price at time of order         |

### settings
| Column | Type | Description              |
|--------|------|--------------------------|
| key    | TEXT | Setting name (primary key)|
| value  | TEXT | Setting value             |

---

## API Endpoints

### Menu (Public)
| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| GET    | `/api/menu`                 | Get available menu items       |
| GET    | `/api/menu/categories`      | Get predefined category list   |

### Menu (Admin — requires auth)
| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| GET    | `/api/menu/all`             | Get all items incl. unavailable|
| POST   | `/api/menu`                 | Add a new menu item            |
| PUT    | `/api/menu/:id`             | Update a menu item             |
| PUT    | `/api/menu/:id/availability`| Toggle item availability       |
| DELETE | `/api/menu/:id`             | Delete a menu item             |

### Orders (Public)
| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| POST   | `/api/orders`               | Place a new order              |
| GET    | `/api/orders/:id`           | Get a single order by ID       |
| GET    | `/api/orders/history?email=`| Client order history by email  |

### Orders (Admin — requires auth)
| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| GET    | `/api/orders`               | Get all orders (filter by date)|
| GET    | `/api/orders/today`         | Get today's orders             |
| PUT    | `/api/orders/:id/status`    | Update order status            |

### Auth
| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| POST   | `/api/auth/login`           | Admin login, returns JWT token |

### Settings (Admin — requires auth)
| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | `/api/settings`                  | Get notification settings      |
| PUT    | `/api/settings`                  | Update settings                |
| POST   | `/api/settings/test-email`       | Send test email                |
| POST   | `/api/settings/test-whatsapp`    | Send test WhatsApp             |

---

## Menu Categories

The app uses these predefined categories:

1. Sandwiches & Light Meals
2. Open Toasts – Sourdough Breads
3. Croissanterie
4. Bakery
5. Cakes
6. Pastry
7. Cookies
8. Confectionery

Categories are defined in `backend/src/db/database.js` and served via `GET /api/menu/categories`.

---

## Getting Started (Local Development)

### Prerequisites
- Node.js v18+
- npm

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

The API runs at **http://localhost:5000**

### 2. Start the Frontend

```bash
cd frontend
npm install
npm start
```

The app opens at **http://localhost:3000**

### Default Admin Credentials
- Username: `admin`
- Password: `admin123`
- Change these in Settings after first login

---

## Deployment (Railway.app)

The app is deployed on Railway with automatic deploys from the `main` branch.

### Railway Configuration

| Setting           | Value                                           |
|-------------------|-------------------------------------------------|
| Build Command     | `cd frontend && npm install && npm run build && cd ../backend && npm install` |
| Start Command     | `cd backend && npm start`                       |
| Root Directory    | `/`                                             |
| Watch Paths       | `backend/**`, `frontend/**`                     |

### Required Files
- `nixpacks.toml` — Adds Python3, gcc, and gnumake for compiling `better-sqlite3` native bindings

```toml
[phases.setup]
nixPkgs = ["nodejs_22", "python3", "gcc", "gnumake"]
```

### Environment Variables (Optional)
| Variable                    | Description                         |
|-----------------------------|-------------------------------------|
| `PORT`                      | Server port (Railway sets this)     |
| `RAILWAY_VOLUME_MOUNT_PATH` | Persistent volume path for SQLite DB|
| `DATA_DIR`                  | Alternative DB storage directory    |

### Deploy Steps
1. Push to GitHub: `git push origin main`
2. Railway auto-detects the push and rebuilds
3. The app is available at your Railway domain

---

## PWA (Progressive Web App)

The app is installable as a PWA on both mobile and desktop:

- **Android:** Open the URL in Chrome → tap "Add to Home Screen"
- **iOS:** Open in Safari → tap Share → "Add to Home Screen"
- **Desktop:** Click the install icon in Chrome's address bar

The service worker uses a network-first strategy for API calls and cache-first for static assets, with SPA navigation fallback.

---

## Email Setup

See [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md) for a complete step-by-step guide on configuring Gmail (or other SMTP providers) for order notifications.

---

## Tech Stack Summary

- **React 18** — Component-based UI with hooks
- **React Router v6** — Client-side routing (/, /admin, /confirmation/:id)
- **Axios** — HTTP client for API calls
- **Express 4** — REST API framework
- **better-sqlite3** — Synchronous SQLite driver with native bindings
- **nodemailer** — SMTP email sending
- **JWT (jsonwebtoken)** — Admin authentication tokens
- **Nixpacks** — Railway's build system for Node.js + native modules
