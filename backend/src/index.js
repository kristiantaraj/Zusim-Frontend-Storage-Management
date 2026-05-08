require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productsRouter = require('./routes/products');
const batchesRouter = require('./routes/batches');
const unitsRouter = require('./routes/units');
const scanRouter = require('./routes/scan');
const dashboardRouter = require('./routes/dashboard');
const foremenRouter = require('./routes/foremen');
const projectsRouter = require('./routes/projects');
const ticketsRouter = require('./routes/tickets');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server and local tools with no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/products', productsRouter);
app.use('/batches', batchesRouter);
app.use('/units', unitsRouter);
app.use('/scan', scanRouter);
app.use('/dashboard', dashboardRouter);
app.use('/foremen', foremenRouter);
app.use('/projects', projectsRouter);
app.use('/tickets', ticketsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(PORT, () => {
  console.log(`Zusim Inventory API running on http://localhost:${PORT}`);
});

module.exports = app;
