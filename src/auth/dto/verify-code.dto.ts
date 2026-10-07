import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos enviado por correo' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe contener exactamente 6 dígitos' })
  code: string;
}