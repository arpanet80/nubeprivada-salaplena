export interface SessionProgress {
  sesionId: number;
  etapa: 'iniciando' | 'validando' | 'subiendo' | 'verificando' | 'share' | 'backup' | 'email' | 'whatsapp' | 'completado' | 'error';
  porcentaje: number;
  mensaje: string;
  detalle?: string;
  timestamp: string;
}