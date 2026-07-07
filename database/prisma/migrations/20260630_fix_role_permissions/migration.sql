-- Fix NULL boolean values in Role permissions, set them to false
UPDATE "Role" SET "can_view_all_chats" = false WHERE "can_view_all_chats" IS NULL;
UPDATE "Role" SET "can_download" = false WHERE "can_download" IS NULL;
UPDATE "Role" SET "can_manage_users" = false WHERE "can_manage_users" IS NULL;

-- Ensure all boolean columns are NOT NULL
ALTER TABLE "Role" ALTER COLUMN "can_view_all_chats" SET NOT NULL DEFAULT false;
ALTER TABLE "Role" ALTER COLUMN "can_download" SET NOT NULL DEFAULT false;
ALTER TABLE "Role" ALTER COLUMN "can_manage_users" SET NOT NULL DEFAULT false;
