import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

const SLA_HOURS: Record<TicketPriority, number> = {
  URGENT: 2,
  HIGH: 8,
  NORMAL: 24,
  LOW: 48,
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string, status?: TicketStatus) {
    return this.prisma.ticket.findMany({
      where: {
        workspaceId,
        ...(status ? { status } : {}),
      },
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    workspaceId: string,
    dto: {
      subject: string;
      description: string;
      priority?: TicketPriority;
      contactId?: string;
      conversationId?: string;
    },
  ) {
    const priority = dto.priority ?? TicketPriority.NORMAL;
    const slaDeadline = new Date(
      Date.now() + SLA_HOURS[priority] * 60 * 60 * 1000,
    );

    return this.prisma.ticket.create({
      data: {
        workspaceId,
        subject: dto.subject,
        description: dto.description,
        priority,
        slaDeadline,
        contactId: dto.contactId ?? null,
        conversationId: dto.conversationId ?? null,
      },
    });
  }

  async addMessage(
    workspaceId: string,
    ticketId: string,
    authorId: string,
    body: string,
    isPublic: boolean,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, workspaceId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId,
        body,
        isPublic,
      },
    });
  }

  async updateStatus(
    workspaceId: string,
    ticketId: string,
    status: TicketStatus,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, workspaceId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status,
        resolvedAt:
          status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED
            ? new Date()
            : null,
      },
    });
  }

  async assignTicket(
    workspaceId: string,
    ticketId: string,
    assignedToId: string | null,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, workspaceId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assignedToId,
        ...(assignedToId && ticket.status === TicketStatus.OPEN
          ? { status: TicketStatus.ASSIGNED }
          : {}),
      },
    });
  }
}
