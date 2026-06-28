import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, Like, ILike } from 'typeorm';
import { Sesion } from './entities/sesion.entity';
import { Documento } from './entities/documento.entity';
import { CreateSesionDto, CreateSesionUploadDto } from './dto/create-sesion.dto';
import { UpdateSesionDto } from './dto/update-sesion.dto';
import { NextcloudService } from '../nextcloud/nextcloud.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { BackupService } from '../backup/backup.service';
import { LoggerService } from '../logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { WhatsAppSendResult } from '../whatsapp/interfaces/whatsapp-status.interface';
import * as crypto from 'crypto';
import * as fs from 'fs';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    limit: number;
  };
}

export interface SesionesFilter {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  titulo?: string;
  emailEnviado?: boolean;
}

@Injectable()
export class SesionesService {
  constructor(
    @InjectRepository(Sesion)
    public readonly sesionRepository: Repository<Sesion>,
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly nextcloudService: NextcloudService,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
    private readonly backupService: BackupService,
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // HELPERS
  // ============================================
  private formatFecha(fecha: any): string {
    if (!fecha) return '';
    if (typeof fecha === 'string') return fecha;
    if (fecha instanceof Date) return fecha.toISOString().split('T')[0];
    return new Date(fecha).toISOString().split('T')[0];
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ============================================
  // Nombre de carpeta en Title Case + fecha con guiones
  // ============================================
  private generarNombreCarpeta(fecha: string, titulo: string): string {
    const fechaStr = fecha;
    const tituloLimpio = titulo
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(palabra =>
        palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase()
      )
      .join('_')
      .substring(0, 50);

    return `${fechaStr}_${tituloLimpio}`;
  }

  private generarPasswordNumerico(): string {
    const longitud = this.configService.get<number>('SHARE_PASSWORD_LENGTH', 8);
    let password = '591';
    for (let i = 0; i < longitud; i++) {
      password += crypto.randomInt(0, 10).toString();
    }
    return password;
  }

  // ============================================
  // CREATE WITH UPLOAD (ASÍNCRONO) - CORREGIDO
  // ============================================
  async createWithUpload(
    createSesionDto: CreateSesionUploadDto,
    files: any[],
  ): Promise<{ sesionId: number; message: string }> {
    const usuario = createSesionDto.usuarioRegistro || 'sistema';


    // FIX: Parsear fecha como local ANTES de cualquier uso
    const [year, month, day] = createSesionDto.fechaSesion.split('-').map(Number);
    const fechaSesionLocal = new Date(year, month - 1, day); // Mes 0-indexed, hora local 00:00
    // Validación de duplicados CORREGIDA
    // FIX: Validar duplicados comparando fecha como rango de un día
    // Usamos Between con inicio y fin del día para evitar problemas de timezone
    const [y, m, d] = createSesionDto.fechaSesion.split('-').map(Number);
    const fechaInicio = new Date(y, m - 1, d, 0, 0, 0);
    const fechaFin = new Date(y, m - 1, d, 23, 59, 59);

    const existing = await this.sesionRepository.findOne({
      where: {
        fechaSesion: Between(fechaInicio, fechaFin),
        titulo: ILike(createSesionDto.titulo),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una sesión con la fecha "${createSesionDto.fechaSesion}" y título "${createSesionDto.titulo}"`,
      );
    }

    const [fYear, fMonth, fDay] = createSesionDto.fechaSesion.split('-').map(Number);
    const [fHour, fMin] = (createSesionDto.horaSesion || '00:00').split(':').map(Number);
    const fechaHoraSesion = new Date(fYear, fMonth - 1, fDay, fHour, fMin, 0);

    const ahora = new Date();
    if (fechaHoraSesion < ahora) {
      throw new BadRequestException('La fecha y hora de la sesión no pueden ser pasadas');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Debe subir al menos un archivo PDF');
    }

    const maxFileSize = this.configService.get<number>('UPLOAD_MAX_FILE_SIZE_MB', 100) * 1024 * 1024;
    const maxFiles = this.configService.get<number>('UPLOAD_MAX_FILES', 50);

    if (files.length > maxFiles) {
      throw new BadRequestException(`Máximo ${maxFiles} archivos permitidos`);
    }

    for (const file of files) {
      if (file.size > maxFileSize) {
        throw new BadRequestException(`Archivo ${file.originalname} excede ${maxFileSize / 1024 / 1024}MB`);
      }
      if (!file.mimetype.includes('pdf')) {
        throw new BadRequestException(`Archivo ${file.originalname} no es PDF`);
      }
    }

    // Crear sesión en BD
    const carpeta = this.generarNombreCarpeta(
      createSesionDto.fechaSesion,
      createSesionDto.titulo,
    );
    const password = this.generarPasswordNumerico();

    const expiryDays = this.configService.get<number>('SHARE_LINK_EXPIRY_DAYS', 10);
    const fechaExpiracion = new Date(fechaHoraSesion);
    fechaExpiracion.setDate(fechaExpiracion.getDate() + expiryDays);

    const sesion = this.sesionRepository.create({
      carpeta,
      titulo: createSesionDto.titulo,
      fechaSesion: fechaSesionLocal,
      horaSesion: createSesionDto.horaSesion || '14:00',
      tipoSesion: createSesionDto.tipoSesion || 'presencial',
      fechaExpiracion: fechaExpiracion.toISOString().split('T')[0],
      estado: 'activo',
      usuarioRegistro: usuario,
      password,
      totalArchivos: files.length,
      archivosSubidos: 0,
    });

    const saved = await this.sesionRepository.save(sesion);
    const realSesionId = saved.id;

    // Limpiar archivos temporales en background (no bloqueante)
    this.limpiarArchivosTemporales().catch(() => {});

    // Leer buffers de archivos
    const archivosBuffers: { nombre: string; buffer: Buffer; size: number }[] = [];
    for (const file of files) {
      let fileBuffer: Buffer;
      if (file.path && fs.existsSync(file.path)) {
        fileBuffer = fs.readFileSync(file.path);
      } else if (file.buffer) {
        fileBuffer = file.buffer;
      } else {
        throw new InternalServerErrorException(`No se pudo leer el archivo: ${file.originalname}`);
      }
      archivosBuffers.push({
        nombre: this.sanitizeFilename(file.originalname),
        buffer: fileBuffer,
        size: file.size,
      });
    }

    // Limpiar temporales
    for (const file of files) {
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
      }
    }

    // Procesar en background con mejor manejo de errores
    this.procesarUploadEnBackground(realSesionId, carpeta, password, fechaExpiracion, archivosBuffers, usuario)
      .catch((error) => {
        this.loggerService.logError(
          'SesionesService',
          `Error fatal en background para sesión ${realSesionId}`,
          error instanceof Error ? error : new Error(String(error)),
        );
      });

    return {
      sesionId: realSesionId,
      message: 'Sesión creada. El procesamiento de archivos, email y notificaciones continúa en segundo plano.',
    };
  }

  // ============================================
  // PROCESAMIENTO EN BACKGROUND - CORREGIDO
  // ============================================
  private async procesarUploadEnBackground(
    sesionId: number,
    carpeta: string,
    password: string,
    fechaExpiracion: Date,
    archivos: { nombre: string; buffer: Buffer; size: number }[],
    usuario: string,
  ): Promise<void> {
    let nextcloudOk = false;
    let shareUrl = '';

    try {
      // ─── 1. NEXTCLOUD ──────────────────────────────────────
      await this.nextcloudService.createFolder(carpeta);
      nextcloudOk = true;

      let archivosCompletados = 0;
      for (const archivo of archivos) {
        const remotePath = `${carpeta}/${archivo.nombre}`;
        await this.nextcloudService.uploadFile(remotePath, archivo.buffer);
        const verified = await this.nextcloudService.verifyUpload(remotePath, archivo.size);
        if (!verified) {
          throw new InternalServerErrorException(`Verificación fallida para ${archivo.nombre}`);
        }

        const doc = this.documentoRepository.create({
          sesionId,
          nombreArchivo: archivo.nombre,
          tamanoBytes: archivo.size,
          rutaRemota: remotePath,
        });
        await this.documentoRepository.save(doc);

        // Incrementar contador de archivos subidos
        archivosCompletados++;
        await this.sesionRepository.update(
          { id: sesionId },
          { archivosSubidos: archivosCompletados }
        );
        this.loggerService.info('SesionesService', `Archivo ${archivosCompletados}/${archivos.length} subido: ${archivo.nombre}`);
      }

      const share = await this.nextcloudService.createShare(
        carpeta, password, fechaExpiracion.toISOString().split('T')[0]
      );
      shareUrl = share.url;
      await this.sesionRepository.update({ id: sesionId }, { urlNextcloud: share.url });

      // ─── 2. BACKUP (con try/catch independiente) ─────────────
      try {
        const archivosParaBackup = archivos.map(a => ({ nombre: a.nombre, contenido: a.buffer }));
        const backupResult = await this.backupService.respaldarSesion(carpeta, archivosParaBackup);
        if (backupResult.ok) {
          await this.sesionRepository.update({ id: sesionId }, { respaldoOk: true });
        }
      } catch (backupError) {
        this.loggerService.logError(
          'SesionesService',
          `Backup falló para sesión ${sesionId}, pero continuamos`,
          backupError instanceof Error ? backupError : new Error(String(backupError)),
        );
        // NO fallamos todo por un error de backup
      }

      // ─── 3. EMAIL (con try/catch independiente) ─────────────
      const sesion = await this.sesionRepository.findOne({ where: { id: sesionId } });
      const nombresArchivos = archivos.map(a => a.nombre);

      let emailOk = false;
      let emailError = '';
      try {
        const emailResult = await this.emailService.enviarNotificacionSesion({
          titulo: sesion!.titulo,
          tipoSesion: sesion!.tipoSesion,
          fecha: this.formatFecha(sesion!.fechaSesion),
          hora: sesion!.horaSesion,
          urlNextcloud: shareUrl,
          password,
          fechaExpiracion: fechaExpiracion.toISOString().split('T')[0],
          archivos: nombresArchivos,
        });

        if (emailResult.ok) {
          emailOk = true;
          await this.sesionRepository.update(
            { id: sesionId },
            { emailEnviado: true, emailMensaje: emailResult.message }
          );
          this.loggerService.info('SesionesService', `Email enviado para sesión ${sesionId}`);
        } else {
          emailError = emailResult.message;
          this.loggerService.logError(
            'SesionesService',
            `Email falló para sesión ${sesionId}: ${emailResult.message}`,
            new Error(emailResult.message),
          );
        }
      } catch (emailErr) {
        const errorMsg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        emailError = errorMsg;
        this.loggerService.logError(
          'SesionesService',
          `Excepción enviando email para sesión ${sesionId}`,
          emailErr instanceof Error ? emailErr : new Error(errorMsg),
        );
        // NO fallamos todo por un error de email
      }

      // ─── 4. WHATSAPP (con try/catch independiente) ──────────
      let waResult: WhatsAppSendResult;
      try {
        waResult = await this.whatsAppService.enviarNotificacionSesion({
          titulo: sesion!.titulo,
          tipoSesion: sesion!.tipoSesion,
          fecha: this.formatFecha(sesion!.fechaSesion),
          hora: sesion!.horaSesion,
          urlNextcloud: shareUrl,
          password,
          archivos: nombresArchivos,
        });
      } catch (waError) {
        this.loggerService.logError('SesionesService', `Excepción en WhatsApp para sesión ${sesionId}`, waError as Error);
        waResult = { ok: false, mensaje: `Excepción: ${(waError as Error).message}` };
      }

      if (waResult.ok) {
        const sesionToUpdate = await this.sesionRepository.findOne({ where: { id: sesionId } });
        if (sesionToUpdate) {
          sesionToUpdate.whatsappEnviado = true;
          sesionToUpdate.whatsappMensaje = waResult.mensaje;
          await this.sesionRepository.save(sesionToUpdate);
          this.loggerService.info('SesionesService', `WhatsApp enviado para sesión ${sesionId}`);
        }
      } else {
        this.loggerService.logError('SesionesService', `WhatsApp falló para sesión ${sesionId}: ${waResult.mensaje}`, new Error('WhatsApp send failed'));
      }

      // Estado final
      if (emailOk && waResult.ok) {
        this.loggerService.info('SesionesService', `Sesión ${sesionId} completada exitosamente por ${usuario}`);
      } else if (!emailOk || !waResult.ok) {
        // Marcamos como parcial si algo falló pero Nextcloud funciona
        await this.sesionRepository.update(
          { id: sesionId },
          {
            notas: `Procesamiento parcial. Email: ${emailOk ? 'OK' : 'FALLÓ - ' + emailError}. WhatsApp: ${waResult.ok ? 'OK' : 'FALLÓ - ' + waResult.mensaje}`
          }
        );
      }

    } catch (error) {
      // Solo hacemos rollback de Nextcloud si falló antes de crear el share
      if (nextcloudOk && !shareUrl) {
        try { await this.nextcloudService.deleteFile(carpeta); } catch (e) { /* ignore */ }
      }

      await this.sesionRepository.update(
        { id: sesionId },
        {
          estado: 'error',
          notas: error instanceof Error ? error.message : 'Error desconocido en procesamiento'
        }
      );

      this.loggerService.logError(
        'SesionesService',
        `Error fatal en background ${sesionId}`,
        error instanceof Error ? error : new Error(String(error)),
      );

      // Relanzamos para que el catch externo lo registre
      throw error;
    }
  }

  // ============================================
  // CRUD BÁSICO
  // ============================================
  async create(createSesionDto: CreateSesionDto): Promise<Sesion> {
    try {
      // FIX: Validar duplicados comparando fecha como rango de un día
      const [cy, cm, cd] = createSesionDto.fechaSesion.split('-').map(Number);
      const cFechaInicio = new Date(cy, cm - 1, cd, 0, 0, 0);
      const cFechaFin = new Date(cy, cm - 1, cd, 23, 59, 59);

      const existing = await this.sesionRepository.findOne({
        where: {
          fechaSesion: Between(cFechaInicio, cFechaFin),
          titulo: ILike(createSesionDto.titulo),
        },
      });

      // DESPUÉS: devuelve advertencia pero continúa
      // Opción A: agregar campo "warning" a la respuesta de createWithUpload
      if (existing) {
        // Log de advertencia pero no lanzar excepción
        this.loggerService.info('SesionesService', 
          `Advertencia: sesión similar existente (id ${existing.id}) para fecha ${createSesionDto.fechaSesion}`
        );
        // Puedes agregar el warning a la respuesta:
        // return { sesionId: ..., message: '...', warning: 'Ya existe una sesión similar...' }
      }

      if (!createSesionDto.tipoSesion) {
        createSesionDto.tipoSesion = 'presencial';
      }

      const sesion = this.sesionRepository.create(createSesionDto);
      return await this.sesionRepository.save(sesion);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException('No se pudo crear la sesión: ' + mensaje);
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: SesionesFilter,
  ): Promise<PaginatedResponse<Sesion>> {
    try {
      const where: any = {};

      if (filters?.estado) where.estado = filters.estado;
      if (filters?.emailEnviado !== undefined) where.emailEnviado = filters.emailEnviado;
      if (filters?.titulo) where.titulo = ILike(`%${filters.titulo}%`);

      if (filters?.fechaDesde && filters?.fechaHasta) {
        const [dy, dm, dd] = filters.fechaDesde.split('-').map(Number);
        const [hy, hm, hd] = filters.fechaHasta.split('-').map(Number);
        // Inicio del día "desde" y fin del día "hasta", ambos en hora local
        where.fechaSesion = Between(
          new Date(dy, dm - 1, dd, 0, 0, 0),
          new Date(hy, hm - 1, hd, 23, 59, 59),
        );
      } else if (filters?.fechaDesde) {
        const [dy, dm, dd] = filters.fechaDesde.split('-').map(Number);
        where.fechaSesion = Between(new Date(dy, dm - 1, dd, 0, 0, 0), new Date('2099-12-31'));
      } else if (filters?.fechaHasta) {
        const [hy, hm, hd] = filters.fechaHasta.split('-').map(Number);
        where.fechaSesion = Between(new Date('1900-01-01'), new Date(hy, hm - 1, hd, 23, 59, 59));
      }

      const [data, total] = await this.sesionRepository.findAndCount({
        where,
        relations: ['documentos'],
        order: { fechaSesion: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data,
        meta: { total, page, lastPage: Math.ceil(total / limit) || 1, limit },
      };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      this.loggerService.logError('SesionesService', 'Error en findAll', error as Error);
      throw new InternalServerErrorException('Error al obtener sesiones: ' + mensaje);
    }
  }

  async findOne(id: number): Promise<Sesion> {
    const sesion = await this.sesionRepository.findOne({
      where: { id },
      relations: ['documentos'],
    });

    if (!sesion) {
      throw new NotFoundException(`No existe la sesión con ID: ${id}`);
    }

    return sesion;
  }

  async update(id: number, updateSesionDto: UpdateSesionDto): Promise<Sesion> {
    try {
      const sesion = await this.findOne(id);

      if (updateSesionDto.fechaSesion && updateSesionDto.titulo) {
        // FIX: Validar duplicados comparando fecha como rango de un día
        const [uy, um, ud] = updateSesionDto.fechaSesion.split('-').map(Number);
        const uFechaInicio = new Date(uy, um - 1, ud, 0, 0, 0);
        const uFechaFin = new Date(uy, um - 1, ud, 23, 59, 59);

        const existing = await this.sesionRepository.findOne({
          where: {
            fechaSesion: Between(uFechaInicio, uFechaFin),
            titulo: ILike(updateSesionDto.titulo),
          },
        });

        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Ya existe otra sesión con la fecha "${updateSesionDto.fechaSesion}" y título "${updateSesionDto.titulo}"`,
          );
        }
      }

      await this.sesionRepository.update({ id }, updateSesionDto);
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException('No se pudo actualizar la sesión: ' + mensaje);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const sesion = await this.findOne(id);
      await this.sesionRepository.update({ id }, { estado: 'inactivo' });
      return { message: `Sesión "${sesion.titulo}" marcada como inactiva` };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException('No se pudo eliminar la sesión: ' + mensaje);
    }
  }

  async cambiarEstado(id: number, estado: string): Promise<Sesion> {
    const estadosPermitidos = ['activo', 'inactivo', 'archivado'];
    if (!estadosPermitidos.includes(estado)) {
      throw new BadRequestException(
        `Estado no válido. Estados permitidos: ${estadosPermitidos.join(', ')}`,
      );
    }

    await this.sesionRepository.update({ id }, { estado });
    return await this.findOne(id);
  }

  async marcarEmailEnviado(id: number, mensaje: string): Promise<Sesion> {
    await this.sesionRepository.update(
      { id },
      { emailEnviado: true, emailMensaje: mensaje },
    );
    return await this.findOne(id);
  }

  async marcarRespaldoOk(id: number): Promise<Sesion> {
    await this.sesionRepository.update({ id }, { respaldoOk: true });
    return await this.findOne(id);
  }

  async marcarWhatsappEnviado(id: number, mensaje: string): Promise<Sesion> {
    await this.sesionRepository.update(
      { id },
      { whatsappEnviado: true, whatsappMensaje: mensaje },
    );
    return await this.findOne(id);
  }

  async retryWhatsapp(id: number): Promise<WhatsAppSendResult> {
    const sesion = await this.findOne(id);
    const nombresArchivos = sesion.documentos?.map((d) => d.nombreArchivo) || [];

    const result = await this.whatsAppService.enviarNotificacionSesion({
      titulo: sesion.titulo,
      tipoSesion: sesion.tipoSesion || 'presencial',
      fecha: this.formatFecha(sesion.fechaSesion),
      hora: sesion.horaSesion,
      urlNextcloud: sesion.urlNextcloud || '',
      password: sesion.password || '',
      archivos: nombresArchivos,
    });

    if (result.ok) {
      await this.marcarWhatsappEnviado(id, result.mensaje);
    }

    return result;
  }

  async findByRangoFechas(desde: string, hasta: string): Promise<Sesion[]> {
    return this.sesionRepository.find({
      where: {
        fechaSesion: Between(new Date(desde), new Date(hasta)) as any,
      },
      order: { fechaSesion: 'DESC' },
    });
  }

  async findCandidatasRotacion(fechaLimite: Date, limit: number): Promise<Sesion[]> {
    return this.sesionRepository.find({
      where: {
        estado: 'activo',
        fechaSesion: LessThan(fechaLimite),
      },
      order: { fechaSesion: 'ASC' },
      take: limit,
      relations: ['documentos'],
    });
  }

  async updateEstado(id: number, estado: string): Promise<void> {
    await this.sesionRepository.update({ id }, { estado });
  }

  async agregarDocumento(
    sesionId: number,
    nombreArchivo: string,
    tamanoBytes: number,
    rutaRemota?: string,
  ): Promise<Documento> {
    const documento = this.documentoRepository.create({
      sesionId,
      nombreArchivo,
      tamanoBytes,
      rutaRemota,
    });
    return this.documentoRepository.save(documento);
  }

  async findDocumentosBySesion(sesionId: number): Promise<Documento[]> {
    return this.documentoRepository.find({
      where: { sesionId },
      order: { fechaSubida: 'DESC' },
    });
  }

  // ============================================
  // LIMPIEZA DE ARCHIVOS TEMPORALES
  // ============================================
  async limpiarArchivosTemporales(): Promise<void> {
    const cleanupMinutes = this.configService.get<number>('UPLOAD_CLEANUP_AFTER_MINUTES', 60);
    const tempPath = this.configService.get<string>('UPLOAD_TEMP_PATH', '/app/uploads/temp');

    if (cleanupMinutes <= 0) return;

    try {
      const fs = await import('fs');
      const path = await import('path');

      if (!fs.existsSync(tempPath)) return;

      const ahora = Date.now();
      const maxAgeMs = cleanupMinutes * 60 * 1000;
      const files = fs.readdirSync(tempPath);
      let eliminados = 0;

      for (const file of files) {
        const filePath = path.join(tempPath, file);
        try {
          const stats = fs.statSync(filePath);
          if (ahora - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(filePath);
            eliminados++;
          }
        } catch (e) {
          // Ignorar errores de archivos individuales
        }
      }

      if (eliminados > 0) {
        this.loggerService.info('SesionesService', `Limpieza temporal: ${eliminados} archivo(s) eliminado(s) de ${tempPath}`);
      }
    } catch (error) {
      this.loggerService.logError('SesionesService', 'Error limpiando archivos temporales', error as Error);
    }
  }
}