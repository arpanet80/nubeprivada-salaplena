import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { LoggerService } from '../logger/logger.service';
import { NextcloudService } from '../nextcloud/nextcloud.service';
import { BackupService } from '../backup/backup.service';
import { SesionesService } from '../sesiones/sesiones.service';
import { Sesion } from '../sesiones/entities/sesion.entity';
import { Rotacion } from './entities/rotacion.entity';

@Injectable()
export class RotationService {
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    private readonly nextcloudService: NextcloudService,
    private readonly backupService: BackupService,
    private readonly sesionesService: SesionesService,
    @InjectRepository(Rotacion)
    private readonly rotacionRepository: Repository<Rotacion>,
  ) {}

  // ============================================
  // CRON: 3:00 AM diario (con lock para evitar solapamiento)
  // ============================================
  @Cron('0 3 * * *')
  async ejecutarRotacionAutomatica(): Promise<void> {
    if (this.isRunning) {
      this.loggerService.log('Rotación ya en ejecución, omitiendo...', 'RotationService');
      return;
    }

    this.isRunning = true;
    try {
      this.loggerService.log('Iniciando rotación automática (cron 3:00 AM)', 'RotationService');
      await this.ejecutarRotacion();
    } catch (error) {
      this.loggerService.error(
        'Error en rotación automática',
        (error as Error).stack,
        'RotationService',
      );
    } finally {
      this.isRunning = false;
    }
  }

  // ============================================
  // ROTACIÓN MANUAL O AUTOMÁTICA
  // ============================================
  async ejecutarRotacion(): Promise<{
    ok: boolean;
    mensaje: string;
    sesionesArchivadas: number;
    espacioLiberadoMb: number;
  }> {
    const enabled = this.configService.get<boolean>('ROTATION_ENABLED', true);
    if (!enabled) {
      return {
        ok: true,
        mensaje: 'Rotación deshabilitada',
        sesionesArchivadas: 0,
        espacioLiberadoMb: 0,
      };
    }

    try {
      // 1. Verificar necesidad (espacio libre < 20%)
      const freeThreshold = this.configService.get<number>(
        'ROTATION_FREE_SPACE_THRESHOLD_PERCENT',
        20,
      );
      const quota = await this.nextcloudService.getUserQuota();

      if (quota.freePercent >= freeThreshold) {
        this.loggerService.log(
          `No requiere rotación. Espacio libre: ${quota.freePercent}% (umbral: ${freeThreshold}%)`,
          'RotationService'
        );
      return {
          ok: true,
          mensaje: `No requiere rotación. Espacio libre: ${quota.freePercent}%`,
          sesionesArchivadas: 0,
          espacioLiberadoMb: 0,
        };
      }

      // 2. Obtener candidatas
      const minAgeDays = this.configService.get<number>('ROTATION_MIN_AGE_DAYS', 15);
      const sessionsToRemove = this.configService.get<number>('ROTATION_SESSIONS_TO_REMOVE', 5);
      const verifyBackup = this.configService.get<boolean>('ROTATION_VERIFY_BACKUP_BEFORE_DELETE', true);

      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - minAgeDays);

      const candidatas = await this.sesionesService.findCandidatasRotacion(fechaLimite, sessionsToRemove);

      if (candidatas.length === 0) {
        return {
          ok: true,
          mensaje: 'No hay sesiones candidatas para archivar',
          sesionesArchivadas: 0,
          espacioLiberadoMb: 0,
        };
      }

      // 3. Procesar cada candidata
      let archivadas = 0;
      let espacioLiberado = 0;
      const detalles: string[] = [];

      for (const sesion of candidatas) {
        try {
          const resultado = await this.archivarSesion(sesion, verifyBackup);
          if (resultado.ok) {
            archivadas++;
            espacioLiberado += resultado.bytesLiberados;
            detalles.push(`✅ ${sesion.carpeta}: ${resultado.mensaje}`);
          } else {
            detalles.push(`⚠️ ${sesion.carpeta}: ${resultado.mensaje}`);
          }
        } catch (error) {
          detalles.push(`❌ ${sesion.carpeta}: ${(error as Error).message}`);
          this.loggerService.error(
            `Error archivando ${sesion.carpeta}`,
            (error as Error).stack,
            'RotationService'
          );
        }
      }

      // 4. Registrar rotación
      const rotacion = this.rotacionRepository.create({
        sesionesArchivadas: archivadas,
        espacioLiberadoMb: Math.round((espacioLiberado / 1024 / 1024) * 100) / 100,
        espacioRestantePercent: quota.freePercent,
        detalle: detalles.join('\n'),
      });
      await this.rotacionRepository.save(rotacion);

      // 5. Rotar logs también
      await this.loggerService.rotarLogs();

      const mensaje = `Rotación completada. ${archivadas} sesiones archivadas. Espacio liberado: ${Math.round(espacioLiberado / 1024 / 1024)} MB.`;
      this.loggerService.log(mensaje, 'RotationService');

      return {
        ok: true,
        mensaje,
        sesionesArchivadas: archivadas,
        espacioLiberadoMb: Math.round(espacioLiberado / 1024 / 1024),
      };
    } catch (error) {
      this.loggerService.error(
        'Error en rotación',
        (error as Error).stack,
        'RotationService'
      );
      return {
        ok: false,
        mensaje: `Error: ${(error as Error).message}`,
        sesionesArchivadas: 0,
        espacioLiberadoMb: 0,
      };
    }
  }

  // ============================================
  // ARCHIVAR UNA SESIÓN INDIVIDUAL
  // ============================================
  private async archivarSesion(
    sesion: Sesion,
    verifyBackup: boolean,
  ): Promise<{ ok: boolean; mensaje: string; bytesLiberados: number }> {
    const carpeta = sesion.carpeta;
    let bytesLiberados = 0;

    // a. Verificar respaldo en TrueNAS
    if (verifyBackup) {
      const backupOk = await this.backupService.verificarRespaldo(carpeta);
      if (!backupOk.existe) {
        return {
          ok: false,
          mensaje: 'No existe respaldo en TrueNAS',
          bytesLiberados: 0,
        };
      }
    }

    // b. Buscar y eliminar share de Nextcloud
    const share = await this.nextcloudService.findShareByPath(carpeta);
    if (share) {
      await this.nextcloudService.deleteShare(share.id);
    }

    // c. Eliminar carpeta de Nextcloud
    await this.nextcloudService.deleteFile(carpeta);

    // d. Calcular espacio liberado (suma de documentos)
    if (sesion.documentos) {
      bytesLiberados = sesion.documentos.reduce(
        (sum, doc) => sum + (doc.tamanoBytes || 0),
        0,
      );
    }

    // e. Actualizar estado en BD
    await this.sesionesService.updateEstado(sesion.id, 'archivado');

    return {
      ok: true,
      mensaje: 'Sesión archivada correctamente',
      bytesLiberados,
    };
  }
}
