-- Insert default roles
INSERT INTO "Role" ("uid", "role_name", "can_view_all_chats", "can_download", "can_manage_users", "created_at")
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid as uid,
  'admin'::text,
  true::boolean,
  true::boolean,
  true::boolean,
  NOW()::timestamp
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "role_name" = 'admin');

INSERT INTO "Role" ("uid", "role_name", "can_view_all_chats", "can_download", "can_manage_users", "created_at")
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid as uid,
  'viewer'::text,
  true::boolean,
  false::boolean,
  false::boolean,
  NOW()::timestamp
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "role_name" = 'viewer');

INSERT INTO "Role" ("uid", "role_name", "can_view_all_chats", "can_download", "can_manage_users", "created_at")
SELECT
  md5(random()::text || clock_timestamp()::text)::uuid as uid,
  'super_admin'::text,
  true::boolean,
  true::boolean,
  true::boolean,
  NOW()::timestamp
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "role_name" = 'super_admin');
