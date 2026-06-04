-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "is_welcome" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ChatBot" ADD COLUMN     "is_focus" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Chat_is_welcome_idx" ON "Chat"("is_welcome");

-- CreateIndex
CREATE INDEX "ChatBot_is_focus_idx" ON "ChatBot"("is_focus");
