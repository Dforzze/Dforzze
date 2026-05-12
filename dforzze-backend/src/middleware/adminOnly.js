const { ForbiddenError } = require('./errorHandler');

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new ForbiddenError('Acceso restringido a administradores'));
  }
  next();
}

module.exports = adminOnly;
