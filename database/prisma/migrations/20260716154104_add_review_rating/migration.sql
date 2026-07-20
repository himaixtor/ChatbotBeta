-- Remove did_stream_id and did_session_id columns from ChatBot
ALTER TABLE "ChatBot" DROP COLUMN IF EXISTS "did_stream_id";
ALTER TABLE "ChatBot" DROP COLUMN IF EXISTS "did_session_id";

-- Add review_rating column to ChatBot
ALTER TABLE "ChatBot" ADD COLUMN "review_rating" INTEGER;
