
// ============================================================
// src/app/dashboard/services/whatsapp.service.ts
// ============================================================
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
  WhatsAppStatus, WhatsAppSendResult, SendNotificationDto, SendToNumbersDto
} from '../models/whatsapp.model';

export interface WhatsAppHealth {
  ok: boolean;
  estado: string;
  mensaje: string;
  puedeEnviar: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {
  private http = inject(HttpClient);
  private url = environment.apiUrl?.endsWith('/') ? environment.apiUrl : `${environment.apiUrl}/`;
  private baseUrl = `${this.url}whatsapp`;

  getStatus(): Observable<WhatsAppStatus> {
    return this.http.get<WhatsAppStatus>(`${this.baseUrl}/status`);
  }

  regenerateQr(): Observable<WhatsAppStatus> {
    return this.http.post<WhatsAppStatus>(`${this.baseUrl}/qr`, {});
  }

  sendMessage(mensaje: string): Observable<WhatsAppSendResult> {
    return this.http.post<WhatsAppSendResult>(`${this.baseUrl}/send`, { mensaje });
  }

  sendToIndividuals(mensaje: string): Observable<{ ok: boolean; resultados: WhatsAppSendResult[] }> {
    return this.http.post<{ ok: boolean; resultados: WhatsAppSendResult[] }>(`${this.baseUrl}/send-individual`, { mensaje });
  }

  sendToNumbers(dto: SendToNumbersDto): Observable<{ ok: boolean; enviados: number; fallidos: number; detalles: WhatsAppSendResult[] }> {
    return this.http.post<{ ok: boolean; enviados: number; fallidos: number; detalles: WhatsAppSendResult[] }>(`${this.baseUrl}/send-to`, dto);
  }

  notifySession(dto: SendNotificationDto): Observable<WhatsAppSendResult> {
    return this.http.post<WhatsAppSendResult>(`${this.baseUrl}/notify-session`, dto);
  }

  getHealth(): Observable<WhatsAppHealth> {
    return this.http.get<WhatsAppHealth>(`${this.baseUrl}/health`);
  }
}
