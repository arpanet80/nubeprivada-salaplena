import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ description: 'Título de la sesión', example: 'Sala Plena Ordinaria' })
  @IsString()
  titulo: string;

  @ApiProperty({ description: 'Tipo de sesión', example: 'presencial' })
  @IsString()
  tipoSesion: string;

  @ApiProperty({ description: 'Fecha de la sesión', example: '20/06/2026' })
  @IsString()
  fecha: string;

  @ApiProperty({ description: 'Hora de la sesión', example: '14:00' })
  @IsString()
  hora: string;

  @ApiProperty({ description: 'URL del enlace Nextcloud', example: 'https://nubeprivada.oep.org.bo/s/AbCdEfGh' })
  @IsString()
  urlNextcloud: string;

  @ApiProperty({ description: 'Contraseña del enlace', example: '59171234567' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Lista de archivos PDF', example: ['01-Orden del Dia.pdf', '02-Informe Juridico.pdf'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  archivos?: string[];
}

export class SendToNumbersDto {
  @ApiProperty({ description: 'Números de destino', example: ['59171234567', '59171234568'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  numeros: string[];

  @ApiProperty({ description: 'Mensaje a enviar', example: '🧪 Mensaje de prueba' })
  @IsString()
  mensaje: string;
}