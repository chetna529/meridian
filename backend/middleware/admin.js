function requireAdmin(req, res, next) {
  // Prefer explicit isAdmin flag from JWT payload
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAdmin };