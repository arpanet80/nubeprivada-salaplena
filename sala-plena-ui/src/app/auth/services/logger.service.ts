import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private currentLogLevel: LogLevel = environment.production ? LogLevel.ERROR : LogLevel.DEBUG;

  // Lista de palabras sensibles que no deben aparecer en logs
  private sensitiveKeywords = [
    'password',
    'contrasena',
    'token',
    'jwt',
    'secret',
    'api_key',
    'apikey',
    'authorization',
    'cookie',
    'session'
  ];

  constructor() {}

  /**
   * Sanitiza datos sensibles antes de hacer log
   */
  private sanitize(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (typeof data === 'object' && data !== null) {
      return this.sanitizeObject(data);
    }

    return data;
  }

  private sanitizeString(str: string): string {
    // Ocultar tokens JWT
    return str.replace(/eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, '[JWT_TOKEN_HIDDEN]');
  }

  private sanitizeObject(obj: any): any {
    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();

        // Ocultar valores de campos sensibles
        if (this.sensitiveKeywords.some(keyword => lowerKey.includes(keyword))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }

    return sanitized;
  }

  /**
   * Formatea el mensaje de log
   */
  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? `\n${JSON.stringify(this.sanitize(data), null, 2)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  /**
   * Log de debug (solo desarrollo)
   */
  debug(message: string, data?: any): void {
    if (this.currentLogLevel <= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  /**
   * Log de información
   */
  info(message: string, data?: any): void {
    if (this.currentLogLevel <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  /**
   * Log de advertencia
   */
  warn(message: string, data?: any): void {
    if (this.currentLogLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  /**
   * Log de error
   */
  error(message: string, error?: any): void {
    if (this.currentLogLevel <= LogLevel.ERROR) {
      const sanitizedError = error ? this.sanitize(error) : null;
      console.error(this.formatMessage('ERROR', message, sanitizedError));
    }
  }

  /**
   * Cambiar nivel de log dinámicamente
   */
  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Log de eventos de seguridad (siempre se registra)
   */
  security(event: string, details?: any): void {
    const sanitized = this.sanitize(details);
    console.warn(this.formatMessage('SECURITY', event, sanitized));

    // En producción, aquí podrías enviar a un servicio de monitoreo
    if (environment.production) {
      this.sendToMonitoring(event, sanitized);
    }
  }

  /**
   * Enviar logs críticos a servicio de monitoreo (implementar según necesidad)
   */
  private sendToMonitoring(event: string, details?: any): void {
    // TODO: Implementar envío a servicio de monitoreo externo
    // Ejemplo: Sentry, LogRocket, etc.
  }
}
