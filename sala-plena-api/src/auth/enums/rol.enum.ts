/**
 * Enum de roles del sistema.
 * Debe coincidir con los valores del backend de usuarios.
 */
export enum Role {
  /** Administrador del sistema - Acceso total */
  Admin = 1,
  /** Recursos Humanos - Gestión de personal */
  Rrhh = 2,
  /** Usuario estándar - Acceso limitado */
  Usuario = 3,
}
