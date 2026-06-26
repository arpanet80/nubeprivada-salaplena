import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificacionService } from '../../core/services/notificacion.service';
import { LoggerService } from '../services/logger.service';
import { createAppError, ErrorCode, getErrorMessage } from '../services/error-types';

// Estos endpoints manejan sus propios errores — no mostrar notificaciones aquí
const AUTH_URLS = ['/auth/login', '/auth/register', '/auth/logout'];

function isAuthUrl(url: string): boolean {
  return AUTH_URLS.some(u => url.includes(u));
}

function getServerErrorMessage(error: HttpErrorResponse): string {
  const backendMessage = error.error?.message || error.error?.error;
  if (backendMessage) return `${backendMessage} (Error ${error.status})`;

  switch (error.status) {
    case 0:   return 'No se pudo conectar con el servidor.';
    case 400: return 'Solicitud incorrecta.';
    case 401: return 'Su sesión ha expirado.';
    case 403: return 'Acceso denegado.';
    case 404: return 'Recurso no encontrado.';
    case 408: return 'Tiempo de espera agotado.';
    case 429: return 'Demasiadas solicitudes.';
    case 500: return 'Error interno del servidor.';
    case 503: return 'Servicio no disponible.';
    default:  return `Error ${error.status}: ${error.statusText}`;
  }
}

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
  const notificacionService = inject(NotificacionService);
  const logger              = inject(LoggerService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // Auth endpoints: dejar pasar sin notificación (el caller maneja)
      if (isAuthUrl(req.url)) {
        // Excepto errores de red en login/register: mostrar algo genérico
        if (error.status === 0 && req.url.includes('/auth/login')) {
          logger.error('Error de red en login', { url: req.url });
        }
        return throwError(() => error);
      }

      // Error de red (sin respuesta HTTP)
      if (error.error instanceof ErrorEvent) {
        const msg = 'Error de conexión. Verifique su internet.';
        notificacionService.showError(msg, 'Error');
        logger.error('Error de red', { url: req.url });
        return throwError(() => createAppError('NETWORK_ERROR', msg, 'medium'));
      }

      // Errores HTTP
      let message : string    = getServerErrorMessage(error);
      let notify  : boolean   = true;
      let code    : ErrorCode = 'CLIENT_ERROR';
      let severity: 'low' | 'medium' | 'high' = 'medium';

      switch (error.status) {
        case 400: code = 'VALIDATION_ERROR';    severity = 'low';    break;
        case 401: code = 'AUTH_EXPIRED';        severity = 'high';
          // No notificar: el tokenInterceptor ya maneja el refresh/logout
          notify = false;
          break;
        case 403: code = 'FORBIDDEN';           severity = 'medium';
          logger.security('Acceso denegado 403', { url: req.url }); break;
        case 404: code = 'NOT_FOUND';           severity = 'low';    notify = false; break;
        case 408: code = 'REQUEST_TIMEOUT';     severity = 'medium'; break;
        case 429: code = 'RATE_LIMITED';        severity = 'medium'; break;
        case 500: code = 'SERVER_ERROR';        severity = 'high';   break;
        case 503: code = 'SERVICE_UNAVAILABLE'; severity = 'high';   break;
      }

      const appError = createAppError(code, message, severity, { url: req.url, status: error.status });

      if (notify) {
        notificacionService.showError(getErrorMessage(appError), 'Error');
      }

      logger.error('HTTP error', { url: req.url, status: error.status });

      return throwError(() => appError);
    })
  );
};
