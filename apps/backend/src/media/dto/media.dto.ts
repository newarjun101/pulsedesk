import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RegisterMediaAssetDto {
  @ApiProperty({ example: 'launch-banner.png' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @ApiProperty({ enum: MediaType })
  @IsEnum(MediaType)
  mediaType!: MediaType;

  @ApiProperty({ example: 'https://cdn.example.com/media/launch-banner.png' })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiPropertyOptional({ example: 'campaigns' })
  @IsOptional()
  @IsString()
  folder?: string;
}

export class UpdateMediaAssetDto {
  @ApiPropertyOptional({ example: 'updated-banner.png' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  folder?: string;
}
