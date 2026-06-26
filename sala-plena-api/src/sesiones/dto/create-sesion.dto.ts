import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// HELPER: Convertir a Title Case
// ============================================
function toTitleCase(value: any): string {
  if (!value) return value;
  return value
    .toString()
    .trim()
    .split(/\s+/)
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
    .join(' ');
}

// ============================================
// DTO para crear sesión (JSON normal)
// ============================================
export class CreateSesionDto {
  @ApiProperty({ description: 'Nombre de la carpeta en Nextcloud', example: '2026-06-18_Sala_Plena_Ordinaria' })
  @IsNotEmpty({ message: 'La carpeta es requerida' })
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.toString().trim())
  carpeta: string;

  @ApiProperty({ description: 'Título de la sesión', example: 'Sesión Ordinaria N° 25' })
  @IsNotEmpty({ message: 'El título es requerido' })
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => toTitleCase(value))   // ← CORREGIDO: Title Case
  titulo: string;

  @ApiProperty({ description: 'Fecha de la sesión (YYYY-MM-DD)', example: '2024-06-15' })
  @IsNotEmpty({ message: 'La fecha de sesión es requerida' })
  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaSesion: string;

  @ApiPropertyOptional({ description: 'Hora de la sesión (HH:MM)', example: '14:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  horaSesion?: string;

  @ApiPropertyOptional({ 
    description: 'Tipo de sesión', 
    example: 'presencial', 
    enum: ['presencial', 'virtual', 'mixta'] 
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['presencial', 'virtual', 'mixta'])
  @Transform(({ value }) => value?.toString().trim().toLowerCase())
  tipoSesion?: string;

  @ApiPropertyOptional({ description: 'URL del share de Nextcloud', example: 'https://nextcloud.ted/...' })
  @IsOptional()
  @IsString()
  urlNextcloud?: string;

  @ApiPropertyOptional({ description: 'Contraseña del share', example: 'abc123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  password?: string;

  @ApiPropertyOptional({ description: 'Fecha de expiración del share (YYYY-MM-DD)', example: '2024-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaExpiracion?: string;

  @ApiPropertyOptional({ description: 'Estado de la sesión', example: 'activo', enum: ['activo', 'inactivo', 'archivado'] })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['activo', 'inactivo', 'archivado'])
  estado?: string;

  @ApiPropertyOptional({ description: 'Indica si el respaldo fue exitoso', example: false })
  @IsOptional()
  @IsBoolean()
  respaldoOk?: boolean;

  @ApiPropertyOptional({ description: 'Indica si la versión fue reemplazada', example: false })
  @IsOptional()
  @IsBoolean()
  versionReemplazada?: boolean;

  @ApiPropertyOptional({ description: 'Indica si el email fue enviado', example: false })
  @IsOptional()
  @IsBoolean()
  emailEnviado?: boolean;

  @ApiPropertyOptional({ description: 'Mensaje del email enviado', example: 'Estimados vocales...' })
  @IsOptional()
  @IsString()
  emailMensaje?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales', example: 'Sesión extraordinaria por emergencia' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ description: 'Usuario que registra la sesión', example: 'juan.perez' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  usuarioRegistro?: string;
}

// ============================================
// DTO para upload con multipart/form-data
// carpeta NO es requerida (se genera automáticamente)
// ============================================
export class CreateSesionUploadDto {
  @ApiProperty({ description: 'Título de la sesión', example: 'Sesión Ordinaria N° 25' })
  @IsNotEmpty({ message: 'El título es requerido' })
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => toTitleCase(value))   // ← CORREGIDO: Title Case
  titulo: string;

  @ApiProperty({ description: 'Fecha de la sesión (YYYY-MM-DD)', example: '2024-06-15' })
  @IsNotEmpty({ message: 'La fecha de sesión es requerida' })
  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaSesion: string;

  @ApiPropertyOptional({ description: 'Hora de la sesión (HH:MM)', example: '14:00' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  horaSesion?: string;

  @ApiPropertyOptional({ 
    description: 'Tipo de sesión', 
    example: 'presencial', 
    enum: ['presencial', 'virtual', 'mixta'] 
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsIn(['presencial', 'virtual', 'mixta'])
  @Transform(({ value }) => value?.toString().trim().toLowerCase())
  tipoSesion?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales', example: 'Sesión extraordinaria por emergencia' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ description: 'Usuario que registra la sesión', example: 'juan.perez' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  usuarioRegistro?: string;
}