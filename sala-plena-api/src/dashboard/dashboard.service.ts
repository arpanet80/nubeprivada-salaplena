import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sesion } from '../sesiones/entities/sesion.entity';
import { Rotacion } from '../rotation/entities/rotacion.entity';
import { NextcloudService } from '../nextcloud/nextcloud.service';
import { LoggerService } from '../logger/logger.service';

export interface DashboardStats {
  totalSesiones: number;
  activas: number;
  archivadas: number;
  conRespaldo: number;
  conEmailEnviado: number;
  espacioNextcloud: {
    usadoMb: number;
    libreMb: number;
    librePercent: number;
  };
  ultimasSesiones: any[];
  ultimaRotacion: any;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Sesion)
    private readonly sesionRepository: Repository<Sesion>,
    @InjectRepository(Rotacion)
    private readonly rotacionRepository: Repository<Rotacion>,
    private readonly nextcloudService: NextcloudService,
    private readonly loggerService: LoggerService,
  ) {}

  async getStats(): Promise<DashboardStats> {
    try {
      // Query agregada única para conteos (optimización)
      const counts = await this.sesionRepository
        .createQueryBuilder('sesion')
        .select([
          'COUNT(*) as total',
          'COUNT(CASE WHEN sesion.estado = :activo THEN 1 END) as activas',
          'COUNT(CASE WHEN sesion.estado = :archivado THEN 1 END) as archivadas',
          'COUNT(CASE WHEN sesion.respaldo_ok = true THEN 1 END) as con_respaldo',
          'COUNT(CASE WHEN sesion.email_enviado = true THEN 1 END) as con_email',
        ])
        .setParameters({ activo: 'activo', archivado: 'archivado' })
        .getRawOne();

      const totalSesiones = parseInt(counts.total, 10) || 0;
      const activas = parseInt(counts.activas, 10) || 0;
      const archivadas = parseInt(counts.archivadas, 10) || 0;
      const conRespaldo = parseInt(counts.con_respaldo, 10) || 0;
      const conEmailEnviado = parseInt(counts.con_email, 10) || 0;

      const quota = await this.nextcloudService.getUserQuota();

      const ultimasSesiones = await this.sesionRepository.find({
        where: { estado: 'activo' },
        order: { fechaSesion: 'DESC' },
        take: 5,
      });

      const ultimaRotacion = await this.rotacionRepository.findOne({
        where: {},
        order: { fechaEjecucion: 'DESC' },
      });

      return {
        totalSesiones,
        activas,
        archivadas,
        conRespaldo,
        conEmailEnviado,
        espacioNextcloud: {
          usadoMb: Math.round(quota.used / 1024 / 1024),
          libreMb: quota.available === -1 ? -1 : Math.round(quota.available / 1024 / 1024),
          librePercent: quota.freePercent,
        },
        ultimasSesiones: ultimasSesiones.map((s) => ({
          id: s.id,
          titulo: s.titulo,
          fecha: s.fechaSesion,
          hora: s.horaSesion,
          tipo: s.tipoSesion,
          estado: s.estado,
        })),
        ultimaRotacion: ultimaRotacion
          ? {
              fecha: ultimaRotacion.fechaEjecucion,
              archivadas: ultimaRotacion.sesionesArchivadas,
              espacioLiberado: ultimaRotacion.espacioLiberadoMb,
            }
          : null,
      };
    } catch (error) {
      this.loggerService.logError('DashboardService', 'Error obteniendo estadísticas', error as Error);
      throw error;
    }
  }
}
