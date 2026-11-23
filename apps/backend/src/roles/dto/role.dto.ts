import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Social Media Lead' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ example: 'Can publish posts and manage comments' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ example: ['posts.view', 'posts.create', 'posts.publish'] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior Social Lead' })
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

  @ApiPropertyOptional({ example: ['posts.view', 'posts.create'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
