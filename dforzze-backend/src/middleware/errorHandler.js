const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) { super(message, 400); }
}

class AuthError extends AppError {
  constructor(message = 'No autorizado') { super(message, 401); }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') { super(message, 403); }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') { super(message, 404); }
}

class ConflictError extends AppError {
  constructor(message) { super(message, 409); }
}

class StockError extends ConflictError {
  constructor(message, items = []) {
    super(message);
    this.items = items;
  }
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  if (!isOperational) {
    logger.error('Error no operacional:', { error: err.message, stack: err.stack, url: req.url, method: req.method });
  }

  const response = { success: false, error: err.message || 'Error interno del servidor' };
  if (err.items) response.data = { items: err.items };

  res.status(statusCode).json(response);
}

module.exports = { errorHandler, AppError, ValidationError, AuthError, ForbiddenError, NotFoundError, ConflictError, StockError };
