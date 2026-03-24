'use strict';
const { Router } = require('express');
const { evaluate, submit } = require('../fabric/connection');
const { requireAdmin } = require('../middleware/auth');

const router = Router();

// GET /api/zones/:h3_9
router.get('/:h3_9', async (req, res) => {
  try {
    const data = await evaluate('GetZonePolicy', [req.params.h3_9]);
    res.json(data);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// GET /api/zones  — list all zone policies
router.get('/', async (req, res) => {
  try {
    const data = await evaluate('ListZonePolicies', []);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/zones  — create/update a zone policy (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      h3_9, zone_class, base_rate_cfa_per_m2, use_multipliers,
      min_tax_cfa, max_tax_cfa, description,
    } = req.body;
    if (!h3_9 || !zone_class) {
      return res.status(400).json({ error: 'h3_9 and zone_class required' });
    }
    const data = await submit('SetZonePolicy', [
      h3_9,
      zone_class,
      String(base_rate_cfa_per_m2 || 0),
      JSON.stringify(use_multipliers || {}),
      String(min_tax_cfa || 0),
      String(max_tax_cfa || 0),
      description || '',
    ], 'municipality');
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
