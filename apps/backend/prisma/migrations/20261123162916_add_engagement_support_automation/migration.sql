-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'WAITING', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'STICKER', 'SYSTEM', 'INTERNAL_NOTE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_INTERNAL_TEAM', 'RESOLVED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "social_contacts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "is_vip" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_identities" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "external_user_id" TEXT NOT NULL,
    "username" TEXT,
    "profile_pic_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "social_account_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "external_conv_id" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to_id" UUID,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_type" TEXT NOT NULL,
    "sender_id" TEXT,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "external_msg_id" TEXT,
    "delivery_status" TEXT NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "social_account_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "external_comment_id" TEXT NOT NULL,
    "external_post_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_handled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "reason" TEXT,
    "external_result" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "contact_id" UUID,
    "conversation_id" UUID,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to_id" UUID,
    "sla_deadline" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_contacts_workspace_id_idx" ON "social_contacts"("workspace_id");

-- CreateIndex
CREATE INDEX "customer_identities_contact_id_idx" ON "customer_identities"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identities_platform_external_user_id_key" ON "customer_identities"("platform", "external_user_id");

-- CreateIndex
CREATE INDEX "conversations_workspace_id_status_idx" ON "conversations"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_workspace_id_idx" ON "comments"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "comments_platform_external_comment_id_key" ON "comments"("platform", "external_comment_id");

-- CreateIndex
CREATE INDEX "moderation_actions_workspace_id_idx" ON "moderation_actions"("workspace_id");

-- CreateIndex
CREATE INDEX "tickets_workspace_id_status_idx" ON "tickets"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "automation_rules_workspace_id_idx" ON "automation_rules"("workspace_id");

-- CreateIndex
CREATE INDEX "notifications_workspace_id_user_id_idx" ON "notifications"("workspace_id", "user_id");

-- AddForeignKey
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "social_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "social_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "social_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
