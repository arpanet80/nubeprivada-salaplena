import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, ArrayMinSize } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({ description: 'Asunto del email', example: 'Citación a Sala Plena' })
  @IsNotEmpty()
  @IsString()
  asunto: string;

  @ApiProperty({ description: 'Cuerpo HTML del email', example: '<h1>Citación</h1><p>...</p>' })
  @IsNotEmpty()
  @IsString()
  cuerpoHtml: string;

  @ApiPropertyOptional({ description: 'Cuerpo texto plano (fallback)', example: 'Citación a Sala Plena...' })
  @IsOptional()
  @IsString()
  cuerpoTexto?: string;

  @ApiProperty({ description: 'Destinatarios', example: ['dante.ibanez@oep.org.bo', 'carla.jimenez@oep.org.bo'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  destinatarios: string[];
}

export class RetryEmailDto {
  @ApiProperty({ description: 'ID de la sesión para reintentar email', example: 15 })
  @IsNotEmpty()
  sesionId: number;
}