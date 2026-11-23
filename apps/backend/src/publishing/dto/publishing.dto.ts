import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ example: 'New product launch today!' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  socialAccountIds!: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mediaAssetIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdatePostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mediaAssetIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
