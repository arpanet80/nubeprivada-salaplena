// src/app/modules/auth/models/profile.interface.ts
export interface PermisoRol {
  idrol: number;
  nombreRol: string;
}

export interface PerfilCompleto {
  id: number;
  idfuncionario: number;
  usuario: string;
  nombre: string;
  cargo: string;
  unidad: string;
  sistema: string;
  correo?: string;
  celular?: number;
  documento?: number;
  foto?: string;
  paterno?: string;
  materno?: string;
  fechaNacimiento?: Date | string;
  fechaIngreso?: Date | string;
  tipoFuncionario?: string;
  formacion?: string;
  citememorandum?: string;
  roles: number;
  permisos: PermisoRol[];
  activo: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  ultimoLogin?: Date | string;
}
