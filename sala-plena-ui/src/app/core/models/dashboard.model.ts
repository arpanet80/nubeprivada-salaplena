// ============================================================
// src/app/dashboard/models/dashboard.model.ts
// ============================================================
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
  ultimasSesiones: UltimaSesion[];
  ultimaRotacion: UltimaRotacion | null;
}

export interface UltimaSesion {
  id: number;
  titulo: string;
  fecha: string;
  hora: string;
  tipo: string;
  estado: string;
}

export interface UltimaRotacion {
  fecha: string;
  archivadas: number;
  espacioLiberado: number;
}
