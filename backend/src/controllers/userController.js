// src/controllers/userController.js
const { knex } = require('../config/db');
const bcrypt = require('bcryptjs');
const auditLog = require('../utils/auditLog');

/** Add user to tenant (tenant_admin only) */
async function addUser(req, res, next) {
  const { tenantId } = req.params;
  const { email, password, fullName, role = 'user' } = req.body;
  try {
    if (req.user.role !== 'tenant_admin' || req.user.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    // Check subscription user limit
    const tenant = await knex('tenants').where({ id: tenantId }).first();
    const [{ count }] = await knex('users').where({ tenant_id: tenantId }).count('id');
    if (parseInt(count) >= tenant.max_users) {
      return res.status(403).json({ success: false, message: 'Subscription user limit reached' });
    }
    // Unique email per tenant
    const exists = await knex('users').where({ tenant_id: tenantId, email }).first();
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already exists in this tenant' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [newUser] = await knex('users')
      .insert({ tenant_id: tenantId, email, password_hash: passwordHash, full_name: fullName, role, is_active: true })
      .returning('*');
    await auditLog(knex, tenantId, req.user.id, 'CREATE_USER', 'user', newUser.id);
    res.status(201).json({ success: true, message: 'User created', data: {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role,
      tenantId,
      isActive: newUser.is_active,
      createdAt: newUser.created_at
    }});
  } catch (err) {
    next(err);
  }
}

/** List users for a tenant */
async function listUsers(req, res, next) {
  const { tenantId } = req.params;
  const { search, role, page = 1, limit = 50 } = req.query;
  try {
    if (req.user.role !== 'super_admin' && req.user.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const query = knex('users').where({ tenant_id: tenantId });
    if (search) {
      query.andWhere(builder => {
        builder.where('email', 'ilike', `%${search}%`).orWhere('full_name', 'ilike', `%${search}%`);
      });
    }
    if (role) query.andWhere({ role });
    const offset = (page - 1) * limit;
    const totalRes = await query.clone().count('id as cnt').first();
    const users = await query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset);
    res.json({
      success: true,
      data: {
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          fullName: u.full_name,
          role: u.role,
          isActive: u.is_active,
          createdAt: u.created_at
        })),
        total: parseInt(totalRes.cnt),
        pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalRes.cnt / limit), limit: parseInt(limit) }
      }
    });
  } catch (err) {
    next(err);
  }
}

/** Update user */
async function updateUser(req, res, next) {
  const { userId } = req.params;
  const { fullName, role, isActive } = req.body;
  try {
    const targetUser = await knex('users').where({ id: userId }).first();
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
    // Authorization: tenant_admin of same tenant OR self (limited fields)
    if (req.user.role === 'tenant_admin') {
      if (req.user.tenantId !== targetUser.tenant_id) return res.status(403).json({ success: false, message: 'Forbidden' });
    } else if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const payload = {};
    if (fullName) payload.full_name = fullName;
    if (req.user.role === 'tenant_admin') {
      if (role) payload.role = role;
      if (isActive !== undefined) payload.is_active = isActive;
    }
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: 'No updatable fields supplied' });
    }
    payload.updated_at = knex.fn.now();
    await knex('users').where({ id: userId }).update(payload);
    await auditLog(knex, targetUser.tenant_id, req.user.id, 'UPDATE_USER', 'user', userId);
    const updated = await knex('users').where({ id: userId }).first();
    res.json({ success: true, message: 'User updated', data: {
      id: updated.id,
      fullName: updated.full_name,
      role: updated.role,
      isActive: updated.is_active,
      updatedAt: updated.updated_at
    } });
  } catch (err) {
    next(err);
  }
}

/** Delete user (tenant_admin only, cannot delete self) */
async function deleteUser(req, res, next) {
  const { userId } = req.params;
  try {
    if (req.user.role !== 'tenant_admin') return res.status(403).json({ success: false, message: 'Forbidden' });
    const target = await knex('users').where({ id: userId }).first();
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    if (target.id === req.user.id) return res.status(403).json({ success: false, message: 'Cannot delete yourself' });
    if (target.tenant_id !== req.user.tenantId) return res.status(403).json({ success: false, message: 'Forbidden' });
    // Unassign tasks
    await knex('tasks').where({ assigned_to: userId }).update({ assigned_to: null });
    await knex('users').where({ id: userId }).del();
    await auditLog(knex, target.tenant_id, req.user.id, 'DELETE_USER', 'user', userId);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { addUser, listUsers, updateUser, deleteUser };
