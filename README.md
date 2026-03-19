# 🍽️ DailyEats — Food Order App

A simple daily food ordering web app where clients can order food from a company. Built with **React + Node.js + SQLite**.

---

## Project Structure

```
food-order-app/
├── backend/          ← Node.js + Express API
│   ├── src/
│   │   ├── index.js         ← Server entry point
│   │   ├── db/database.js   ← SQLite database setup & seeding
│   │   └── routes/
│   │       ├── menu.js      ← Menu API routes
│   │       └── orders.js    ← Orders API routes
│   └── package.json
├── frontend/         ← React app
│   ├── public/
│   ├── src/
│   │   ├── App.js           ← Main app with routing
│   │   ├── App.css          ← All styles
│   │   ├── index.js
│   │   └── pages/
│   │       ├── MenuPage.js         ← Client: Browse menu & place order
│   │       ├── OrderConfirmation.js← Client: Order receipt
│   │       └── AdminDashboard.js   ← Company: View & manage orders
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js v18 or higher
- npm

---

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

The API will run at: **http://localhost:5000**

---

### 2. Start the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

The app will open at: **http://localhost:3000**

---

## Using the App

### Client (Ordering Food)
1. Go to **http://localhost:3000**
2. Browse today's menu and click `+` to add items
3. Enter your name and email
4. Click **Place Order**
5. You'll see a confirmation with your order summary

### Admin (Company Side)
1. Go to **http://localhost:3000/admin**
2. View all orders for any date
3. Update order status: Pending → Confirmed → Preparing → Ready → Delivered

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu` | Get all menu items |
| POST | `/api/menu` | Add a menu item |
| PUT | `/api/menu/:id/availability` | Toggle item availability |
| GET | `/api/orders` | Get all orders (filter by `?date=YYYY-MM-DD`) |
| GET | `/api/orders/today` | Get today's orders |
| GET | `/api/orders/:id` | Get a single order |
| POST | `/api/orders` | Place a new order |
| PUT | `/api/orders/:id/status` | Update order status |

---

## Upgrading to PostgreSQL (Production)

Replace `better-sqlite3` in `backend/src/db/database.js` with `pg` (node-postgres):

```bash
npm install pg
```

Then replace the SQLite connection with:

```js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

---

## Next Steps / Future Enhancements
- Add user authentication (JWT)
- Email notifications when an order is placed
- Daily order cutoff time (e.g., orders close at 10 AM)
- Weekly menu management
- Mobile-optimized PWA
