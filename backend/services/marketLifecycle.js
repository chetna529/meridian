// Explicit market state machine. Every transition is validated here and audit-logged by the caller.

const TRANSITIONS = {
  DRAFT: ['PENDING_APPROVAL', 'LIVE', 'CANCELLED'],
  PENDING_APPROVAL: ['LIVE', 'DRAFT', 'CANCELLED'],
  LIVE: ['LOCKED', 'CANCELLED'],
  LOCKED: ['RESOLVING', 'LIVE', 'CANCELLED'],
  RESOLVING: ['RESOLVED', 'LOCKED'],
  RESOLVED: ['DISPUTED', 'ARCHIVED'],
  DISPUTED: ['RESOLVING', 'RESOLVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
};

function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(`Cannot transition market from ${from} to ${to}`);
  }
}

module.exports = { TRANSITIONS, canTransition, assertTransition };
