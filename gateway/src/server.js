'use strict';
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const { signToken } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/properties',   require('./routes/properties'));
app.use('/api/taxes',        require('./routes/taxes'));
app.use('/api/disbursements',require('./routes/disbursements'));
app.use('/api/zones',        require('./routes/zones'));

// ── Auth token endpoint (dev: accepts any org claim) ───────────────────────
// In production, replace with real identity verification (CA enrollment)
app.post('/api/auth/token', (req, res) => {
  const { org, user } = req.body;
  const validOrgs = ['municipality', 'revenue', 'observer'];
  if (!org || !validOrgs.includes(org)) {
    return res.status(400).json({ error: `org must be one of: ${validOrgs.join(', ')}` });
  }
  const token = signToken({ org, user: user || `admin@${org}` });
  res.json({ token, org, expires_in: process.env.JWT_EXPIRES_IN || '8h' });
});

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    channel: process.env.CHANNEL_ID || 'dakar-cadastre',
    chaincode: process.env.CHAINCODE_NAME || 'cadastre',
    peer: process.env.PEER_ENDPOINT || 'localhost:7051',
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Dakar Cadastre Gateway',
    version: '1.0.0',
    endpoints: [
      'GET  /health',
      'POST /api/auth/token',
      'GET  /api/properties/:id',
      'GET  /api/properties/:id/history',
      'GET  /api/properties/zone/:h3_9',
      'POST /api/properties           [write]',
      'PATCH /api/properties/:id      [write]',
      'POST /api/properties/:id/transfer [write]',
      'GET  /api/taxes/:propertyId',
      'GET  /api/taxes/summary/:year',
      'POST /api/taxes/assess         [write]',
      'POST /api/taxes/:id/pay        [write]',
      'GET  /api/disbursements',
      'GET  /api/disbursements/:id',
      'GET  /api/disbursements/summary/:year',
      'POST /api/disbursements        [admin]',
      'POST /api/disbursements/:id/complete [admin]',
      'GET  /api/zones',
      'GET  /api/zones/:h3_9',
      'POST /api/zones                [admin]',
    ],
  });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Dakar Cadastre Gateway  →  http://localhost:${PORT}`);
  console.log(`  Channel   : ${process.env.CHANNEL_ID || 'dakar-cadastre'}`);
  console.log(`  Chaincode : ${process.env.CHAINCODE_NAME || 'cadastre'}`);
  console.log(`  Peer      : ${process.env.PEER_ENDPOINT || 'localhost:7051'}`);
});
