-- CreateTable
CREATE TABLE "chat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "unread" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_userId_updatedAt_idx" ON "chat"("userId", "updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
