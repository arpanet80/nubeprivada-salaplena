import { Injectable, signal } from '@angular/core';
import { UsuarioSalaPlena } from '../../auth/interfaces/usuario';

@Injectable({
  providedIn: 'root'
})
export class EstadosService {

  public estadoUsuario = signal<UsuarioSalaPlena | null>(null);


  //////////////////////////////////////////////////////////////////
  /**
   * Verifica si el usuario tiene AL MENOS UN rol de los requeridos.
   * @param rolesSistema Roles permitidos por la ruta (ej. [1, 2])
   * @param rolesUsuario Roles del usuario logueado (ej. [1, 3])
   * @returns true si hay intersección
   */
  verificaArrayRoles(rolesSistema: number[] | undefined, rolesUsuario: number[] | undefined): boolean {
    if (!rolesSistema?.length || !rolesUsuario?.length) return false;
    return rolesSistema.some(rol => rolesUsuario.includes(rol));
  }

}
