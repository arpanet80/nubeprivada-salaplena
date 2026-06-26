import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, interval } from 'rxjs';
import { switchMap, takeWhile, map } from 'rxjs/operators';
import { PaginatedResponse } from '../../core/components/tabla-generica/tabla-column.model';
import {
  Sesion, CreateSesionDto, UpdateSesionDto,
  SessionProgress, SesionesFilter, CreateSesionUploadDto
} from '../models/sesion.model';

@Injectable({ providedIn: 'root' })
export class SesionesService {
  private http = inject(HttpClient);
  private url = environment.apiUrl?.endsWith('/') ? environment.apiUrl : `${environment.apiUrl}/`;
  private baseUrl = `${this.url}sesiones`;

  findAll(page = 1, limit = 10, filters?: SesionesFilter): Observable<PaginatedResponse<Sesion>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.fechaDesde) params = params.set('fechaDesde', filters.fechaDesde);
    if (filters?.fechaHasta) params = params.set('fechaHasta', filters.fechaHasta);
    if (filters?.estado) params = params.set('estado', filters.estado);
    if (filters?.titulo) params = params.set('titulo', filters.titulo);
    if (filters?.emailEnviado !== undefined) params = params.set('emailEnviado', filters.emailEnviado.toString());

    return this.http.get<PaginatedResponse<Sesion>>(this.baseUrl, { params });
  }

  findOne(id: number): Observable<Sesion> {
    return this.http.get<Sesion>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateSesionDto): Observable<Sesion> {
    return this.http.post<Sesion>(this.baseUrl, dto);
  }

  createWithUpload(dto: CreateSesionUploadDto, files: File[]): Observable<any> {
    const formData = new FormData();
    formData.append('titulo', dto.titulo);
    formData.append('fechaSesion', dto.fechaSesion);
    formData.append('horaSesion', dto.horaSesion);
    if (dto.tipoSesion) formData.append('tipoSesion', dto.tipoSesion);
    if (dto.usuarioRegistro) formData.append('usuarioRegistro', dto.usuarioRegistro);

    files.forEach(file => {
      formData.append('files', file, file.name);
    });

    return this.http.post(`${this.baseUrl}/upload`, formData);
  }

  update(id: number, dto: UpdateSesionDto): Observable<Sesion> {
    return this.http.patch<Sesion>(`${this.baseUrl}/${id}`, dto);
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  cambiarEstado(id: number, estado: string): Observable<Sesion> {
    return this.http.patch<Sesion>(`${this.baseUrl}/${id}/estado/${estado}`, {});
  }

  marcarEmailEnviado(id: number, mensaje: string): Observable<Sesion> {
    return this.http.patch<Sesion>(`${this.baseUrl}/${id}/email-enviado`, { mensaje });
  }

  marcarRespaldoOk(id: number): Observable<Sesion> {
    return this.http.patch<Sesion>(`${this.baseUrl}/${id}/respaldo-ok`, {});
  }

  retryEmail(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/retry-email`, {});
  }

  retryWhatsapp(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/retry-whatsapp`, {});
  }

  findByRangoFechas(desde: string, hasta: string): Observable<Sesion[]> {
    return this.http.get<Sesion[]>(`${this.baseUrl}/rango/${desde}/${hasta}`);
  }

  // ─── POLLING de progreso ──────────────────────────────────
  getProgressStream(id: number): Observable<SessionProgress> {
    return interval(2000).pipe(
      switchMap(() => this.getStatus(id)),
      map((status: any) => {
        let porcentaje = 5;
        let etapa: SessionProgress['etapa'] = 'iniciando';
        let mensaje = 'Iniciando publicación de sesión...';
        let detalle: string | undefined;

        if (status.completado) {
          porcentaje = 100;
          etapa = 'completado';
          mensaje = '¡Proceso terminado! Sesión publicada exitosamente.';
          detalle = `URL: ${status.urlNextcloud} | Contraseña: ${status.password}`;
        } else if (status.whatsappEnviado) {
          porcentaje = 90;
          etapa = 'whatsapp';
          mensaje = 'Enviando notificación por WhatsApp...';
        } else if (status.emailEnviado) {
          porcentaje = 80;
          etapa = 'email';
          mensaje = 'Enviando notificación por correo electrónico...';
        } else if (status.respaldoOk) {
          porcentaje = 65;
          etapa = 'backup';
          mensaje = 'Respaldando documentos en servidor...';
        } else if (status.urlNextcloud) {
          porcentaje = 50;
          etapa = 'share';
          mensaje = 'Creando enlace compartido seguro...';
        } else if (status.documentosCount > 0) {
          porcentaje = 30;
          etapa = 'subiendo';
          mensaje = 'Subiendo archivos a la Nube Privada...';
        }

        return {
          sesionId: id,
          etapa,
          porcentaje,
          mensaje,
          detalle,
          timestamp: new Date().toISOString(),
        } as SessionProgress;
      }),
      takeWhile((progress: SessionProgress) => progress.etapa !== 'completado' && progress.etapa !== 'error', true)
    );
  }

  /**
   * Obtener estado completo de una sesión (incluye whatsappEnviado, emailEnviado, etc.)
   */
  getStatus(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/status`);
  }

  /**
   * Marcar WhatsApp como enviado manualmente
   */
  marcarWhatsappEnviado(id: number, mensaje: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/whatsapp-enviado`, { mensaje });
  }
}
