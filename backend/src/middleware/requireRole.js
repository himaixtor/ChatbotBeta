/**
 * Role-based access — checks user.role against allowed role names.
 */
const prisma = require('../utils/prisma');

/**
 * @param {...string} allowedRoles - e.g. 'admin', 'manager'
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user?.role) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Load role permissions from DB for fine-grained checks */
async function loadRolePermissions(roleName) {
  return prisma.role.findUnique({
    where: { role_name: roleName },
  });
}

function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      const role = await loadRolePermissions(req.user.role);
      if (!role || !role[permissionKey]) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      req.rolePermissions = role;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { requireRole, requirePermission, loadRolePermissions };
