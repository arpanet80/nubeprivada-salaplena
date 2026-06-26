export interface AuthResponse {
  ok: boolean;
  usuario: string;
  idrol: number;
  rol: string;
  accessToken: string;
  expiresIn: string;
  roles?: PermisoSalaPlena[];
}

export interface UsuarioSalaPlena {
  usuario: string;
  idrol: number;
  rol: string;
  roles: PermisoSalaPlena[];
}

export interface PermisoSalaPlena {
  idrol: number;
  nombreRol: string;
}
