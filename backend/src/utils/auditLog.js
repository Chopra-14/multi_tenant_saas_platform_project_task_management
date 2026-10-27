// src/utils/auditLog.js
/**
 * Generic audit logger.
 * @param {object} trx - Knex transaction (or knex instance) to use.
 * @param {string} tenantId - Tenant ID the action belongs to.
 * @param {string} userId - ID of the user performing the action.
 * @param {string} action - Action name (e.g., 'CREATE_USER').
 * @param {string} entityType - Type of entity (e.g., 'user', 'project').
 * @param {string} entityId - ID of the affected entity.
 */
async function auditLog(trx, tenantId, userId, action, entityType, entityId) {
  const ip = '0.0.0.0'; // placeholder – can be replaced with req.ip in controllers.
  await trx('audit_logs').insert({
    tenant_id: tenantId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    ip_address: ip
  });
}

module.exports = auditLog;
