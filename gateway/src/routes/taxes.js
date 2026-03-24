'use strict';
const { Router } = require('express');
const { evaluate, submit } = require('../fabric/connection');
const { requireWrite } = require('../middleware/auth');

const router = Router();

// GET /api/taxes/:propertyId
router.get('/:propertyId', async (req, res) => {
  try {
    const data = await evaluate('GetTaxRecord', [req.params.propertyId]);
    res.json(data);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// POST /api/taxes/assess  — create annual assessment
router.post('/assess', requireWrite, async (req, res) => {
  try {
    const { property_id, year, assessed_value_cfa, tax_amount_cfa, notes } = req.body;
    if (!property_id || !year) return res.status(400).json({ error: 'property_id and year required' });
    const data = await submit('CreateAssessment', [
      property_id,
      String(year),
      String(assessed_value_cfa || 0),
      String(tax_amount_cfa || 0),
      notes || '',
    ], req.user.org);
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/taxes/:propertyId/pay
router.post('/:propertyId/pay', requireWrite, async (req, res) => {
  try {
    const { year, amount_paid_cfa, payment_method, receipt_ref } = req.body;
    if (!year) return res.status(400).json({ error: 'year required' });
    const data = await submit('RecordPayment', [
      req.params.propertyId,
      String(year),
      String(amount_paid_cfa || 0),
      payment_method || 'cash',
      receipt_ref || '',
    ], req.user.org);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/taxes/summary/:year  — zone-level aggregates
router.get('/summary/:year', async (req, res) => {
  try {
    const data = await evaluate('GetYearSummary', [req.params.year]);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
