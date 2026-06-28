import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RotationService } from './rotation.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../auth/enums/rol.enum';

@ApiTags('Rotación')
@ApiBearerAuth('JWT-auth')
@Controller('rotation')
export class RotationController {
  constructor(private readonly rotationService: RotationService) {}

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Verificar estado de rotación' })
  @Get('status')
  async getStatus() {
    // Retorna info básica, la rotación real se hace vía cron o execute
    return {
      cron: '0 3 * * *',
      nextRun: 'Próxima ejecución: 03:00 AM',
    };
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Ejecutar rotación manualmente' })
  @Post('execute')
  async executeRotation() {
    return this.rotationService.ejecutarRotacion();
  }
}