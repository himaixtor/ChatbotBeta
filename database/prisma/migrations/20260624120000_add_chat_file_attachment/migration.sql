-- AlterTable
ALTER TABLE "Chat" ADD COLUMN "file_name" TEXT,
ADD COLUMN "file_mime_type" TEXT,
ADD COLUMN "file_data" BYTEA;
