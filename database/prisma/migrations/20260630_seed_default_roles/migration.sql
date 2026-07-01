-- Seed default roles with permissions
INSERT INTO "Role" ("uid", "role_name", "can_view_all_chats", "can_download", "can_manage_users", "created_at")
VALUES
  (gen_random_uuid(), 'admin', true, true, true, NOW()),
  (gen_random_uuid(), 'viewer', true, false, false, NOW()),
  (gen_random_uuid(), 'super_admin', true, true, true, NOW())
ON CONFLICT ("role_name") DO NOTHING;
