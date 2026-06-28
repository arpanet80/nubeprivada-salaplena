import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../auth/enums/rol.enum';
import { BackupService } from './backup.service';
import { BackupResult, BackupVerifyResult } from './interfaces/backup-result.interface';

@ApiTags('Backup')
@ApiBearerAuth('JWT-auth')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Verificar si existe respaldo de una sesión' })
  @Get('verify')
  async verify(
    @Query('carpeta') carpeta: string,
  ): Promise<BackupVerifyResult> {
    return this.backupService.verificarRespaldo(carpeta);
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Respaldar sesión manualmente (prueba)' })
  @Post('test')
  async testBackup(
    @Body('carpeta') carpeta: string,
    @Body('archivos') archivos: { nombre: string; contenidoBase64: string }[],
  ): Promise<BackupResult> {
    const buffers = archivos.map((a) => ({
      nombre: a.nombre,
      contenido: Buffer.from(a.contenidoBase64, 'base64'),
    }));
    return this.backupService.respaldarSesion(carpeta, buffers);
  }
}