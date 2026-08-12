/**
 * UPterindo — static file server
 * Serves the landing page (index.html) and the app (app.html) from /public.
 * Works out of the box on any Node host (Render, Railway, Fly.io, a VPS, etc.)
 * and is ready to sit behind a custom domain.
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Serve everything in /public as-is (index.html, app.html, /assets/*)
app.use(express.static(PUBLIC_DIR, {
  extensions: ['html'], // allows "/app" to resolve to "/app.html"
}));

// Friendly explicit routes (in case someone wants /app or /home instead of the .html path)
app.get('/app', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'app.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Simple health check — useful for uptime monitors / hosting platform checks
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', app: 'upterindo' });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`UPterindo server running at http://localhost:${PORT}`);
  console.log(`  Landing page: http://localhost:${PORT}/`);
  console.log(`  Aplikasi:     http://localhost:${PORT}/app.html`);
});
