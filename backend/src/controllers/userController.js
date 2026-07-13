/**
 * User management endpoints for admins and roles with can_manage_users.
 */
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { isValidEmail, requireFields } = require('../utils/validators');
const { maskEmail, maskPhone } = require('../utils/masking');

const BCRYPT_ROUNDS = 12;

const userSelect = {
  uid: true,
  email: true,
  name: true,
  role: true,
  contact_number: true,
  is_active: true,
  failed_login_attempts: true,
  locked_until: true,
  created_at: true,
  updated_at: true,
};

async function assertRoleExists(role) {
  const roleExists = await prisma.role.findUnique({ where: { role_name: role } });
  return !!roleExists;
}

async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      select: userSelect,
    });

    const isViewer = req.user?.role === 'viewer';
    const responseData = isViewer
      ? users.map((u) => ({
          ...u,
          email: maskEmail(u.email),
          contact_number: u.contact_number ? maskPhone(u.contact_number) : u.contact_number,
        }))
      : users;

    res.json({ data: responseData });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { email, password, name, role, contact_number, is_active } = req.body;
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
    if (!(await assertRoleExists(role))) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check license limits
    const LicenseService = require('../services/licenseService');
    const licenseStatus = await LicenseService.getLicenseStatus();

    if (licenseStatus.max_users !== undefined) {
      // Count total users (excluding super_admin)
      const totalUsers = await prisma.user.count({
        where: { role: { not: 'super_admin' } }
      });

      if (totalUsers >= licenseStatus.max_users) {
        return res.status(403).json({
          error: 'User limit reached',
          message: `Maximum users allowed: ${licenseStatus.max_users}. Current: ${totalUsers}`
        });
      }
    }

    if (licenseStatus.max_admin_users !== undefined && (role === 'admin' || role === 'Admin')) {
      // Count total admin users
      const adminCount = await prisma.user.count({
        where: { role: { in: ['admin', 'Admin'] } }
      });

      if (adminCount >= licenseStatus.max_admin_users) {
        return res.status(403).json({
          error: 'Admin user limit reached',
          message: `Maximum admin users allowed: ${licenseStatus.max_admin_users}. Current: ${adminCount}`
        });
      }
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password_hash,
        role,
        contact_number: contact_number || null,
        is_active: is_active !== undefined ? !!is_active : true,
      },
      select: userSelect,
    });

    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const { uid } = req.params;
    const { email, password, name, role, contact_number, is_active } = req.body;

    if (email !== undefined && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password !== undefined && password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (role !== undefined && !(await assertRoleExists(role))) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (uid === req.user.uid && is_active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const data = {
      ...(email !== undefined && { email: email.toLowerCase() }),
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(contact_number !== undefined && { contact_number: contact_number || null }),
      ...(is_active !== undefined && { is_active: !!is_active }),
      ...(password !== undefined && {
        password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        failed_login_attempts: 0,
        locked_until: null,
      }),
    };

    const user = await prisma.user.update({
      where: { uid },
      data,
      select: userSelect,
    });

    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    next(error);
  }
}

module.exports = { listUsers, createUser, updateUser };
