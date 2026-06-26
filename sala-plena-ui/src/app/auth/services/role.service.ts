import { inject, Injectable } from '@angular/core';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';
import { RoleHelper } from '../enums/role.enum';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  private logger = inject(LoggerService);

  hasAnyRole(requiredRoles: number[]): boolean {
    if (!this.authService.isAuthenticated()) {
      this.logger.debug('RoleService: Usuario no autenticado');
      return false;
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const currentUser = this.tokenService.getCurrentUser();
    if (!currentUser?.roles) {
      this.logger.warn('RoleService: No se pudo obtener usuario o roles');
      return false;
    }

    const userRoleIds = currentUser.roles.map(p => p.idrol);

    return requiredRoles.some(r => RoleHelper.hasRole(userRoleIds, r));
  }
}
