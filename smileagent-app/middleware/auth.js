// Middleware di autenticazione
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.studioId) {
    return next();
  }
  res.redirect('/login');
};

// Middleware per verificare se già loggato
const isGuest = (req, res, next) => {
  if (req.session && req.session.studioId) {
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = {
  isAuthenticated,
  isGuest
};
