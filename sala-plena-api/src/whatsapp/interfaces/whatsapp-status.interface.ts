export interface WhatsAppStatus {
  estado: 'desconectado' | 'conectando' | 'conectado' | 'autenticado' | 'fallo';
  mensaje: string;
  qr?: string; // Base64 del QR
  info?: {
    nombreGrupo?: string;
    numeroVocales?: number;
  };
}

export interface WhatsAppSendResult {
  ok: boolean;
  messageId?: string;
  mensaje: string;
}