export interface BackupResult {
  ok: boolean;
  message: string;
  carpeta?: string;
  archivosRespaldados?: number;
  bytesRespaldados?: number;
  checksumVerificado?: boolean;
  errores?: string[];
}

export interface BackupVerifyResult {
  existe: boolean;
  archivos: number;
  bytesTotales: number;
  detalle: string;
}