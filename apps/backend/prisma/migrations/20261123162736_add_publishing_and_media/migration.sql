-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PENDING', 'SCHEDULED', 'PROCESSING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'PARTIALLY_PUBLISHED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "s3_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "folder" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration_sec" INTEGER,
    "upload_status" TEXT NOT NULL DEFAULT 'READY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_targets" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "social_account_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "caption" TEXT,
    "external_post_id" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishing_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "target_id" UUID,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publishing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_workspace_id_idx" ON "media_assets"("workspace_id");

-- CreateIndex
CREATE INDEX "social_posts_workspace_id_status_idx" ON "social_posts"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "social_posts_scheduled_at_idx" ON "social_posts"("scheduled_at");

-- CreateIndex
CREATE INDEX "post_targets_post_id_idx" ON "post_targets"("post_id");

-- CreateIndex
CREATE INDEX "post_targets_social_account_id_idx" ON "post_targets"("social_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_media_post_id_media_asset_id_key" ON "post_media"("post_id", "media_asset_id");

-- CreateIndex
CREATE INDEX "publishing_logs_workspace_id_post_id_idx" ON "publishing_logs"("workspace_id", "post_id");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_targets" ADD CONSTRAINT "post_targets_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_targets" ADD CONSTRAINT "post_targets_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
