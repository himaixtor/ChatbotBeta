-- Add avatar tracking columns to ChatBot
ALTER TABLE "ChatBot" ADD COLUMN "did_stream_id" TEXT,
ADD COLUMN "did_session_id" TEXT;

-- Create AvatarStream table
CREATE TABLE "AvatarStream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "stream_id" TEXT,
    "session_token" TEXT,
    "connection_signature" TEXT,
    "avatar_mode" TEXT NOT NULL DEFAULT 'text',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    CONSTRAINT "AvatarStream_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ChatBot" ("session_id") ON DELETE CASCADE
);

-- Create AvatarEvent table
CREATE TABLE "AvatarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stream_id" TEXT NOT NULL,
    "session_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvatarEvent_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "AvatarStream" ("id") ON DELETE CASCADE,
    CONSTRAINT "AvatarEvent_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ChatBot" ("session_id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "AvatarStream_session_id_idx" ON "AvatarStream"("session_id");
CREATE INDEX "AvatarStream_stream_id_idx" ON "AvatarStream"("stream_id");
CREATE INDEX "AvatarStream_is_active_idx" ON "AvatarStream"("is_active");
CREATE INDEX "AvatarEvent_stream_id_idx" ON "AvatarEvent"("stream_id");
CREATE INDEX "AvatarEvent_session_id_idx" ON "AvatarEvent"("session_id");
CREATE INDEX "AvatarEvent_event_type_idx" ON "AvatarEvent"("event_type");
