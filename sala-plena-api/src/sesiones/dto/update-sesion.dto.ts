import { IsOptional, IsString, IsDateString, IsIn, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para actualizar una sesión existente.
 * Solo expone campos editables por el usuario.
 * Campos controlados internamente (urlNextcloud, password, emailEnviado, etc.) NO están incluidos.
 */
export class UpdateSesionDto {
  @ApiPropertyOptional({ description: 'Título de la sesión', example: 'Sesión Ordinaria N° 25' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  titulo?: string;

  @ApiPropertyOptional({ description: 'Fecha de la sesión (YYYY-MM-DD)', example: '2024-06-15' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaSesion?: string;

  @ApiPropertyOptional({ description: 'Hora de la sesión (HH:MM)', example: '14:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  horaSesion?: string;

  @ApiPropertyOptional({
    description: 'Tipo de sesión',
    example: 'presencial',
    enum: ['presencial', 'virtual', 'mixta'],
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['presencial', 'virtual', 'mixta'])
  tipoSesion?: string;

  @ApiPropertyOptional({ description: 'Estado de la sesión', example: 'activo', enum: ['activo', 'inactivo', 'archivado'] })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['activo', 'inactivo', 'archivado'])
  estado?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales', example: 'Sesión extraordinaria por emergencia' })
  @IsOptional()
  @IsString()
  notas?: string;
}
