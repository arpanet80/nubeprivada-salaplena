import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs';
import { LoggerService } from './logger.service';
import { AuthService } from './auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';

/**
 * Servicio de monitoreo de inactividad del usuario.
 *
 * Configuración:
 *   - INACTIVITY_TIMEOUT: 30 minutos de inactividad → logout
 *   - WARNING_BEFORE_LOGOUT: 5 minutos antes del logout → advertencia
 *   - CHECK_INTERVAL: verificación cada 10 segundos
 *   - debounceTime: 300ms para capturar actividad sin perder eventos rápidos
 */
@Injectable({
  providedIn: 'root'
})
export class InactivityService implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificacionService = inject(NotificacionService);
  private logger = inject(LoggerService);

  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000;      // 30 minutos
  private readonly WARNING_BEFORE_LOGOUT = 5 * 60 * 1000;     // 5 minutos antes
  private readonly CHECK_INTERVAL = 10 * 1000;                // 10 segundos
  private readonly DEBOUNCE_MS = 300;                         // 300ms debounce

  private lastActivity: Date = new Date();
  private inactivityTimer: any;
  private warningShown = false;
  private destroy$ = new Subject<void>();
  private _isActive = false;
  private activitySubscription: Subscription | null = null;

  /** Contador de eventos de actividad (para debug) */
  private activityEventCount = 0;

  constructor() {}

  isMonitoringActive(): boolean {
    return this._isActive;
  }

  /**
   * Inicia el monitoreo de inactividad.
   * Escucha eventos de usuario y verifica inactividad periódicamente.
   */
  startMonitoring(): void {
    if (this._isActive) {
      this.logger.debug('InactivityService: ya está activo, ignorando startMonitoring()');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.logger.warn('InactivityService: NO se inicia — usuario no autenticado');
      return;
    }

    this._isActive = true;
    this.lastActivity = new Date();
    this.warningShown = false;
    this.activityEventCount = 0;

    this.stopAllListeners();
    this.setupActivityListeners();
    this.setupVisibilityListener();
    this.startInactivityTimer();

    this.logger.info('InactivityService: MONITOREO INICIADO', {
      timeoutMin: this.INACTIVITY_TIMEOUT / 60000,
      warningAtMin: (this.INACTIVITY_TIMEOUT - this.WARNING_BEFORE_LOGOUT) / 60000,
      checkIntervalSec: this.CHECK_INTERVAL / 1000,
      debounceMs: this.DEBOUNCE_MS,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Detiene completamente el monitoreo.
   */
  stopMonitoring(): void {
    if (!this._isActive) {
      this.logger.debug('InactivityService: ya está detenido, ignorando stopMonitoring()');
      return;
    }

    this._isActive = false;
    this.clearInactivityTimer();
    this.stopAllListeners();
    this.destroy$.next();

    this.logger.info('InactivityService: MONITOREO DETENIDO', {
      totalActivityEvents: this.activityEventCount,
      timestamp: new Date().toISOString()
    });
  }

  // ── Activity Listeners ────────────────────────────────────────────────────

  private setupActivityListeners(): void {
    const eventNames = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];

    const userActivity$ = merge(
      ...eventNames.map(name => fromEvent(document, name))
    );

    this.activitySubscription = userActivity$
      .pipe(
        debounceTime(this.DEBOUNCE_MS),
        takeUntil(this.destroy$)
      )
      .subscribe((event: Event) => {
        this.activityEventCount++;

        // Log cada 50 eventos para no saturar la consola
        if (this.activityEventCount % 50 === 1) {
          this.logger.debug('InactivityService: actividad detectada', {
            eventType: event.type,
            totalEvents: this.activityEventCount,
            inactiveSec: Math.round((Date.now() - this.lastActivity.getTime()) / 1000)
          });
        }

        this.updateActivity();
      });
  }

  private stopAllListeners(): void {
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
      this.activitySubscription = null;
    }
    this.removeVisibilityListener();
  }

  // ── Page Visibility API ───────────────────────────────────────────────────

  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private removeVisibilityListener(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = (): void => {
    if (!this._isActive) return;

    if (document.hidden) {
      this.logger.debug('InactivityService: pestaña OCULTA');
    } else {
      this.logger.debug('InactivityService: pestaña VISIBLE — forzando check');
      this.checkInactivity(true);
    }
  };

  // ── Timer & Check Logic ───────────────────────────────────────────────────

  private updateActivity(): void {
    if (!this._isActive || !this.authService.isAuthenticated()) {
      return;
    }

    const wasWarningShown = this.warningShown;
    this.lastActivity = new Date();

    if (wasWarningShown) {
      this.warningShown = false;
      this.logger.info('InactivityService: sesión extendida por actividad del usuario');
    }
  }

  private startInactivityTimer(): void {
    this.clearInactivityTimer();

    this.inactivityTimer = setInterval(() => {
      this.checkInactivity(false);
    }, this.CHECK_INTERVAL);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Verifica el estado de inactividad.
   * @param forceCheck Si es true, fuerza el check sin importar el intervalo
   */
  private checkInactivity(forceCheck: boolean = false): void {
    if (!this.authService.isAuthenticated()) {
      this.logger.warn('InactivityService: usuario desautenticado durante check — deteniendo');
      this.stopMonitoring();
      return;
    }

    const now = Date.now();
    const inactiveTime = now - this.lastActivity.getTime();
    const inactiveMin = Math.floor(inactiveTime / 60000);
    const inactiveSec = Math.floor((inactiveTime % 60000) / 1000);

    // Log periódico cada 2 minutos de inactividad (para debug)
    if (inactiveMin > 0 && inactiveMin % 2 === 0 && inactiveSec < 15) {
      this.logger.debug('InactivityService: check periódico', {
        inactiveMin: inactiveMin,
        inactiveSec: inactiveSec,
        warningShown: this.warningShown,
        totalEvents: this.activityEventCount,
        forceCheck: forceCheck
      });
    }

    // Mostrar advertencia
    if (inactiveTime >= (this.INACTIVITY_TIMEOUT - this.WARNING_BEFORE_LOGOUT) && !this.warningShown) {
      this.showInactivityWarning(inactiveTime);
      this.warningShown = true;
      return;
    }

    // Cerrar sesión por inactividad
    if (inactiveTime >= this.INACTIVITY_TIMEOUT) {
      this.logoutDueToInactivity(inactiveTime);
    }
  }

  private showInactivityWarning(inactiveTimeMs: number): void {
    const minutesLeft = Math.ceil(this.WARNING_BEFORE_LOGOUT / 60000);
    const inactiveMin = Math.floor(inactiveTimeMs / 60000);

    this.logger.security('InactivityService: ADVERTENCIA MOSTRADA', {
      inactiveMin: inactiveMin,
      warningMinutesLeft: minutesLeft,
      totalActivityEvents: this.activityEventCount,
      timestamp: new Date().toISOString()
    });

    this.notificacionService.showWarning(
      `Su sesión expirará en ${minutesLeft} minutos por inactividad (${inactiveMin} min sin actividad). Realice cualquier acción para mantenerla activa.`,
      'Advertencia de Inactividad'
    );
  }

  private logoutDueToInactivity(inactiveTimeMs: number): void {
    const inactiveMin = Math.floor(inactiveTimeMs / 60000);

    this.logger.security('InactivityService: LOGOUT POR INACTIVIDAD', {
      inactiveMin: inactiveMin,
      totalActivityEvents: this.activityEventCount,
      timestamp: new Date().toISOString()
    });

    this.notificacionService.showWarning(
      `Su sesión ha sido cerrada por inactividad prolongada (${inactiveMin} minutos).`,
      'Sesión Expirada'
    );

    this.stopMonitoring();
    this.authService.logout();
  }

  // ── Getters públicos ──────────────────────────────────────────────────────

  getInactivityTime(): number {
    return Date.now() - this.lastActivity.getTime();
  }

  getTimeUntilLogout(): number {
    return Math.max(0, this.INACTIVITY_TIMEOUT - this.getInactivityTime());
  }

  isUserInactive(): boolean {
    return this.getInactivityTime() >= this.INACTIVITY_TIMEOUT;
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
    this.destroy$.complete();
  }
}
