
// ============================================================
// src/app/dashboard/services/email.service.ts
// ============================================================
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { SendEmailDto, EmailSendResult } from '../models/email.model';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private http = inject(HttpClient);
  private url = environment.apiUrl?.endsWith('/') ? environment.apiUrl : `${environment.apiUrl}/`;
  private baseUrl = `${this.url}email`;

  sendEmail(dto: SendEmailDto): Observable<EmailSendResult> {
    return this.http.post<EmailSendResult>(`${this.baseUrl}/send`, dto);
  }
}
