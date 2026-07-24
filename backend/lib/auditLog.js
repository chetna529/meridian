// Every admin mutation should call record() so there's a trail independent of application logs.

async function record(tx, { adminId, action, entityType, entityId, changes }) {
  return tx.auditLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId: entityId || null,
      changes: changes || undefined,
    },
  });
}

module.exports = { record };
