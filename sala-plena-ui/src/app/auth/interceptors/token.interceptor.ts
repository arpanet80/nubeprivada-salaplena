import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';
import { TokenService } from '../services/token.service';

const EXCLUDED = ['/auth/login', '/auth/register', '/assets/', '.json'];

function isExcluded(url: string): boolean {
  return EXCLUDED.some(s => url.includes(s));
}

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const logger = inject(LoggerService);

  if (isExcluded(req.url)) return next(req);

  const accessToken = tokenService.getAccessToken();
  if (!accessToken) return next(req);

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
      'X-Application-Name': 'Sala-Plena-TED'
    }
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // El backend no tiene refresh token. Si 401, logout directo.
      if (error.status === 401) {
        logger.warn('Token inválido o expirado (401). Cerrando sesión.');
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
