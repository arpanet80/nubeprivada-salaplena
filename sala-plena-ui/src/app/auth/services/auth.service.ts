import { inject, Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { TokenService } from './token.service';
import { catchError, map, Observable, tap, throwError, timeout } from 'rxjs';
import { Subject } from 'rxjs';
import { BruteForceProtectionService } from './brute-force.service';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';
import { EstadosService } from '../../core/services/estados.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { LoginUser } from '../interfaces/login-user';
import { AuthResponse } from '../interfaces/usuario';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly baseUrl = environment.apiUrl; // Ajusta en environment.ts
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private notificacionService = inject(NotificacionService);
  private estadosService = inject(EstadosService);
  private bruteForceService = inject(BruteForceProtectionService);
  private logger = inject(LoggerService);

  private destroy$ = new Subject<void>();
  private readonly TIMEOUT_MS = 15_000;

  estadoUsuario = this.estadosService.estadoUsuario;

  login(usuario: string, password: string): Observable<boolean> {
    if (this.bruteForceService.isBlocked()) {
      const minutes = Math.ceil(this.bruteForceService.getRemainingBlockTime() / 60_000);
      this.notificacionService.showError(
        `Demasiados intentos fallidos. Intente en ${minutes} minutos.`,
        'Acceso Bloqueado'
      );
      return throwError(() => new Error('BLOCKED_BY_BRUTE_FORCE_PROTECTION'));
    }

    const credenciales: LoginUser = { usuario, password };

    return this.http.post<AuthResponse>(`${this.baseUrl}auth/login`, credenciales).pipe(
      timeout(this.TIMEOUT_MS),
      tap(response => {
        if (!response?.ok || !response?.accessToken) {
          throw new Error('Respuesta de login inválida');
        }
        this.tokenService.setStorageToken(response);
        this.bruteForceService.resetAttempts();
        this.logger.info('Login exitoso', { usuario: response.usuario, rol: response.rol });
      }),
      map(() => true),
      catchError((error: HttpErrorResponse) => {
        this.bruteForceService.recordFailedAttempt(usuario);
        this.notificacionService.showError(
          this.getLoginErrorMessage(error), 'Error de Autenticación'
        );
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.tokenService.removeStorageToken();
    this.estadosService.estadoUsuario.set(null);
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$ = new Subject<void>();
    this.logger.info('Sesión cerrada localmente');
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return this.tokenService.getTokenIsValid();
  }

  private getLoginErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0)   return 'Error de conexión. Verifique su internet.';
    if (error.status === 401) return 'Credenciales incorrectas.';
    if (error.status === 403) return 'Cuenta bloqueada o sin permisos. Contacte al administrador.';
    if (error.status === 429) return 'Demasiadas solicitudes. Intente más tarde.';
    return error.error?.message ?? 'Error desconocido';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
