import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateShareDto {
  @ApiProperty({ description: 'Ruta del archivo/carpeta a compartir (relativa a SalaPlena)', example: '2026-06-20_Sala_Plena_Ordinaria' })
  @IsNotEmpty()
  @IsString()
  path: string;

  @ApiProperty({ description: 'Contraseña numérica del enlace', example: '59171234567' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Fecha de expiración (YYYY-MM-DD)', example: '2026-06-30' })
  @IsOptional()
  @IsString()
  expireDate?: string;

  @ApiPropertyOptional({ description: 'Tipo de share', enum: [0, 1, 3], default: 3 })
  @IsOptional()
  @IsNumber()
  @IsIn([0, 1, 3])
  shareType?: number; // 3 = enlace público

  @ApiPropertyOptional({ description: 'Permisos', enum: [1, 2, 3, 4, 17], default: 1 })
  @IsOptional()
  @IsNumber()
  @IsIn([1, 2, 3, 4, 17])
  permissions?: number; // 1 = solo lectura
}