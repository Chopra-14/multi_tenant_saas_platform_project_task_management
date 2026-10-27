// src/routes/projects.js
const express = require('express');
const { param, body, query } = require('express-validator');
const auth = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { createProject, listProjects, updateProject, deleteProject } = require('../controllers/projectController');

const router = express.Router();
router.use(auth);
router.use(tenantIsolation);

// POST /api/projects
router.post('/', body('name').isString().notEmpty(), body().custom(() => true), createProject);

// GET /api/projects
router.get('/', query().custom(() => true), listProjects);

// PUT /api/projects/:projectId
router.put('/:projectId', param('projectId').isUUID(), body().custom(() => true), updateProject);

// DELETE /api/projects/:projectId
router.delete('/:projectId', param('projectId').isUUID(), deleteProject);

module.exports = router;
