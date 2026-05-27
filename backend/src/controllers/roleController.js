/**
 * Role CRUD — admin only.
 */
const prisma = require('../utils/prisma');

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
    const { role_name, can_view_all_chats, can_download, can_manage_users } = req.body;
    if (!role_name) {
      return res.status(400).json({ error: 'role_name is required' });
    }

    const role = await prisma.role.create({
      data: {
        role_name: role_name.toLowerCase(),
        can_view_all_chats: !!can_view_all_chats,
        can_download: !!can_download,
        can_manage_users: !!can_manage_users,
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
    const { can_view_all_chats, can_download, can_manage_users, role_name } = req.body;

    const role = await prisma.role.update({
      where: { uid },
      data: {
        ...(role_name !== undefined && { role_name: role_name.toLowerCase() }),
        ...(can_view_all_chats !== undefined && { can_view_all_chats }),
        ...(can_download !== undefined && { can_download }),
        ...(can_manage_users !== undefined && { can_manage_users }),
      },
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
