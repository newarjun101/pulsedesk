-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK');

-- CreateEnum
CREATE TYPE "ConnectionMethod" AS ENUM ('OAUTH', 'MANUAL');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "CapabilityStatus" AS ENUM ('SUPPORTED', 'UNSUPPORTED', 'REQUIRES_PERMISSION', 'REQUIRES_APPROVAL', 'ACCOUNT_INELIGIBLE', 'TEMPORARILY_UNAVAILABLE');

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platform_account_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "username" TEXT,
    "profile_picture_url" TEXT,
    "connection_method" "ConnectionMethod" NOT NULL,
    "connection_status" "ConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "last_validated_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_account_credentials" (
    "id" UUID NOT NULL,
    "social_account_id" UUID NOT NULL,
    "encrypted_access_token" TEXT NOT NULL,
    "encrypted_refresh_token" TEXT,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "key_version" TEXT NOT NULL DEFAULT 'v1',
    "expires_at" TIMESTAMP(3),
    "last_validated_at" TIMESTAMP(3),
    "validation_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_account_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_account_permissions" (
    "id" UUID NOT NULL,
    "social_account_id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_account_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_account_capabilities" (
    "id" UUID NOT NULL,
    "social_account_id" UUID NOT NULL,
    "capability" TEXT NOT NULL,
    "status" "CapabilityStatus" NOT NULL,
    "reason" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_account_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_accounts_workspace_id_idx" ON "social_accounts"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_workspace_id_platform_platform_account_id_key" ON "social_accounts"("workspace_id", "platform", "platform_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_account_credentials_social_account_id_key" ON "social_account_credentials"("social_account_id");

-- CreateIndex
CREATE INDEX "social_account_permissions_social_account_id_idx" ON "social_account_permissions"("social_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_account_permissions_social_account_id_scope_key" ON "social_account_permissions"("social_account_id", "scope");

-- CreateIndex
CREATE INDEX "social_account_capabilities_social_account_id_idx" ON "social_account_capabilities"("social_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_account_capabilities_social_account_id_capability_key" ON "social_account_capabilities"("social_account_id", "capability");

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_account_credentials" ADD CONSTRAINT "social_account_credentials_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_account_permissions" ADD CONSTRAINT "social_account_permissions_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_account_capabilities" ADD CONSTRAINT "social_account_capabilities_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
