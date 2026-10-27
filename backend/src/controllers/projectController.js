// src/controllers/projectController.js
const { knex } = require('../config/db');
const auditLog = require('../utils/auditLog');

/** Create Project (requires auth) */
async function createProject(req, res, next) {
  const { name, description, status = 'active' } = req.body;
  const tenantId = req.user.tenantId;
  try {
    // Enforce project limit
    const tenant = await knex('tenants').where({ id: tenantId }).first();
    const [{ count }] = await knex('projects').where({ tenant_id: tenantId }).count('id');
    if (parseInt(count) >= tenant.max_projects) {
      return res.status(403).json({ success: false, message: 'Project limit reached for subscription plan' });
    }
    const [project] = await knex('projects')
      .insert({ tenant_id: tenantId, name, description, status, created_by: req.user.id })
      .returning('*');
    await auditLog(knex, tenantId, req.user.id, 'CREATE_PROJECT', 'project', project.id);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

/** List Projects */
// List Projects
async function listProjects(req, res, next) {
  const tenantId = req.user.tenantId;
  const { status, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    // Base query scoped to the tenant (explicit column qualification to avoid ambiguity)
    const baseQuery = knex('projects').where('projects.tenant_id', tenantId);
    if (status) baseQuery.andWhere({ status });
    if (search) baseQuery.andWhere('name', 'ilike', `%${search}%`);
    const totalRes = await baseQuery.clone().count('id as cnt').first();
    const projects = await baseQuery
      .clone()
      .leftJoin('users as creator', 'projects.created_by', 'creator.id')
      .select('projects.*', 'creator.full_name as creator_name')
      .orderBy('projects.created_at', 'desc')
      .limit(limit)
      .offset(offset);
    // Add task counts per project
    const projectsWithCounts = await Promise.all(
      projects.map(async p => {
        const [{ cnt: taskCount }] = await knex('tasks').where({ project_id: p.id }).count('id');
        const [{ cnt: completedCount }] = await knex('tasks')
          .where({ project_id: p.id, status: 'completed' })
          .count('id');
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          createdBy: { id: p.created_by, fullName: p.creator_name },
          taskCount: parseInt(taskCount),
          completedTaskCount: parseInt(completedCount),
          createdAt: p.created_at
        };
      })
    );
    res.json({
      success: true,
      data: {
        projects: projectsWithCounts,
        total: parseInt(totalRes.cnt),
        pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalRes.cnt / limit), limit: parseInt(limit) }
      }
    });
  } catch (err) {
    next(err);
  }
}

  const tenantId = req.user.tenantId;
  const { status, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const query = knex('projects').where({ tenant_id: tenantId });
    if (status) query.andWhere({ status });
    if (search) query.andWhere('name', 'ilike', `%${search}%`);
    const totalRes = await query.clone().count('id as cnt').first();
    const projects = await query
      .clone()
      .leftJoin('users as creator', 'projects.created_by', 'creator.id')
      .select('projects.*', 'creator.full_name as creator_name')
      .orderBy('projects.created_at', 'desc')
      .limit(limit)
      .offset(offset);
    // Add task counts per project (sub‑query could be more efficient but fine for demo)
    const projectsWithCounts = await Promise.all(
      projects.map(async p => {
        const [{ cnt: taskCount }] = await knex('tasks').where({ project_id: p.id }).count('id');
        const [{ cnt: completedCount }] = await knex('tasks')
          .where({ project_id: p.id, status: 'completed' })
          .count('id');
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          createdBy: { id: p.created_by, fullName: p.creator_name },
          taskCount: parseInt(taskCount),
          completedTaskCount: parseInt(completedCount),
          createdAt: p.created_at
        };
      })
    );
    res.json({
      success: true,
      data: {
        projects: projectsWithCounts,
        total: parseInt(totalRes.cnt),
        pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalRes.cnt / limit), limit: parseInt(limit) }
      }
    });
  } catch (err) {
    next(err);
  }
}

/** Update Project */
async function updateProject(req, res, next) {
  const { projectId } = req.params;
  const { name, description, status } = req.body;
  const tenantId = req.user.tenantId;
  try {
    const project = await knex('projects').where({ id: projectId }).first();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.tenant_id !== tenantId) return res.status(403).json({ success: false, message: 'Forbidden' });
    // Authorization: tenant_admin OR creator
    if (req.user.role !== 'tenant_admin' && project.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const payload = {};
    if (name) payload.name = name;
    if (description) payload.description = description;
    if (status) payload.status = status;
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    payload.updated_at = knex.fn.now();
    await knex('projects').where({ id: projectId }).update(payload);
    await auditLog(knex, tenantId, req.user.id, 'UPDATE_PROJECT', 'project', projectId);
    const updated = await knex('projects').where({ id: projectId }).first();
    res.json({ success: true, message: 'Project updated', data: updated });
  } catch (err) {
    next(err);
  }
}

/** Delete Project */
async function deleteProject(req, res, next) {
  const { projectId } = req.params;
  const tenantId = req.user.tenantId;
  try {
    const project = await knex('projects').where({ id: projectId }).first();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.tenant_id !== tenantId) return res.status(403).json({ success: false, message: 'Forbidden' });
    if (req.user.role !== 'tenant_admin' && project.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    await knex('projects').where({ id: projectId }).del();
    await auditLog(knex, tenantId, req.user.id, 'DELETE_PROJECT', 'project', projectId);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createProject, listProjects, updateProject, deleteProject };
