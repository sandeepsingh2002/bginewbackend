const jwt = require('jsonwebtoken');

const authenticate = (...roles) => (req, res, next) => {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    if (roles.length && !roles.includes(payload.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authenticate;
