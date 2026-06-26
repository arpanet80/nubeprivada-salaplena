// ============================================================
// src/app/dashboard/models/email.model.ts
// ============================================================
export interface SendEmailDto {
  destinatarios: string[];
  asunto: string;
  cuerpoHtml: string;
  cuerpoTexto?: string;
}

export interface EmailSendResult {
  ok: boolean;
  message: string;
  messageId?: string;
}

export interface NotificacionSesionParams {
  destinatarios?: string[];
  titulo: string;
  tipoSesion: string;
  fecha: string;
  hora: string;
  urlNextcloud: string;
  password: string;
  fechaExpiracion: string;
  archivos?: string[];
}
