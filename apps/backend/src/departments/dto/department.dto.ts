import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Customer Support' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ example: 'Handles incoming customer inquiries and tickets' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'VIP Support' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class AssignDepartmentMemberDto {
  @ApiProperty()
  @IsUUID()
  memberId!: string;
}
