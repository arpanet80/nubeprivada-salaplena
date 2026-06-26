import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export interface ToastConfig {
  title?: string;
  message: string;
  options?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ToastrAlertService {
    private toastr = inject ( ToastrService )

  success(message: string, title: string = 'Éxito'): void {
    this.toastr.success(message, title, {
      timeOut: 3000,
      progressBar: true,
      closeButton: true
    });
  }

  error(message: string, title: string = 'Error'): void {
    this.toastr.error(message, title, {
      timeOut: 5000,
      progressBar: true,
      closeButton: true
    });
  }

  warning(message: string, title: string = 'Advertencia'): void {
    this.toastr.warning(message, title, {
      timeOut: 4000,
      progressBar: true,
      closeButton: true
    });
  }

  info(message: string, title: string = 'Información'): void {
    this.toastr.info(message, title, {
      timeOut: 3500,
      progressBar: true,
      closeButton: true
    });
  }

  custom(config: ToastConfig, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const defaultOptions = {
      timeOut: 3000,
      progressBar: true,
      closeButton: true
    };

    const options = { ...defaultOptions, ...config.options };

    this.toastr[type](config.message, config.title || '', options);
  }

  clear(): void {
    this.toastr.clear();
  }

  confirmAction(message: string): void {
    this.success(message, 'Acción completada');
  }

  validationError(message: string = 'Por favor, verifica los campos del formulario'): void {
    this.error(message, 'Error de validación');
  }

  serverError(message: string = 'Ha ocurrido un error en el servidor'): void {
    this.error(message, 'Error del servidor');
  }

  networkError(message: string = 'No se pudo conectar con el servidor'): void {
    this.error(message, 'Error de conexión');
  }

  sessionExpired(): void {
    this.warning('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'Sesión expirada');
  }

  unauthorized(): void {
    this.warning('No tienes permisos para realizar esta acción.', 'Acceso denegado');
  }
}
