import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { EstadosService } from './core/services/estados.service';
import { KeenInitializerService } from './core/services/keen-initializer.service';
import { environment } from '../environments/environment';
import { catchError, filter, takeUntil } from 'rxjs/operators';
import { forkJoin, of, Subject } from 'rxjs';
import { AuthService } from './auth/services/auth.service';
import { InactivityService } from './auth/services/inactivity.service';
import { LoggerService } from './auth/services/logger.service';
import { ApiService } from './core/services/api.service';
import { ToastrAlertService } from './core/services/toastr-alert.service';
import { TokenService } from './auth/services/token.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private estadosService = inject(EstadosService);
  private keenInitializer = inject(KeenInitializerService);
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private inactivityService = inject(InactivityService);
  private logger = inject(LoggerService);
  private router = inject(Router);
  private toastr = inject(ToastrAlertService);
  private tokenService = inject(TokenService);

  catalogosCargados = signal(false);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.initializeApp();
    this.setupRouterLogging();
    this.setupInactivityMonitoring();
    this.setupSecurityHeaders();
    this.preventDevToolsInProduction();
    this.setupAuthChangeListener();
    this.cargarCatalogosGlobales();
  }

  private initializeApp(): void {
    this.logger.info('App: inicializando aplicación', {
      version: '1.0.0',
      environment: environment.production ? 'production' : 'development',
      timestamp: new Date().toISOString()
    });

    if (this.authService.isAuthenticated()) {
      const user = this.tokenService.getCurrentUser();
      if (user) {
        this.estadosService.estadoUsuario.set(user);
      }
      this.logger.info('App: sesión activa detectada en initializeApp');
    } else {
      this.logger.info('App: sin sesión activa al iniciar');
    }
  }

  private setupAuthChangeListener(): void {
    let wasAuthenticated = this.authService.isAuthenticated();

    this.logger.debug('App: setupAuthChangeListener — estado inicial', {
      wasAuthenticated: wasAuthenticated
    });

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const isAuthenticated = this.authService.isAuthenticated();

        if (isAuthenticated && !wasAuthenticated) {
          this.logger.info('App: LOGIN detectado por navegación');
          this.cargarCatalogosGlobales();
          if (!this.inactivityService.isMonitoringActive()) {
            this.logger.info('App: iniciando InactivityService tras login');
            this.inactivityService.startMonitoring();
          }
        }

        if (!isAuthenticated && wasAuthenticated) {
          this.logger.info('App: LOGOUT detectado por navegación');
          this.limpiarCatalogos();
          if (this.inactivityService.isMonitoringActive()) {
            this.inactivityService.stopMonitoring();
          }
        }

        wasAuthenticated = isAuthenticated;
      });
  }

  private setupRouterLogging(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.logger.debug('App: navegación completada', {
          url: event.urlAfterRedirects,
          timestamp: new Date().toISOString()
        });
      });
  }

  private setupInactivityMonitoring(): void {
    const enableMonitoring = environment.security?.enableInactivityMonitoring ?? true;

    this.logger.info('App: setupInactivityMonitoring', {
      enableMonitoring: enableMonitoring,
      isAuthenticated: this.authService.isAuthenticated(),
      isMonitoringActive: this.inactivityService.isMonitoringActive()
    });

    if (!enableMonitoring) {
      this.logger.warn('App: monitoreo de inactividad DESHABILITADO en configuración');
      return;
    }

    if (this.authService.isAuthenticated()) {
      if (!this.inactivityService.isMonitoringActive()) {
        this.logger.info('App: iniciando InactivityService (estado inicial)');
        this.inactivityService.startMonitoring();
      } else {
        this.logger.debug('App: InactivityService ya activo al iniciar');
      }
    } else {
      this.logger.debug('App: no se inicia InactivityService — sin sesión');
    }

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const isAuthenticated = this.authService.isAuthenticated();
        const isMonitoring = this.inactivityService.isMonitoringActive();

        if (isAuthenticated && !isMonitoring) {
          this.logger.info('App: iniciando InactivityService tras navegación');
          this.inactivityService.startMonitoring();
        } else if (!isAuthenticated && isMonitoring) {
          this.logger.info('App: deteniendo InactivityService (sin sesión)');
          this.inactivityService.stopMonitoring();
        }
      });
  }

  private setupSecurityHeaders(): void {
    if (!environment.features?.enableSecurityHeaders) {
      return;
    }
    this.verifySecurityHeaders();
  }

  private verifySecurityHeaders(): void {
    const requiredHeaders = [
      'X-Content-Type-Options',
      'Referrer-Policy'
    ];

    const missingHeaders = requiredHeaders.filter(header => {
      const meta = document.querySelector(`meta[http-equiv="${header}"]`);
      return !meta;
    });

    if (missingHeaders.length > 0) {
      this.logger.warn('App: headers de seguridad faltantes', {
        missing: missingHeaders
      });
    } else {
      this.logger.debug('App: headers de seguridad OK');
    }
  }

  private preventDevToolsInProduction(): void {
    if (!environment.production) {
      return;
    }

    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: () => {
        this.logger.security('DevTools detectadas en producción');
      }
    });

    console.log(element);
  }

  private limpiarCatalogos(): void {
    this.catalogosCargados.set(false);
    this.logger.debug('App: catálogos limpiados');
  }

  private cargarCatalogosGlobales(): void {
    if (this.catalogosCargados()) {
      this.logger.debug('App: catálogos ya cargados, omitiendo');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.logger.debug('App: sin autenticación — catálogos postergados');
      return;
    }

    this.logger.info('App: cargando catálogos globales...');

    forkJoin({
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.catalogosCargados.set(true);
          this.logger.info('App: catálogos globales cargados exitosamente');
        },
        error: (err) => {
          this.logger.error('App: error crítico cargando catálogos', err);
          this.toastr.error('Error al cargar catálogos de la aplicación');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.inactivityService.stopMonitoring();
    this.logger.info('App: aplicación destruida');
  }
}
