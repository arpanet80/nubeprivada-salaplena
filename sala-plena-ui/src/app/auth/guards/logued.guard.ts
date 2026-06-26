import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { LoggerService } from '../services/logger.service';

export const loguedGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const logger = inject(LoggerService);

  if (authService.isAuthenticated()) {
    return true;
  }

  // No hay refresh token en este backend
  logger.warn('Sin sesión válida, redirigiendo al login');
  tokenService.saveLastURL(state.url);
  router.navigate(['/auth/login']);
  return false;
};
