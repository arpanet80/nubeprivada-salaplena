import { Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service';
import { NotificacionService } from '../../core/services/notificacion.service';

export interface AttemptInfo {
  count: number;
  lastAttempt: Date;
  blockedUntil?: Date;
  username?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BruteForceProtectionService {
  private notificacionService = inject(NotificacionService);
  private logger = inject(LoggerService);

  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_TIME = 15 * 60 * 1000; // 15 minutos base
  private readonly ATTEMPTS_KEY = 'login_attempts_v2';

  // Escalamiento exponencial de bloqueo
  private readonly BLOCK_MULTIPLIERS = [1, 2, 4, 8, 24]; // En horas

  constructor() {
    this.cleanupExpiredAttempts();
  }

  private getClientId(): string {
    // Intentar obtener IP real (si el backend la expone) o usar fingerprint básico
    // En producción, el backend debería rate-limitar por IP real
    const storedId = localStorage.getItem('client_fingerprint');
    if (storedId) return storedId;

    const fingerprint = this.generateFingerprint();
    localStorage.setItem('client_fingerprint', fingerprint);
    return fingerprint;
  }

  private generateFingerprint(): string {
    // Fingerprint básico del navegador (no único pero mejor que 'default')
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset()
    ];
    let hash = 0;
    const str = components.join('|');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'fp_' + Math.abs(hash).toString(16);
  }

  private cleanupExpiredAttempts(): void {
    try {
      const attempts = this.getAttempts();
      const now = new Date();
      let cleaned = false;

      for (const key in attempts) {
        const attempt = attempts[key];
        if (attempt.lastAttempt) {
          const hoursSinceLastAttempt = (now.getTime() - new Date(attempt.lastAttempt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastAttempt > 24) {
            delete attempts[key];
            cleaned = true;
          }
        }
      }

      if (cleaned) {
        this.saveAttempts(attempts);
        this.logger.debug('Intentos expirados limpiados');
      }
    } catch (error) {
      this.logger.error('Error limpiando intentos expirados', error);
    }
  }

  recordFailedAttempt(username?: string): void {
    try {
      const clientId = this.getClientId();
      const attempts = this.getAttempts();
      const now = new Date();

      if (!attempts[clientId]) {
        attempts[clientId] = {
          count: 0,
          lastAttempt: now
        };
      }

      attempts[clientId].count++;
      attempts[clientId].lastAttempt = now;
      if (username) {
        attempts[clientId].username = username;
      }

      if (attempts[clientId].count >= this.MAX_ATTEMPTS) {
        const blockIndex = Math.min(
          Math.floor(attempts[clientId].count / this.MAX_ATTEMPTS) - 1,
          this.BLOCK_MULTIPLIERS.length - 1
        );
        const blockHours = this.BLOCK_MULTIPLIERS[blockIndex];
        const blockTime = blockHours * 60 * 60 * 1000;

        attempts[clientId].blockedUntil = new Date(now.getTime() + blockTime);

        this.logger.security('Cuenta bloqueada por intentos excesivos', {
          clientId: clientId.substring(0, 8) + '...',
          attempts: attempts[clientId].count,
          blockHours: blockHours,
          timestamp: now.toISOString()
        });

        this.notificacionService.showWarning(
          `Demasiados intentos fallidos. Cuenta bloqueada por ${blockHours} hora(s).`,
          'Cuenta Bloqueada'
        );
      } else {
        const remaining = this.MAX_ATTEMPTS - attempts[clientId].count;
        if (remaining <= 2) {
          this.logger.warn(`Quedan ${remaining} intentos antes del bloqueo`);
        }
      }

      this.saveAttempts(attempts);
    } catch (error) {
      this.logger.error('Error registrando intento fallido', error);
    }
  }

  isBlocked(): boolean {
    try {
      const clientId = this.getClientId();
      const attempts = this.getAttempts();
      const attempt = attempts[clientId];

      if (!attempt || !attempt.blockedUntil) {
        return false;
      }

      const now = new Date();
      const blockedUntilDate = new Date(attempt.blockedUntil);

      if (now < blockedUntilDate) {
        return true;
      }

      // Bloqueo expirado: reducir contador a la mitad
      attempt.count = Math.floor(attempt.count / 2);
      delete attempt.blockedUntil;
      this.saveAttempts(attempts);

      this.logger.debug('Bloqueo expirado, intentos reducidos', { newCount: attempt.count });
      return false;
    } catch (error) {
      this.logger.error('Error verificando bloqueo', error);
      return false;
    }
  }

  getRemainingBlockTime(): number {
    try {
      const clientId = this.getClientId();
      const attempts = this.getAttempts();
      const attempt = attempts[clientId];

      if (!attempt?.blockedUntil) return 0;

      const now = new Date();
      const blockedUntilDate = new Date(attempt.blockedUntil);
      return Math.max(0, blockedUntilDate.getTime() - now.getTime());
    } catch (error) {
      this.logger.error('Error obteniendo tiempo de bloqueo', error);
      return 0;
    }
  }

  resetAttempts(): void {
    try {
      const clientId = this.getClientId();
      const attempts = this.getAttempts();

      if (attempts[clientId]) {
        this.logger.info('Intentos reseteados después de login exitoso');
        delete attempts[clientId];
        this.saveAttempts(attempts);
      }
    } catch (error) {
      this.logger.error('Error reseteando intentos', error);
    }
  }

  getAttemptCount(): number {
    try {
      const clientId = this.getClientId();
      const attempts = this.getAttempts();
      return attempts[clientId]?.count || 0;
    } catch (error) {
      this.logger.error('Error obteniendo contador de intentos', error);
      return 0;
    }
  }

  getAttemptInfo(): AttemptInfo | null {
    try {
      const clientId = this.getClientId();
      const attempts = this.getAttempts();
      return attempts[clientId] || null;
    } catch (error) {
      this.logger.error('Error obteniendo información de intentos', error);
      return null;
    }
  }

  private getAttempts(): { [key: string]: AttemptInfo } {
    try {
      const stored = localStorage.getItem(this.ATTEMPTS_KEY);
      if (!stored) return {};

      const parsed = JSON.parse(stored);

      for (const key in parsed) {
        if (parsed[key].lastAttempt) {
          parsed[key].lastAttempt = new Date(parsed[key].lastAttempt);
        }
        if (parsed[key].blockedUntil) {
          parsed[key].blockedUntil = new Date(parsed[key].blockedUntil);
        }
      }

      return parsed;
    } catch {
      return {};
    }
  }

  private saveAttempts(attempts: { [key: string]: AttemptInfo }): void {
    try {
      localStorage.setItem(this.ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch (error) {
      this.logger.error('Error guardando intentos', error);
    }
  }

  clearAllAttempts(): void {
    try {
      localStorage.removeItem(this.ATTEMPTS_KEY);
      this.logger.info('Todos los intentos limpiados');
    } catch (error) {
      this.logger.error('Error limpiando todos los intentos', error);
    }
  }

  getStatistics(): {
    totalIPs: number;
    blockedIPs: number;
    totalAttempts: number;
  } {
    try {
      const attempts = this.getAttempts();
      const now = new Date();
      let blocked = 0;
      let totalAttempts = 0;

      for (const key in attempts) {
        totalAttempts += attempts[key].count;
        if (attempts[key].blockedUntil && now < new Date(attempts[key].blockedUntil)) {
          blocked++;
        }
      }

      return {
        totalIPs: Object.keys(attempts).length,
        blockedIPs: blocked,
        totalAttempts: totalAttempts
      };
    } catch (error) {
      this.logger.error('Error obteniendo estadísticas', error);
      return { totalIPs: 0, blockedIPs: 0, totalAttempts: 0 };
    }
  }
}
