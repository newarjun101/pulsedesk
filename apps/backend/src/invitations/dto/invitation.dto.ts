import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'teammate@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: WorkspaceRole, default: WorkspaceRole.SUPPORT_AGENT })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;
}
