// src/routes/users.js
const express = require('express');
const { param, body, query } = require('express-validator');
const auth = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { addUser, listUsers, updateUser, deleteUser } = require('../controllers/userController');

const router = express.Router();
router.use(auth);
router.use(tenantIsolation);

// POST /api/tenants/:tenantId/users
router.post('/tenants/:tenantId/users', param('tenantId').isUUID(), body().custom(() => true), addUser);

// GET /api/tenants/:tenantId/users
router.get('/tenants/:tenantId/users', param('tenantId').isUUID(), query().custom(() => true), listUsers);

// PUT /api/users/:userId
router.put('/users/:userId', param('userId').isUUID(), body().custom(() => true), updateUser);

// DELETE /api/users/:userId
router.delete('/users/:userId', param('userId').isUUID(), deleteUser);

module.exports = router;
