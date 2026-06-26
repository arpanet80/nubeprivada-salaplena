import { Injectable, signal } from '@angular/core';
import { UsuarioSalaPlena } from '../interfaces/usuario';

export interface AuthState {
  user: UsuarioSalaPlena | null;
  loading: boolean;
  error: string | null;
  lastActivity: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private readonly _user = signal<UsuarioSalaPlena | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _lastActivity = signal<Date | null>(null);

  public readonly user = this._user.asReadonly();
  public readonly loading = this._loading.asReadonly();
  public readonly error = this._error.asReadonly();
  public readonly lastActivity = this._lastActivity.asReadonly();

  setUser(user: UsuarioSalaPlena | null): void {
    this._user.set(user);
    this._error.set(null);
    this.updateLastActivity();
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  updateLastActivity(): void {
    this._lastActivity.set(new Date());
  }

  getState(): AuthState {
    return {
      user: this._user(),
      loading: this._loading(),
      error: this._error(),
      lastActivity: this._lastActivity()
    };
  }

  reset(): void {
    this._user.set(null);
    this._loading.set(false);
    this._error.set(null);
    this._lastActivity.set(null);
  }

  isInactive(minutes: number = 30): boolean {
    const lastActivity = this._lastActivity();
    if (!lastActivity) return true;
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    return diffInMinutes > minutes;
  }
}
