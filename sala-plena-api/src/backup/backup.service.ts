import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';
import { BackupResult, BackupVerifyResult } from './interfaces/backup-result.interface';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class BackupService {
  private readonly enabled: boolean;
  private readonly smbHost: string;
  private readonly smbShare: string;
  private readonly smbPath: string;
  private readonly smbUsername: string;
  private readonly smbPassword: string;
  private readonly smbDomain: string;
  private readonly devMock: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.enabled = this.parseBoolSafe(this.configService.get<string>('BACKUP_ENABLED'), true);
    this.smbHost = this.configService.get<string>('BACKUP_SMB_HOST', '10.51.15.91');
    this.smbShare = this.configService.get<string>('BACKUP_SMB_SHARE', 'SalaPlena');
    this.smbPath = this.configService.get<string>('BACKUP_SMB_PATH', '');

    // CORREGIDO: Usar cuenta de servicio genérica compartida por Nextcloud y Backup
    this.smbUsername = this.configService.get<string>('SERVICE_ACCOUNT_USER', '');
    this.smbPassword = this.configService.get<string>('SERVICE_ACCOUNT_PASSWORD', '');

    this.smbDomain = this.configService.get<string>('BACKUP_SMB_DOMAIN', 'oep.net');
    this.devMock = this.parseBoolSafe(this.configService.get<string>('BACKUP_DEV_MOCK'), false);

    if (this.devMock) {
      this.loggerService.logWarn('BackupService', '⚠️ MODO MOCK ACTIVO - Respaldo NO se ejecuta realmente');
    } else {
      this.loggerService.info('BackupService', `Respaldo real vía smbclient - host:${this.smbHost} share:${this.smbShare} domain:${this.smbDomain}`);
    }
  }

  private parseBoolSafe(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined || value === null) return defaultValue;
    const normalized = value.toString().trim().toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === '') return false;
    if (normalized === 'true' || normalized === '1') return true;
    return defaultValue;
  }

  // ============================================
  // RESPALDAR SESIÓN
  // ============================================
  async respaldarSesion(
    carpetaSesion: string,
    archivos: { nombre: string; contenido: Buffer }[],
  ): Promise<BackupResult> {
    if (!this.enabled) {
      return { ok: true, message: 'Respaldo deshabilitado' };
    }

    if (this.devMock) {
      const bytesRespaldados = archivos.reduce((sum, a) => sum + a.contenido.length, 0);
      this.loggerService.info('BackupService', `[MOCK] Simulando respaldo de ${archivos.length} archivo(s)`);
      return {
        ok: true,
        message: `[MOCK] Respaldo simulado: ${archivos.length} archivos`,
        carpeta: carpetaSesion,
        archivosRespaldados: archivos.length,
        bytesRespaldados,
      };
    }

    const errores: string[] = [];
    let archivosRespaldados = 0;
    let bytesRespaldados = 0;

    const remoteDir = this.buildRemotePath(carpetaSesion).replace(/\\/g, '/');
    const shareUrl = `//${this.smbHost}/${this.smbShare}`;

    this.loggerService.info('BackupService', `Iniciando respaldo en: ${shareUrl}/${remoteDir}`);

    try {
      // Crear carpeta
      try {
        await this.ejecutarSmbclient(shareUrl, `mkdir "${remoteDir}"`);
        this.loggerService.info('BackupService', `Carpeta creada: ${remoteDir}`);
      } catch (err) {
        const errMsg = (err as Error).message;
        if (errMsg.includes('NT_STATUS_OBJECT_NAME_COLLISION') || errMsg.includes('already exists')) {
          this.loggerService.info('BackupService', `Carpeta ya existe: ${remoteDir}`);
        } else {
          throw err; // Error grave, no continuar
        }
      }

      // Subir archivos
      for (const archivo of archivos) {
        try {
          const tempPath = path.join('/tmp', archivo.nombre);
          await fs.promises.writeFile(tempPath, new Uint8Array(archivo.contenido));

          const remoteFile = `${remoteDir}/${archivo.nombre}`;
          await this.ejecutarSmbclient(shareUrl, `put "${tempPath}" "${remoteFile}"`);

          await fs.promises.unlink(tempPath);

          archivosRespaldados++;
          bytesRespaldados += archivo.contenido.length;
          this.loggerService.info('BackupService', `Archivo respaldado: ${archivo.nombre}`);
        } catch (err) {
          const msg = `Error respaldando ${archivo.nombre}: ${(err as Error).message}`;
          errores.push(msg);
          this.loggerService.logError('BackupService', msg, err as Error);
        }
      }

      const ok = errores.length === 0;
      return {
        ok,
        message: ok
          ? `Respaldo exitoso: ${archivosRespaldados} archivos, ${this.formatBytes(bytesRespaldados)}`
          : `Respaldo con errores: ${errores.length} fallos de ${archivos.length}`,
        carpeta: carpetaSesion,
        archivosRespaldados,
        bytesRespaldados,
        errores: errores.length > 0 ? errores : undefined,
      };
    } catch (error) {
      this.loggerService.logError('BackupService', 'Error general en respaldo', error as Error);
      return {
        ok: false,
        message: `Error de conexión SMB: ${(error as Error).message}`,
        errores: [(error as Error).message],
      };
    }
  }

  // ============================================
  // VERIFICAR RESPALDO
  // ============================================
  async verificarRespaldo(carpetaSesion: string): Promise<BackupVerifyResult> {
    if (!this.enabled) {
      return { existe: false, archivos: 0, bytesTotales: 0, detalle: 'Respaldo deshabilitado' };
    }

    if (this.devMock) {
      return {
        existe: true,
        archivos: 1,
        bytesTotales: 1024,
        detalle: '[MOCK] Verificación simulada',
      };
    }

    const remoteDir = this.buildRemotePath(carpetaSesion).replace(/\\/g, '/');
    const shareUrl = `//${this.smbHost}/${this.smbShare}`;

    try {
      const stdout = await this.ejecutarSmbclient(shareUrl, `ls "${remoteDir}"`);
      const lines = stdout.split('\n').filter((l) => l.trim());
      // Filtrar líneas que son archivos (no encabezados ni vacíos)
      const fileLines = lines.filter((l) => {
        const trimmed = l.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('NT_STATUS') &&
               !trimmed.startsWith('blocks of size') &&
               trimmed.includes('  ');
      });

      return {
        existe: fileLines.length > 0,
        archivos: fileLines.length,
        bytesTotales: 0,
        detalle: `${fileLines.length} archivos encontrados en ${remoteDir}`,
      };
    } catch (error) {
      const errMsg = (error as Error).message;
      if (errMsg.includes('NT_STATUS_OBJECT_NAME_NOT_FOUND')) {
        return { existe: false, archivos: 0, bytesTotales: 0, detalle: 'Carpeta no encontrada' };
      }
      return { existe: false, archivos: 0, bytesTotales: 0, detalle: `Error: ${errMsg}` };
    }
  }

  // ============================================
  // EJECUTAR SMBCLIENT
  // ============================================
  private ejecutarSmbclient(shareUrl: string, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Formato: DOMAIN/user%password
      const authSpec = `${this.smbDomain}/${this.smbUsername}%${this.smbPassword}`;

      const args = [
        shareUrl,
        '-U', authSpec,
        '-c', command,
        '--debuglevel=0',
        '-m', 'SMB3',
      ];

      this.loggerService.info('BackupService', `Ejecutando: smbclient ${shareUrl} -U ${this.smbDomain}/${this.smbUsername}*** -c "${command}"`);

      const proc = spawn('smbclient', args, { timeout: 60000 });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) {
          // Algunos comandos exitosos pueden retornar código no cero
          if (stderr.includes('NT_STATUS_OBJECT_NAME_COLLISION') || stdout.includes('NT_STATUS_OBJECT_NAME_COLLISION')) {
            resolve(stdout);
          } else {
            reject(new Error(`smbclient exit ${code}: ${stderr || stdout}`));
          }
        } else {
          resolve(stdout);
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`smbclient no encontrado: ${err.message}. Instalar: sudo apt-get install smbclient`));
      });
    });
  }

  // ============================================
  // UTILIDADES
  // ============================================
  private buildRemotePath(carpetaSesion: string): string {
    if (!this.smbPath || this.smbPath.trim() === '') {
      return carpetaSesion;
    }
    return `${this.smbPath}\\${carpetaSesion}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}