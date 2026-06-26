/**
 * Authentication: register, login, refresh, logout, 2FA setup, 2FA verify.
 */
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const axios = require('axios');
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
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) {
    console.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification');
    return true;
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: token,
        },
      }
    );

    return response.data.success && response.data.score > 0.5;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return false;
  }
}

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
    const { email, password, captchaToken } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Verify CAPTCHA
    if (captchaToken) {
      const captchaValid = await verifyRecaptcha(captchaToken);
      if (!captchaValid) {
        return res.status(400).json({ error: 'CAPTCHA verification failed' });
      }
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

    // Check if 2FA is enabled
    if (user.two_fa_enabled) {
      // Return a temporary token for 2FA verification
      const tempPayload = { uid: user.uid, email: user.email, type: '2fa-temp' };
      const tempToken = signAccessToken(tempPayload);
      return res.json({
        requires2FA: true,
        tempToken,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
        },
      });
    }

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

async function setup2FA(req, res, next) {
  try {
    const { uid } = req.user;
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.two_fa_enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    const secret = speakeasy.generateSecret({
      name: `Chatbot Admin (${user.email})`,
      length: 32,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes (8 codes for recovery)
    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    res.json({
      secret: secret.base32,
      qrCode,
      backupCodes,
    });
  } catch (error) {
    next(error);
  }
}

async function confirm2FA(req, res, next) {
  try {
    const { uid } = req.user;
    const { token, secret, backupCodes } = req.body;

    if (!token || !secret || !backupCodes) {
      return res.status(400).json({ error: 'Token, secret, and backup codes required' });
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }

    const backupCodesStr = backupCodes.join(',');
    await prisma.user.update({
      where: { uid },
      data: {
        two_fa_enabled: true,
        two_fa_secret: secret,
        two_fa_backup_codes: backupCodesStr,
      },
    });

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    next(error);
  }
}

async function verify2FA(req, res, next) {
  try {
    const { uid, email } = req.user;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: '2FA token required' });
    }

    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if token is a backup code
    if (user.two_fa_backup_codes) {
      const backupCodes = user.two_fa_backup_codes.split(',');
      if (backupCodes.includes(token.toUpperCase())) {
        // Remove used backup code
        const newBackupCodes = backupCodes.filter((c) => c !== token.toUpperCase()).join(',');
        await prisma.user.update({
          where: { uid },
          data: { two_fa_backup_codes: newBackupCodes || null },
        });

        // Continue with normal login flow
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

        return res.json({
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
      }
    }

    // Verify TOTP
    const verified = speakeasy.totp.verify({
      secret: user.two_fa_secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    // Login successful
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

module.exports = { register, login, refresh, logout, setup2FA, confirm2FA, verify2FA };
