import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'ID del chat (userId del cliente)', example: 'IXAcrQunTYfYGALYNkyfzA3Sur2' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ description: 'ID del remitente', example: 'IXAcrQunTYfYGALYNkyfzA3Sur2' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Rol del remitente', enum: ['client', 'admin'], example: 'client' })
  @IsEnum(['client', 'admin'])
  senderRole: 'client' | 'admin';

  @ApiProperty({ description: 'Contenido del mensaje', example: 'Hola, consulto por la limpieza de mi terreno.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Nombre completo del cliente', example: 'Federico Shaieb' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ description: 'Área o Sector', example: 'Sector B' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ description: 'Número de Lote / Manzana', example: 'Lote 14' })
  @IsOptional()
  @IsString()
  lote?: string;

  @ApiPropertyOptional({ description: 'Tipo de predio', enum: ['grande', 'chico'], example: 'grande' })
  @IsOptional()
  @IsEnum(['grande', 'chico'])
  propertyType?: 'grande' | 'chico';
}