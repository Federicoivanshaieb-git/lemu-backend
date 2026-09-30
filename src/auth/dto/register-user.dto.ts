import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @ApiPropertyOptional({ example: 'fHuu4xn3C9yD4UZ1QFiH' })
  @IsOptional()
  @IsString()
  uid?: string;

  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsNotEmpty({ message: 'El email es obligatorio.' })
  @IsEmail({}, { message: 'El formato del email no es válido.' })
  email: string;

  @ApiPropertyOptional({ example: 'Barca1106' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password?: string;

  @ApiPropertyOptional({ example: 'Federico Shaieb' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+56912345678' })
  @IsOptional()
  @IsString()
  phone?: string;
}