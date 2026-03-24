'use strict';
const { Router } = require('express');
const { evaluate, submit } = require('../fabric/connection');
const { requireAdmin } = require('../middleware/auth');

const router = Router();

// GET /api/disbursements  — all disbursements (public, read-only)
router.get('/', async (req, res) => {
  try {
    const data = await evaluate('ListDisbursements', []);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/disbursements/:id
router.get('/:id', async (req, res) => {
  try {
    const data = await evaluate('GetDisbursement', [req.params.id]);
    res.json(data);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// GET /api/disbursements/summary/:year  — totals by category
router.get('/summary/:year', async (req, res) => {
  try {
    const data = await evaluate('GetDisbursementSummary', [req.params.year]);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/disbursements  — record a spend (municipality admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      id, amount_cfa, category, description,
      contractor_name, evidence_hash, zone_h3_9,
    } = req.body;
    if (!id || !amount_cfa || !category) {
      return res.status(400).json({ error: 'id, amount_cfa, and category are required' });
    }
    const data = await submit('RecordDisbursement', [
      id,
      String(amount_cfa),
      category,
      description || '',
      contractor_name || '',
      evidence_hash || '',
      zone_h3_9 || '',
    ], 'municipality');
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/disbursements/:id/complete  — mark completed with evidence
router.post('/:id/complete', requireAdmin, async (req, res) => {
  try {
    const { evidence_hash, completion_notes } = req.body;
    const data = await submit('CompleteDisbursement', [
      req.params.id,
      evidence_hash || '',
      completion_notes || '',
    ], 'municipality');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
