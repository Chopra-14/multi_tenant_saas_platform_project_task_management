// src/controllers/tenantController.js
const { knex } = require('../config/db');
const auditLog = require('../utils/auditLog');

/** Get tenant details */
async function getTenant(req, res, next) {
  const { tenantId } = req.params;
  try {
    // Super admin can access any tenant; tenant_admin only own
    if (req.user.role !== 'super_admin' && req.user.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const tenant = await knex('tenants').where({ id: tenantId }).first();
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    // Stats
    const [userCount] = await knex('users').where({ tenant_id: tenantId }).count('id as cnt');
    const [projectCount] = await knex('projects').where({ tenant_id: tenantId }).count('id as cnt');
    const [taskCount] = await knex('tasks').where({ tenant_id: tenantId }).count('id as cnt');
    const data = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      status: tenant.status,
      subscriptionPlan: tenant.subscription_plan,
      maxUsers: tenant.max_users,
      maxProjects: tenant.max_projects,
      createdAt: tenant.created_at,
      stats: {
        totalUsers: parseInt(userCount.cnt),
        totalProjects: parseInt(projectCount.cnt),
        totalTasks: parseInt(taskCount.cnt)
      }
    };
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/** Update tenant */
async function updateTenant(req, res, next) {
  const { tenantId } = req.params;
  const updates = req.body;
  try {
    // Determine permissions
    if (req.user.role === 'tenant_admin') {
      // tenant_admin can only update name
      if (updates.name) {
        await knex('tenants').where({ id: tenantId }).update({ name: updates.name, updated_at: knex.fn.now() });
        await auditLog(knex, tenantId, req.user.id, 'UPDATE_TENANT', 'tenant', tenantId);
        return res.json({ success: true, message: 'Tenant updated', data: { id: tenantId, name: updates.name } });
      }
      return res.status(403).json({ success: false, message: 'Tenant admin cannot modify other fields' });
    }
    if (req.user.role === 'super_admin') {
      // Super admin can update any field
      const allowed = ['name', 'status', 'subscription_plan', 'max_users', 'max_projects'];
      const payload = {};
      allowed.forEach(f => { if (updates[f] !== undefined) payload[f] = updates[f]; });
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
      }
      payload.updated_at = knex.fn.now();
      await knex('tenants').where({ id: tenantId }).update(payload);
      await auditLog(knex, tenantId, req.user.id, 'UPDATE_TENANT', 'tenant', tenantId);
      return res.json({ success: true, message: 'Tenant updated', data: { id: tenantId, ...payload } });
    }
    return res.status(403).json({ success: false, message: 'Forbidden' });
  } catch (err) {
    next(err);
  }
}

/** List all tenants (super_admin only) */
async function listTenants(req, res, next) {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Only super_admin can list tenants' });
  }
  const { page = 1, limit = 10, status, subscriptionPlan } = req.query;
  const offset = (page - 1) * limit;
  try {
    const query = knex('tenants');
    if (status) query.where({ status });
    if (subscriptionPlan) query.where({ subscription_plan: subscriptionPlan });
    const total = await query.clone().count('id as cnt').first();
    const tenants = await query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset);
    // Append stats for each tenant (could be optimized with subqueries)
    const tenantsWithStats = await Promise.all(
      tenants.map(async t => {
        const [userCount] = await knex('users').where({ tenant_id: t.id }).count('id as cnt');
        const [projectCount] = await knex('projects').where({ tenant_id: t.id }).count('id as cnt');
        return { ...t, totalUsers: parseInt(userCount.cnt), totalProjects: parseInt(projectCount.cnt) };
      })
    );
    const totalPages = Math.ceil(total.cnt / limit);
    res.json({
      success: true,
      data: {
        tenants: tenantsWithStats,
        pagination: { currentPage: parseInt(page), totalPages, totalTenants: parseInt(total.cnt), limit: parseInt(limit) }
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTenant, updateTenant, listTenants };
