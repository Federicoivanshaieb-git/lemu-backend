import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty({ example: 'Mantenimiento de Jardín', description: 'Tipo de servicio solicitado' })
  @IsNotEmpty({ message: 'El tipo de servicio es obligatorio.' })
  @IsString()
  serviceType: string;

  @ApiProperty({ example: 'Av. Providencia 1234, Santiago', description: 'Dirección donde se realizará el servicio' })
  @IsNotEmpty({ message: 'La dirección es obligatoria.' })
  @MinLength(5, { message: 'La dirección debe ser más detallada.' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ example: '+56912345678' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ example: 'Necesito cortar el césped y podar árboles altos.' })
  @IsOptional()
  @IsString()
  notes?: string;
}