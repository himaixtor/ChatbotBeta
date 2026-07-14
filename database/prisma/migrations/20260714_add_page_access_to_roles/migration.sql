-- Add page-access permission columns to Role
-- (Chat History -> can_view_all_chats and User Management -> can_manage_users already exist)
ALTER TABLE "Role"
  ADD COLUMN IF NOT EXISTS "can_access_dashboard" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_access_train_ai" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_access_token_usage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_access_scheduler" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_access_license_management" BOOLEAN NOT NULL DEFAULT false;

-- super_admin: access to all pages
UPDATE "Role" SET
  "can_access_dashboard" = true,
  "can_access_train_ai" = true,
  "can_access_token_usage" = true,
  "can_access_scheduler" = true,
  "can_access_license_management" = true
WHERE "role_name" = 'super_admin';

-- admin: everything except Train AI and License Management
UPDATE "Role" SET
  "can_access_dashboard" = true,
  "can_access_train_ai" = false,
  "can_access_token_usage" = true,
  "can_access_scheduler" = true,
  "can_access_license_management" = false
WHERE "role_name" = 'admin';

-- viewer / manager: dashboard only (other pages stay false by default)
UPDATE "Role" SET
  "can_access_dashboard" = true
WHERE "role_name" IN ('viewer', 'manager');
