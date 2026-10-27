// src/routes/tenants.js
const express = require('express');
const { param, body, query } = require('express-validator');
const auth = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const rbac = require('../middleware/rbac');
const { getTenant, updateTenant, listTenants } = require('../controllers/tenantController');

const router = express.Router();

// All tenant routes require authentication & tenant isolation (except list which super_admin only)
router.use(auth);
router.use(tenantIsolation);

// GET /api/tenants/:tenantId
router.get('/:tenantId', param('tenantId').isUUID(), getTenant);

// PUT /api/tenants/:tenantId
router.put('/:tenantId', param('tenantId').isUUID(), body().custom(() => true), updateTenant);

// GET /api/tenants (super_admin only)
router.get('/', rbac(['super_admin']), listTenants);

module.exports = router;
