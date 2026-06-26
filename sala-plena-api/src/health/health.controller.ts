import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {

  @ApiOperation({ summary: 'Verificar que el servicio está activo' })
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'backend-sala-plena-api',
      uptime: process.uptime(),
    };
  }
}