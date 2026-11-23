import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialPlatform } from '@prisma/client';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ManualConnectSocialAccountDto {
  @ApiProperty({ enum: SocialPlatform })
  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @ApiProperty({ example: '102938475610293' })
  @IsString()
  @IsNotEmpty()
  platformAccountId!: string;

  @ApiProperty({ example: 'Acme Official Page' })
  @IsString()
  @IsNotEmpty()
  accountName!: string;

  @ApiPropertyOptional({ example: 'acmeofficial' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Official platform access token (stored encrypted)' })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @ApiPropertyOptional({ example: ['pages_show_list', 'pages_manage_posts'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grantedScopes?: string[];
}

export class ReplaceCredentialsDto {
  @ApiProperty({ description: 'New official platform access token' })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @ApiPropertyOptional({ example: ['pages_show_list', 'pages_manage_posts'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grantedScopes?: string[];
}

export class UpdateSocialAccountDto {
  @ApiPropertyOptional({ example: '1100913483113092' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  platformAccountId?: string;

  @ApiPropertyOptional({ example: 'AppArchition' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  accountName?: string;

  @ApiPropertyOptional({ example: 'apparchition' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Optional new access token' })
  @IsOptional()
  @IsString()
  accessToken?: string;
}
