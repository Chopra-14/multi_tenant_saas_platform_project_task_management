// src/middleware/tenantIsolation.js

/**
 * Middleware that adds a `tenantFilter` object to the request.
 * Controllers can use `req.tenantFilter` in their Knex queries, e.g.:
 *   knex('projects').where(req.tenantFilter)
 * For super_admin the filter is omitted (no tenant restriction).
 */
function tenantIsolation(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthenticated' });
  }
  const { role, tenantId } = req.user;
  if (role === 'super_admin') {
    req.tenantFilter = {}; // No filter → all tenants
  } else {
    req.tenantFilter = { tenant_id: tenantId };
  }
  next();
}

module.exports = tenantIsolation;
