// src/routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const { registerTenant, login, me, logout } = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

// Register Tenant (public)
router.post(
  '/register-tenant',
  [
    body('tenantName').isString().notEmpty(),
    body('subdomain').isString().matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/),
    body('adminEmail').isEmail(),
    body('adminPassword').isLength({ min: 8 }),
    body('adminFullName').isString().notEmpty()
  ],
  registerTenant
);

// Login (public)
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').isString().notEmpty(),
    body('tenantSubdomain').optional().isString()
  ],
  login
);

// Get current user (protected)
router.get('/me', auth, me);

// Logout (protected)
router.post('/logout', auth, logout);

module.exports = router;
