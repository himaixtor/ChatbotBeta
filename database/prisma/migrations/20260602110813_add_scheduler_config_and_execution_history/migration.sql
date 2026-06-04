-- CreateTable
CREATE TABLE "SchedulerConfig" (
    "id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "details" TEXT,
    "run_timing" TEXT,
    "cron_expression" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulerExecutionHistory" (
    "id" TEXT NOT NULL,
    "scheduler_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_deleted" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchedulerExecutionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchedulerExecutionHistory_scheduler_id_idx" ON "SchedulerExecutionHistory"("scheduler_id");

-- CreateIndex
CREATE INDEX "SchedulerExecutionHistory_created_at_idx" ON "SchedulerExecutionHistory"("created_at");

-- CreateIndex
CREATE INDEX "SchedulerExecutionHistory_status_idx" ON "SchedulerExecutionHistory"("status");

-- AddForeignKey
ALTER TABLE "SchedulerExecutionHistory" ADD CONSTRAINT "SchedulerExecutionHistory_scheduler_id_fkey" FOREIGN KEY ("scheduler_id") REFERENCES "SchedulerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
