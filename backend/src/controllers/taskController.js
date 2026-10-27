// src/controllers/taskController.js
const { knex } = require('../config/db');
const auditLog = require('../utils/auditLog');

/** Create Task (under a project) */
async function createTask(req, res, next) {
  const { projectId } = req.params;
  const { title, description, assignedTo, priority = 'medium', dueDate } = req.body;
  const userId = req.user.id;
  try {
    // Verify project exists and belongs to tenant
    const project = await knex('projects').where({ id: projectId }).first();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.tenant_id !== req.user.tenantId) return res.status(403).json({ success: false, message: 'Forbidden' });
    // If assignedTo provided, verify user belongs to same tenant
    let assignedToId = null;
    if (assignedTo) {
      const assignee = await knex('users').where({ id: assignedTo, tenant_id: req.user.tenantId }).first();
      if (!assignee) return res.status(400).json({ success: false, message: 'Assigned user does not belong to tenant' });
      assignedToId = assignee.id;
    }
    const [task] = await knex('tasks')
      .insert({
        project_id: projectId,
        tenant_id: project.tenant_id, // use tenant from project as per spec
        title,
        description,
        priority,
        assigned_to: assignedToId,
        due_date: dueDate ? new Date(dueDate) : null
      })
      .returning('*');
    await auditLog(knex, project.tenant_id, userId, 'CREATE_TASK', 'task', task.id);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
}

/** List tasks for a project */
async function listProjectTasks(req, res, next) {
  const { projectId } = req.params;
  const { status, assignedTo, priority, search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const project = await knex('projects').where({ id: projectId }).first();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.tenant_id !== req.user.tenantId) return res.status(403).json({ success: false, message: 'Forbidden' });
    const query = knex('tasks')
      .where({ project_id: projectId })
      .andWhere({ tenant_id: req.user.tenantId });
    if (status) query.andWhere({ status });
    if (priority) query.andWhere({ priority });
    if (assignedTo) query.andWhere({ assigned_to: assignedTo });
    if (search) query.andWhere('title', 'ilike', `%${search}%`);
    const totalRes = await query.clone().count('id as cnt').first();
    const tasks = await query
      .clone()
      .leftJoin('users as assignee', 'tasks.assigned_to', 'assignee.id')
      .select('tasks.*', 'assignee.full_name as assignee_name', 'assignee.email as assignee_email')
      .orderBy('priority', 'desc')
      .orderBy('due_date', 'asc')
      .limit(limit)
      .offset(offset);
    const formatted = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assignedTo: t.assigned_to ? { id: t.assigned_to, fullName: t.assignee_name, email: t.assignee_email } : null,
      dueDate: t.due_date,
      createdAt: t.created_at
    }));
    res.json({
      success: true,
      data: {
        tasks: formatted,
        total: parseInt(totalRes.cnt),
        pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalRes.cnt / limit), limit: parseInt(limit) }
      }
    });
  } catch (err) {
    next(err);
  }
}

/** Update Task (full update) */
async function updateTask(req, res, next) {
  const { taskId } = req.params;
  const { title, description, status, priority, assignedTo, dueDate } = req.body;
  try {
    const task = await knex('tasks').where({ id: taskId }).first();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.tenant_id !== req.user.tenantId) return res.status(403).json({ success: false, message: 'Forbidden' });
    const payload = {};
    if (title) payload.title = title;
    if (description) payload.description = description;
    if (status) payload.status = status;
    if (priority) payload.priority = priority;
    if (dueDate !== undefined) payload.due_date = dueDate ? new Date(dueDate) : null;
    if (assignedTo !== undefined) {
      if (assignedTo === null) {
        payload.assigned_to = null;
      } else {
        const assignee = await knex('users').where({ id: assignedTo, tenant_id: req.user.tenantId }).first();
        if (!assignee) return res.status(400).json({ success: false, message: 'Assigned user not in tenant' });
        payload.assigned_to = assignee.id;
      }
    }
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    payload.updated_at = knex.fn.now();
    await knex('tasks').where({ id: taskId }).update(payload);
    await auditLog(knex, req.user.tenantId, req.user.id, 'UPDATE_TASK', 'task', taskId);
    const updated = await knex('tasks').where({ id: taskId }).first();
    res.json({ success: true, message: 'Task updated', data: updated });
  } catch (err) {
    next(err);
  }
}

/** Patch Task status */
async function patchTaskStatus(req, res, next) {
  const { taskId } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
  try {
    const task = await knex('tasks').where({ id: taskId }).first();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.tenant_id !== req.user.tenantId) return res.status(403).json({ success: false, message: 'Forbidden' });
    await knex('tasks').where({ id: taskId }).update({ status, updated_at: knex.fn.now() });
    await auditLog(knex, req.user.tenantId, req.user.id, 'UPDATE_TASK_STATUS', 'task', taskId);
    const updated = await knex('tasks').where({ id: taskId }).first();
    res.json({ success: true, data: { id: updated.id, status: updated.status, updatedAt: updated.updated_at } });
  } catch (err) {
    next(err);
  }
}

/** Delete Task */
async function deleteTask(req, res, next) {
  const { taskId } = req.params;
  try {
    const task = await knex('tasks').where({ id: taskId }).first();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.tenant_id !== req.user.tenantId) return res.status(403).json({ success: false, message: 'Forbidden' });
    await knex('tasks').where({ id: taskId }).del();
    await auditLog(knex, req.user.tenantId, req.user.id, 'DELETE_TASK', 'task', taskId);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createTask, listProjectTasks, updateTask, patchTaskStatus, deleteTask };
