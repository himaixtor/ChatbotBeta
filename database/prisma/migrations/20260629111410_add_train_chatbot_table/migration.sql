-- CreateTable
CREATE TABLE "TrainChatbot" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_data" BYTEA NOT NULL,
    "ai_response_id" TEXT,
    "trained_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainChatbot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainChatbot_created_at_idx" ON "TrainChatbot"("created_at");

-- CreateIndex
CREATE INDEX "TrainChatbot_is_active_idx" ON "TrainChatbot"("is_active");
