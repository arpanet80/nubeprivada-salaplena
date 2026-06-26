import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { NotificacionService } from '../../core/services/notificacion.service';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';
import { TokenService } from '../services/token.service';
import { RoleHelper } from '../enums/role.enum';

export const roleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const notificacionService = inject(NotificacionService);
  const logger = inject(LoggerService);

  const requiredRolesRaw = (route.data['roles'] || route.data['role']) as number[] | undefined;

  if (!requiredRolesRaw || requiredRolesRaw.length === 0) {
    return true;
  }

  const requiredRoles: number[] = requiredRolesRaw;

  function checkRoles(): boolean {
    const user = tokenService.getCurrentUser();
    if (!user?.roles) {
      logger.warn('roleGuard: sin roles en el usuario');
      return false;
    }

    const userRoleIds = user.roles.map(p => p.idrol);
    const ok = requiredRoles.some(r => RoleHelper.hasRole(userRoleIds, r));

    if (!ok) {
      notificacionService.showError('No tiene permisos para acceder a esta sección.', 'Acceso Denegado');
      router.navigate(['/dashboard/home']);
    }
    return ok;
  }

  if (authService.isAuthenticated()) {
    return checkRoles();
  }

  // No hay refresh token en este backend
  logger.warn('roleGuard: usuario no autenticado, redirigiendo al login');
  tokenService.saveLastURL(state.url);
  router.navigate(['/auth/login']);
  return false;
};
