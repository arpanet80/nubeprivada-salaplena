import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { DashboardStats } from '../models/dashboard.model';
import { RotationResult, RotationStatus } from '../models/rotacion.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private url = environment.apiUrl?.endsWith('/') ? environment.apiUrl : `${environment.apiUrl}/`;
  private baseUrl = `${this.url}dashboard`;
  private rotationUrl = `${this.url}rotation`;

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.baseUrl);
  }

  getRotationStatus(): Observable<RotationStatus> {
    return this.http.get<RotationStatus>(`${this.rotationUrl}/status`);
  }

  executeRotation(): Observable<RotationResult> {
    return this.http.post<RotationResult>(`${this.rotationUrl}/execute`, {});
  }
}
