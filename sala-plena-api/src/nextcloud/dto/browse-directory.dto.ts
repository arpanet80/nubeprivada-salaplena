import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BrowseDirectoryDto {
  @ApiPropertyOptional({ description: 'Ruta a explorar (relativa a SalaPlena)', example: '2026-06-20_Sala_Plena_Ordinaria', default: '' })
  @IsOptional()
  @IsString()
  path?: string;
}