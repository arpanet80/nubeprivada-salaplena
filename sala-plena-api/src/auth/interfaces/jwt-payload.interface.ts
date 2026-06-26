/**
 * Interfaz del payload del JWT emitido por ESTE backend (Sala Plena TED).
 * El backend ahora autentica contra LDAP y genera sus propios tokens.
 */
export interface PermisoUsuario {
  /** ID del rol asignado */
  idrol: number;
  /** Nombre del rol */
  nombreRol: string;
}

export interface JwtPayload {
  /** Nombre de usuario (login de AD) */
  usuario: string;
  /** ID del rol asignado */
  idrol: number;
  /** Array de roles del usuario */
  roles: PermisoUsuario[];
  /** Issued at (timestamp) */
  iat?: number;
  /** Expiration (timestamp) */
  exp?: number;
}
