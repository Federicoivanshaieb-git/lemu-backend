import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'ID Token obtenido tras la autenticación con Google' })
  @IsNotEmpty()
  @IsString()
  idToken: string;

  @ApiProperty({ example: 'federicoshaieb@gmail.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Federico Shaieb' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://lh3.googleusercontent.com/...' })
  @IsOptional()
  @IsString()
  picture?: string;
}