-- Smart Inbox: priority score + next best action per conversation
ALTER TABLE "conversations" ADD COLUMN "priority_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "conversations" ADD COLUMN "next_best_action" TEXT;

CREATE INDEX "conversations_tenant_id_priority_score_idx" ON "conversations"("tenant_id", "priority_score");
