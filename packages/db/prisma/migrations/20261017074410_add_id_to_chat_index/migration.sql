-- DropIndex
DROP INDEX "chat_userId_updatedAt_idx";

-- CreateIndex
CREATE INDEX "chat_userId_updatedAt_id_idx" ON "chat"("userId", "updatedAt" DESC, "id" DESC);
