const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Auth
const { router: authRouter } = require('./routes/auth');
app.use('/api/auth', authRouter);

// Menu (public read, protected write)
app.use('/api/menu', require('./routes/menu'));

// Orders (POST is public for clients; GET/PUT protected)
app.use('/api/orders', require('./routes/orders'));

// Settings (protected)
app.use('/api/settings', require('./routes/settings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Studio Roast API running' });
});

// ── Serve React frontend in production ──────────────────
const frontendBuild = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendBuild));
// Any non-API route serves the React app (handles client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n☕ Studio Roast running → http://localhost:${PORT}\n`);
});
