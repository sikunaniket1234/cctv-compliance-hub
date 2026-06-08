const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';

module.exports = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = authorization.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.organizationId = payload.organizationId;
    req.role = payload.role || 'ngo';
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
