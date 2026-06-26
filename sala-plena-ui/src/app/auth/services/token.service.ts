import { Injectable, inject } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import { LoggerService } from './logger.service';
import { EstadosService } from '../../core/services/estados.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { AuthResponse, UsuarioSalaPlena } from '../interfaces/usuario';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private jwtHelper = inject(JwtHelperService);
  private router = inject(Router);
  private notificacionService = inject(NotificacionService);
  private estadosService = inject(EstadosService);
  private logger = inject(LoggerService);

  estadoUsuario = this.estadosService.estadoUsuario;

  private readonly KEY_AUTH = 'auth_data_sala_plena';
  private readonly KEY_LAST_URL = 'ultimaurl';

  setStorageToken(value: AuthResponse): void {
    if (!value?.accessToken || !value?.usuario) {
      this.logger.error('AuthResponse inválida');
      throw new Error('Respuesta de login inválida');
    }

    const userInfo: UsuarioSalaPlena = {
      usuario: value.usuario,
      idrol: value.idrol,
      rol: value.rol,
      roles: value.roles || [{ idrol: value.idrol, nombreRol: value.rol }]
    };

    sessionStorage.setItem(this.KEY_AUTH, JSON.stringify({
      userInfo,
      accessToken: value.accessToken,
      expiresIn: value.expiresIn,
    }));
    this.estadoUsuario.set(userInfo);
  }

  getStorageToken(): { accessToken: string; userInfo: UsuarioSalaPlena; expiresIn: string } | null {
    try {
      const raw = sessionStorage.getItem(this.KEY_AUTH);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.accessToken || !data?.userInfo) return null;
      return data;
    } catch {
      this.removeStorageToken();
      return null;
    }
  }

  removeStorageToken(): void {
    sessionStorage.removeItem(this.KEY_AUTH);
    sessionStorage.removeItem(this.KEY_LAST_URL);
    this.estadoUsuario.set(null);
  }

  getAccessToken(): string | null {
    return this.getStorageToken()?.accessToken ?? null;
  }

  getCurrentUser(): UsuarioSalaPlena | null {
    return this.getStorageToken()?.userInfo ?? null;
  }

  getTokenIsValid(): boolean {
    const data = this.getStorageToken();
    if (!data?.accessToken) return false;

    try {
      if (this.jwtHelper.isTokenExpired(data.accessToken)) {
        this.logger.warn('Access token expirado');
        return false;
      }
      return true;
    } catch {
      this.logger.warn('Token malformado, limpiando sesión');
      this.removeStorageToken();
      return false;
    }
  }

  hasRole(roleId: number): boolean {
    const user = this.getCurrentUser();
    if (!user?.roles || !Array.isArray(user.roles)) return false;
    return user.roles.some(p => p.idrol === roleId);
  }

  hasAnyRole(roleIds: number[]): boolean {
    return roleIds.some(id => this.hasRole(id));
  }

  saveLastURL(url: string): void {
    if (url.includes('/auth/')) return;
    sessionStorage.setItem(this.KEY_LAST_URL, url);
  }

  getLastURL(): string | null {
    return sessionStorage.getItem(this.KEY_LAST_URL);
  }

  clearLastURL(): void {
    sessionStorage.removeItem(this.KEY_LAST_URL);
  }

  navigateToLastURL(): void {
    const url = this.getLastURL();
    this.router.navigate([url && url !== '/auth/login' ? url : '/dashboard/home']);
  }
}
