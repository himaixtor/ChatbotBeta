/**
 * Authentication: register, login, refresh, logout.
 */
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/jwt');
const { isValidEmail, requireFields } = require('../utils/validators');

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

function setTokenCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
  };
  res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, {
    ...cookieOpts,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function getUserPermissions(roleName) {
  const role = await prisma.role.findUnique({ where: { role_name: roleName } });
  if (!role) return null;
  return {
    can_view_all_chats: role.can_view_all_chats,
    can_download: role.can_download,
    can_manage_users: role.can_manage_users,
  };
}

async function register(req, res, next) {
  try {
    const { email, password, name, role, contact_number } = req.body;
    const missing = requireFields(req.body, ['email', 'password', 'name', 'role']);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const roleExists = await prisma.role.findUnique({ where: { role_name: role } });
    if (!roleExists) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password_hash,
        role,
        contact_number: contact_number || null,
      },
      select: { uid: true, email: true, name: true, role: true },
    });

    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.locked_until && user.locked_until > new Date()) {
      return res.status(423).json({
        error: 'Account temporarily locked. Try again later.',
      });
    }

console.log('[auth/login] user found', {
      uid: user.uid,
      email: user.email,
      is_active: user.is_active,
      locked_until: user.locked_until,
      failed_login_attempts: user.failed_login_attempts,
      role: user.role,
    });

    const valid = await bcrypt.compare(password, user.password_hash);
    console.log('[auth/login] password match?', valid);

    if (!valid) {
      const attempts = user.failed_login_attempts + 1;
      const updateData = { failed_login_attempts: attempts };
      if (attempts >= LOCKOUT_THRESHOLD) {
        updateData.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        updateData.failed_login_attempts = 0;
      }
      await prisma.user.update({ where: { uid: user.uid }, data: updateData });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await prisma.user.update({
      where: { uid: user.uid },
      data: { failed_login_attempts: 0, locked_until: null },
    });

    const payload = { uid: user.uid, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        user_uid: user.uid,
        token_hash: hashToken(refreshToken),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setTokenCookies(res, accessToken, refreshToken);

    const permissions = await getUserPermissions(user.role);

    res.json({
      accessToken,
      refreshToken,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token_hash: hashToken(token) },
    });
    if (!stored || stored.expires_at < new Date()) {
      return res.status(401).json({ error: 'Refresh token revoked or expired' });
    }

    await prisma.refreshToken.delete({ where: { uid: stored.uid } });

    const user = await prisma.user.findUnique({ where: { uid: decoded.uid } });
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found' });
    }

    const payload = { uid: user.uid, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        user_uid: user.uid,
        token_hash: hashToken(newRefreshToken),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setTokenCookies(res, accessToken, newRefreshToken);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({
        where: { token_hash: hashToken(token) },
      });
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, refresh, logout };
