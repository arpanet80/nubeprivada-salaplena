// ============================================================
// src/app/dashboard/models/sesion.model.ts
// ============================================================
export interface Sesion {
  id: number;
  carpeta: string;
  titulo: string;
  fechaSesion: string;
  horaSesion: string;
  tipoSesion: string;
  fechaExpiracion: string;
  estado: 'activo' | 'inactivo' | 'archivado';
  urlNextcloud?: string;
  password?: string;
  respaldoOk: boolean;
  emailEnviado: boolean;
  emailMensaje?: string;
  whatsappEnviado: boolean;
  whatsappMensaje?: string;
  usuarioRegistro: string;
  documentos?: Documento[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Documento {
  id: number;
  sesionId: number;
  nombreArchivo: string;
  tamanoBytes: number;
  rutaRemota?: string;
  fechaSubida?: string;
}

export interface CreateSesionDto {
  titulo: string;
  fechaSesion: string;
  horaSesion: string;
  tipoSesion?: string;
  usuarioRegistro?: string;
}

export interface CreateSesionUploadDto extends CreateSesionDto {
  // Se envía como FormData, los campos van junto con los files
}

export interface UpdateSesionDto {
  titulo?: string;
  fechaSesion?: string;
  horaSesion?: string;
  tipoSesion?: string;
  estado?: string;
}

export interface SessionProgress {
  sesionId: number;
  etapa: string;
  porcentaje: number;
  mensaje: string;
  detalle?: string;
  timestamp: string;
}

export interface SesionesFilter {
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  titulo?: string;
  emailEnviado?: boolean;
}
