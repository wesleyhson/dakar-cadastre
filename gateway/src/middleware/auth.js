'use strict';
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

// Roles: municipality (full write), revenue (write taxes), observer (read only)
const WRITE_ROLES = ['municipality', 'revenue'];
const ADMIN_ROLES = ['municipality'];

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireWrite(req, res, next) {
  requireAuth(req, res, () => {
    if (!WRITE_ROLES.includes(req.user.org)) {
      return res.status(403).json({ error: 'Write access denied' });
    }
    next();
  });
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!ADMIN_ROLES.includes(req.user.org)) {
      return res.status(403).json({ error: 'Admin access denied' });
    }
    next();
  });
}

module.exports = { signToken, requireAuth, requireWrite, requireAdmin };
