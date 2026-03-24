'use strict';
const { Router } = require('express');
const { evaluate, submit } = require('../fabric/connection');
const { requireWrite } = require('../middleware/auth');

const router = Router();

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const data = await evaluate('GetProperty', [req.params.id]);
    res.json(data);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// GET /api/properties/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const data = await evaluate('GetPropertyHistory', [req.params.id]);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/properties/zone/:h3_9
router.get('/zone/:h3_9', async (req, res) => {
  try {
    const data = await evaluate('QueryByZone', [req.params.h3_9]);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/properties  — register a new property
router.post('/', requireWrite, async (req, res) => {
  try {
    const { id, ...rest } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const data = await submit('RegisterProperty', [id, JSON.stringify(rest)], req.user.org);
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/properties/:id  — update property details
router.patch('/:id', requireWrite, async (req, res) => {
  try {
    const data = await submit('UpdateProperty', [req.params.id, JSON.stringify(req.body)], req.user.org);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/properties/:id/transfer
router.post('/:id/transfer', requireWrite, async (req, res) => {
  try {
    const { new_owner_id, new_owner_name, transfer_type, transfer_price_cfa, notes } = req.body;
    const data = await submit('TransferOwnership', [
      req.params.id,
      new_owner_id, new_owner_name,
      transfer_type || 'sale',
      String(transfer_price_cfa || 0),
      notes || '',
    ], req.user.org);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
