import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Acme Social Agency' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 'acme-social-agency' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  })
  @MinLength(2)
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional({ example: 'America/New_York', default: 'UTC' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Optional workspace logo URL or base64 data URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({ example: 'Acme Global' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'Europe/London' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  logoUrl?: string;
}
