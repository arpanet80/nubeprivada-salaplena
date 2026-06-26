// ============================================================
// src/app/dashboard/models/rotacion.model.ts
// ============================================================
export interface Rotacion {
  id: number;
  sesionesArchivadas: number;
  espacioLiberadoMb: number;
  espacioRestantePercent: number;
  detalle: string;
  fechaEjecucion: string;
}

export interface RotationStatus {
  cron: string;
  nextRun: string;
}

export interface RotationResult {
  ok: boolean;
  mensaje: string;
  sesionesArchivadas: number;
  espacioLiberadoMb: number;
}
