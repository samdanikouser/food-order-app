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
// Try multiple possible paths to find the frontend build
const fs = require('fs');
const possiblePaths = [
  path.join(__dirname, '../../frontend/build'),       // local dev: backend/src -> frontend/build
  path.join(process.cwd(), '../frontend/build'),      // Railway: cwd=backend -> ../frontend/build
  path.join(process.cwd(), 'frontend/build'),         // Railway: cwd=app root
  path.join(__dirname, '../../../frontend/build'),    // fallback
];
const frontendBuild = possiblePaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || possiblePaths[0];
console.log(`📁 Frontend build path: ${frontendBuild} (exists: ${fs.existsSync(path.join(frontendBuild, 'index.html'))})`);

app.use(express.static(frontendBuild));
// Any non-API route serves the React app (handles client-side routing)
app.get('*', (req, res) => {
  const indexPath = path.join(frontendBuild, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(500).send(`Frontend not found. Tried: ${possiblePaths.join(', ')}`);
  }
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`\n☕ Studio Roast running → http://localhost:${PORT}\n`);
});
