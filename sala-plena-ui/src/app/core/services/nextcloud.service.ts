// ============================================================
// src/app/dashboard/services/nextcloud.service.ts
// ============================================================
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  NextcloudQuota, NextcloudFileItem, NextcloudShare,
  CreateShareDto
} from '../models/nextcloud.model';

@Injectable({
  providedIn: 'root'
})
export class NextcloudService {
  private http = inject(HttpClient);
  private url = environment.apiUrl?.endsWith('/') ? environment.apiUrl : `${environment.apiUrl}/`;
  private baseUrl = `${this.url}nextcloud`;

  getQuota(): Observable<NextcloudQuota> {
    return this.http.get<NextcloudQuota>(`${this.baseUrl}/quota`);
  }

  browseDirectory(path?: string): Observable<NextcloudFileItem[]> {
    let params = new HttpParams();
    if (path) params = params.set('path', path);
    return this.http.get<NextcloudFileItem[]>(`${this.baseUrl}/browse`, { params });
  }

  createShare(dto: CreateShareDto): Observable<NextcloudShare> {
    return this.http.post<NextcloudShare>(`${this.baseUrl}/share`, dto);
  }

  findShare(path: string): Observable<NextcloudShare | null> {
    return this.http.get<NextcloudShare | null>(`${this.baseUrl}/share`, {
      params: new HttpParams().set('path', path)
    });
  }

  deleteShare(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/share/${id}`);
  }

  deleteFile(path: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/file`, {
      params: new HttpParams().set('path', path)
    });
  }

  debugConfig(): Observable<any> {
    return this.http.get(`${this.baseUrl}/debug-config`);
  }

  browseDebug(path?: string): Observable<any> {
    let params = new HttpParams();
    if (path) params = params.set('path', path);
    return this.http.get(`${this.baseUrl}/browse-debug`, { params });
  }
}
