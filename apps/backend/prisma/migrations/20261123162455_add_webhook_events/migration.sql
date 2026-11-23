-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_events_platform_created_at_idx" ON "webhook_events"("platform", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_platform_external_event_id_key" ON "webhook_events"("platform", "external_event_id");
