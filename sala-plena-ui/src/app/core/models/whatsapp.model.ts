// ============================================================
// src/app/dashboard/models/whatsapp.model.ts
// ============================================================
export interface WhatsAppStatus {
  estado: string;
  mensaje: string;
  info?: {
    nombreGrupo?: string;
    numeroVocales?: number;
  };
  qr?: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  mensaje: string;
  messageId?: string;
}

export interface WhatsAppHealth {
  ok: boolean;
  estado: string;
  mensaje: string;
  puedeEnviar: boolean;
}


export interface SendNotificationDto {
  titulo: string;
  tipoSesion: string;
  fecha: string;
  hora: string;
  urlNextcloud: string;
  password: string;
  archivos?: string[];
}

export interface SendToNumbersDto {
  numeros: string[];
  mensaje: string;
}
