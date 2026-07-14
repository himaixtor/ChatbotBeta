/**
 * Single source of truth for Role permission columns.
 * Keep in sync with the Role model in database/prisma/schema.prisma.
 */
const PERMISSION_FIELDS = [
  'can_view_all_chats',
  'can_download',
  'can_manage_users',
  'can_access_dashboard',
  'can_access_train_ai',
  'can_access_token_usage',
  'can_access_scheduler',
  'can_access_license_management',
];

module.exports = { PERMISSION_FIELDS };
