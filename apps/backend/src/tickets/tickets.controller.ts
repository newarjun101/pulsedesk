import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '@/common/guards/workspace.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { TicketsService } from './tickets.service';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @RequirePermissions('tickets.view')
  @ApiOperation({ summary: 'List support tickets in workspace' })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: TicketStatus,
  ) {
    return this.ticketsService.findAll(workspaceId, status);
  }

  @Post()
  @RequirePermissions('tickets.create')
  @ApiOperation({ summary: 'Create a customer support ticket' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      subject: string;
      description: string;
      priority?: TicketPriority;
      contactId?: string;
      conversationId?: string;
    },
  ) {
    return this.ticketsService.create(workspaceId, dto);
  }

  @Post(':ticketId/replies')
  @RequirePermissions('tickets.reply')
  @ApiOperation({ summary: 'Add a public reply to a ticket' })
  addReply(
    @Param('workspaceId') workspaceId: string,
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { body: string },
  ) {
    return this.ticketsService.addMessage(workspaceId, ticketId, user.id, dto.body, true);
  }

  @Post(':ticketId/notes')
  @RequirePermissions('tickets.reply')
  @ApiOperation({ summary: 'Add an internal note to a ticket' })
  addNote(
    @Param('workspaceId') workspaceId: string,
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { body: string },
  ) {
    return this.ticketsService.addMessage(workspaceId, ticketId, user.id, dto.body, false);
  }

  @Patch(':ticketId/status')
  @RequirePermissions('tickets.edit')
  @ApiOperation({ summary: 'Update ticket status' })
  updateStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: { status: TicketStatus },
  ) {
    return this.ticketsService.updateStatus(workspaceId, ticketId, dto.status);
  }

  @Patch(':ticketId/assign')
  @RequirePermissions('tickets.assign')
  @ApiOperation({ summary: 'Assign or unassign a ticket to a workspace member' })
  assignTicket(
    @Param('workspaceId') workspaceId: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: { assignedToId: string | null },
  ) {
    return this.ticketsService.assignTicket(workspaceId, ticketId, dto.assignedToId);
  }
}
