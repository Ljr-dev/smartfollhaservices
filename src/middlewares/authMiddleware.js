function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  return next();
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session.user) {
    return res.redirect('/admin');
  }
  return next();
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated
};
