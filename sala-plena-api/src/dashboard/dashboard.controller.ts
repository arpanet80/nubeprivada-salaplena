import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../auth/enums/rol.enum';
import { DashboardService, DashboardStats } from './dashboard.service';  // ← Importar DashboardStats

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Estadísticas del dashboard' })
  @Get()
  async getDashboard(): Promise<DashboardStats> {  // ← Tipo explícito
    return this.dashboardService.getStats();
  }
}