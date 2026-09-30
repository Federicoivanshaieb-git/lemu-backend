import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export enum QuoteStatus {
  PENDIENTE = 'PENDIENTE',
  PRESUPUESTADO = 'PRESUPUESTADO',
  RECHAZADO = 'RECHAZADO',
  COMPLETADO = 'COMPLETADO',
}

export class UpdateQuoteDto {
  @ApiPropertyOptional({ enum: QuoteStatus })
  @IsOptional()
  @IsEnum(QuoteStatus, { message: 'El estado enviado no es válido.' })
  status?: QuoteStatus;

  @ApiPropertyOptional({ example: 45000 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número.' })
  @Min(0, { message: 'El precio debe ser un valor positivo.' })
  price?: number;
}