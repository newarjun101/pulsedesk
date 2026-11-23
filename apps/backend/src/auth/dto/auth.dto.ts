import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'alex@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Alex' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  firstName!: string;

  @ApiProperty({ example: 'Rivera' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  lastName!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'alex@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'alex@company.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'NewStrongPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
