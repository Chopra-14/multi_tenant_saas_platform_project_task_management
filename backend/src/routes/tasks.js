// src/routes/tasks.js
const express = require('express');
const router = express.Router({ mergeParams: true }); // allow :projectId from parent if needed

const { createTask, listProjectTasks, updateTask, patchTaskStatus, deleteTask } = require('../controllers/taskController');
const auth = require('../middleware/auth'); // JWT auth middleware

// All task routes require authentication
router.use(auth);

// Create a task under a project
router.post('/:projectId', createTask);
// List tasks for a project
router.get('/:projectId', listProjectTasks);

// Operations on a specific task (taskId param)
router.put('/:taskId', updateTask);
router.patch('/:taskId/status', patchTaskStatus);
router.delete('/:taskId', deleteTask);

module.exports = router;
