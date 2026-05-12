const { ValidationError } = require('./errorHandler');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
    if (error) {
      const message = error.details.map(d => d.message).join(', ');
      return next(new ValidationError(message));
    }
    if (source === 'query') req.query = value;
    else if (source === 'params') req.params = value;
    else req.body = value;
    next();
  };
}

module.exports = validate;
