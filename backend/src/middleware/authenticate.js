/**
 * Verify JWT access token from Authorization header or accessToken cookie.
 */
const { verifyAccessToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyAccessToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticate;
