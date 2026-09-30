import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'federicoshaieb@gmail.com' })
  @IsEmail({}, { message: 'El formato del email no es válido.' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Barca1106' })
  @IsString()
  @IsNotEmpty()
  password: string;
}