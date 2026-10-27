// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { knex } = require('../config/db');
const auditLog = require('../utils/auditLog');

// Helper to generate JWT payload
function generateToken(user) {
  const payload = {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
}

/** Register a new tenant and its admin (atomic transaction) */
async function registerTenant(req, res, next) {
  const { tenantName, subdomain, adminEmail, adminPassword, adminFullName } = req.body;
  try {
    // Basic validation (more could be added)
    if (!tenantName || !subdomain || !adminEmail || !adminPassword || !adminFullName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    // Ensure subdomain unique
    const existing = await knex('tenants').where({ subdomain }).first();
    if (existing) {
      return res.status(409).json({ success: false, message: 'Subdomain already exists' });
    }
    // Ensure admin email not used in any tenant
    const emailExists = await knex('users').where({ email: adminEmail }).first();
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'Admin email already exists' });
    }
    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    // Transaction
    await knex.transaction(async trx => {
      const [tenant] = await trx('tenants')
        .insert({
          name: tenantName,
          subdomain,
          status: 'active',
          subscription_plan: 'free',
          max_users: 5,
          max_projects: 3
        })
        .returning('*');
      const [admin] = await trx('users')
        .insert({
          tenant_id: tenant.id,
          email: adminEmail,
          password_hash: passwordHash,
          full_name: adminFullName,
          role: 'tenant_admin',
          is_active: true
        })
        .returning('*');
      // Audit log for tenant creation & admin creation
      await auditLog(trx, tenant.id, admin.id, 'CREATE_TENANT', 'tenant', tenant.id);
      await auditLog(trx, tenant.id, admin.id, 'CREATE_USER', 'user', admin.id);
      const token = generateToken(admin);
      res.status(201).json({
        success: true,
        message: 'Tenant registered successfully',
        data: {
          tenantId: tenant.id,
          subdomain: tenant.subdomain,
          adminUser: {
            id: admin.id,
            email: admin.email,
            fullName: admin.full_name,
            role: admin.role
          },
          token
        }
      });
    });
  } catch (err) {
    next(err);
  }
}

/** User login */
async function login(req, res, next) {
  const { email, password, tenantSubdomain, tenantId } = req.body;
  try {
    // Identify tenant
    let tenant;
    if (tenantSubdomain) {
      tenant = await knex('tenants').where({ subdomain: tenantSubdomain }).first();
    } else if (tenantId) {
      tenant = await knex('tenants').where({ id: tenantId }).first();
    }
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    if (tenant.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Tenant is not active' });
    }
    // Find user within tenant
    const user = await knex('users')
      .where({ email, tenant_id: tenant.id })
      .first();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }
    const token = generateToken(user);
    // Audit login
    await auditLog(knex, tenant.id, user.id, 'LOGIN', 'user', user.id);
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId: tenant.id
        },
        token,
        expiresIn: 86400
      }
    });
  } catch (err) {
    next(err);
  }
}

/** Get current user */
async function me(req, res, next) {
  try {
    const user = await knex('users').where({ id: req.user.id }).first();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const tenant = await knex('tenants').where({ id: user.tenant_id }).first();
    const result = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isActive: user.is_active,
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        subscriptionPlan: tenant.subscription_plan,
        maxUsers: tenant.max_users,
        maxProjects: tenant.max_projects
      } : null
    };
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** Logout (JWT‑only) */
async function logout(req, res) {
  // No server‑side action needed for stateless JWT. Just audit.
  await auditLog(knex, req.user.tenantId, req.user.id, 'LOGOUT', 'user', req.user.id);
  res.json({ success: true, message: 'Logged out successfully' });
}

module.exports = { registerTenant, login, me, logout };
