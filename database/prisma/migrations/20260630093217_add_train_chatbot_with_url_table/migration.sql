-- CreateTable
CREATE TABLE "TrainChatbotWithUrl" (
    "id" TEXT NOT NULL,
    "page_name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ai_response_id" TEXT,
    "trained_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainChatbotWithUrl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainChatbotWithUrl_created_at_idx" ON "TrainChatbotWithUrl"("created_at");

-- CreateIndex
CREATE INDEX "TrainChatbotWithUrl_is_active_idx" ON "TrainChatbotWithUrl"("is_active");

-- CreateIndex
CREATE INDEX "TrainChatbotWithUrl_url_idx" ON "TrainChatbotWithUrl"("url");
