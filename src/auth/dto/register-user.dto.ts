import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({ example: 'fHuu4xn3C9yD4UZ1QFiH' })
  @IsNotEmpty({ message: 'El UID del usuario es obligatorio.' })
  @IsString()
  uid: string;

  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsNotEmpty({ message: 'El email es obligatorio.' })
  @IsEmail({}, { message: 'El formato del email no es válido.' })
  email: string;

  @ApiPropertyOptional({ example: 'Federico Shaieb' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+56912345678' })
  @IsOptional()
  @IsString()
  phone?: string;
}