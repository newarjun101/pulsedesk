import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alex' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rivera' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  lastName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
