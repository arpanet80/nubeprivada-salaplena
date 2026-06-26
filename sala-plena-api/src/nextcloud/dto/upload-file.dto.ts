import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ description: 'Ruta destino en Nextcloud (relativa a SalaPlena)', example: '2026-06-20_Sala_Plena_Ordinaria/doc1.pdf' })
  @IsNotEmpty()
  @IsString()
  remotePath: string;

  @ApiProperty({ description: 'Contenido del archivo en base64', type: 'string', format: 'base64' })
  @IsNotEmpty()
  @IsString()
  fileBase64: string;

  @ApiProperty({ description: 'Tamaño esperado en bytes (para verificación)', required: false })
  @IsOptional()
  @IsNumber()
  expectedSize?: number;
}