-- CreateTable
CREATE TABLE "User" (
    "uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "contact_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "uid" TEXT NOT NULL,
    "user_uid" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Role" (
    "uid" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "can_view_all_chats" BOOLEAN NOT NULL DEFAULT false,
    "can_download" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_users" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "ChatBot" (
    "session_id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "chat_language" TEXT,
    "interested_in" TEXT,
    "lead_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatBot_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "response_type" TEXT NOT NULL,
    "message_text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_count" INTEGER,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_hash_key" ON "RefreshToken"("token_hash");

-- CreateIndex
CREATE INDEX "RefreshToken_user_uid_idx" ON "RefreshToken"("user_uid");

-- CreateIndex
CREATE UNIQUE INDEX "Role_role_name_key" ON "Role"("role_name");

-- CreateIndex
CREATE INDEX "ChatBot_email_idx" ON "ChatBot"("email");

-- CreateIndex
CREATE INDEX "ChatBot_created_at_idx" ON "ChatBot"("created_at");

-- CreateIndex
CREATE INDEX "ChatBot_lead_generated_idx" ON "ChatBot"("lead_generated");

-- CreateIndex
CREATE INDEX "ChatBot_chat_language_idx" ON "ChatBot"("chat_language");

-- CreateIndex
CREATE INDEX "Chat_session_id_timestamp_idx" ON "Chat"("session_id", "timestamp");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_uid_fkey" FOREIGN KEY ("user_uid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ChatBot"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
