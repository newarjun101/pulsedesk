import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus, MessageType, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  async listConversations(workspaceId: string, status?: ConversationStatus) {
    return this.prisma.conversation.findMany({
      where: {
        workspaceId,
        ...(status ? { status } : {}),
      },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getMessages(workspaceId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendReply(
    workspaceId: string,
    conversationId: string,
    senderId: string,
    body: string,
    isInternalNote = false,
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderType: 'AGENT',
          senderId,
          type: isInternalNote ? MessageType.INTERNAL_NOTE : MessageType.TEXT,
          body,
          deliveryStatus: isInternalNote ? 'INTERNAL' : 'SENT',
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      });

      if (!isInternalNote) {
        const existingTicket = await tx.ticket.findFirst({
          where: { workspaceId, conversationId },
          orderBy: { createdAt: 'desc' },
        });

        if (!existingTicket) {
          await tx.ticket.create({
            data: {
              workspaceId,
              contactId: conv.contactId,
              conversationId,
              subject: `New ${conv.platform} message`,
              description: body,
              priority: TicketPriority.NORMAL,
              status: TicketStatus.OPEN,
              slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        } else if (
          existingTicket.status === TicketStatus.RESOLVED ||
          existingTicket.status === TicketStatus.CLOSED
        ) {
          await tx.ticket.update({
            where: { id: existingTicket.id },
            data: { status: TicketStatus.REOPENED, resolvedAt: null },
          });
        }
      }

      return msg;
    });
  }
}
