/**
 * Role CRUD — admin only.
 */
const prisma = require('../utils/prisma');
const { PERMISSION_FIELDS } = require('../utils/permissions');

async function listRoles(req, res, next) {
  try {
    const roles = await prisma.role.findMany({ orderBy: { role_name: 'asc' } });
    res.json({ data: roles });
  } catch (error) {
    next(error);
  }
}

async function createRole(req, res, next) {
  try {
    const { role_name } = req.body;
    if (!role_name) {
      return res.status(400).json({ error: 'role_name is required' });
    }

    const permissions = {};
    for (const field of PERMISSION_FIELDS) {
      permissions[field] = !!req.body[field];
    }

    const role = await prisma.role.create({
      data: {
        role_name: role_name.toLowerCase(),
        ...permissions,
      },
    });
    res.status(201).json(role);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Role already exists' });
    }
    next(error);
  }
}

async function updateRole(req, res, next) {
  try {
    const { uid } = req.params;
    const { role_name } = req.body;

    const existing = await prisma.role.findUnique({ where: { uid } });
    if (!existing) {
      return res.status(404).json({ error: 'Role not found' });
    }
    if (existing.role_name === req.user.role) {
      return res.status(403).json({ error: "You cannot modify your own role's permissions" });
    }

    const data = {
      ...(role_name !== undefined && { role_name: role_name.toLowerCase() }),
    };
    for (const field of PERMISSION_FIELDS) {
      if (req.body[field] !== undefined) {
        data[field] = !!req.body[field];
      }
    }

    const role = await prisma.role.update({
      where: { uid },
      data,
    });
    res.json(role);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Role not found' });
    }
    next(error);
  }
}

async function deleteRole(req, res, next) {
  try {
    const { uid } = req.params;
    const role = await prisma.role.findUnique({ where: { uid } });
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const usersWithRole = await prisma.user.count({
      where: { role: role.role_name },
    });
    if (usersWithRole > 0) {
      return res.status(400).json({
        error: `Cannot delete role: ${usersWithRole} user(s) assigned`,
      });
    }

    await prisma.role.delete({ where: { uid } });
    res.json({ message: 'Role deleted' });
  } catch (error) {
    next(error);
  }
}

module.exports = { listRoles, createRole, updateRole, deleteRole };
