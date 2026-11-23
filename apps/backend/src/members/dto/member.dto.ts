import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus, WorkspaceRole } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: WorkspaceRole })
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;

  @ApiPropertyOptional({ enum: MemberStatus })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;
}

export class AssignMemberRolesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
