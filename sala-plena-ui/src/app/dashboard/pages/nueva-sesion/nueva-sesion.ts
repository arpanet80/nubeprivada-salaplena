import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, Subscription } from 'rxjs';
import { takeWhile, switchMap } from 'rxjs/operators';
import { SpinnerService } from '../../../core/components/spinner/spinner.service';
import { ToastrAlertService } from '../../../core/services/toastr-alert.service';
import { SweetAlertService } from '../../../core/services/sweet-alert.service';
import { SessionProgress, CreateSesionUploadDto } from '../../../core/models/sesion.model';
import { SesionesService } from '../../../core/services/sesiones.service';

@Component({
  selector: 'app-nueva-sesion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nueva-sesion.html',
  styleUrl: './nueva-sesion.css'
})
export class NuevaSesion implements OnInit {
  private sesionesService = inject(SesionesService);
  private spinnerService = inject(SpinnerService);
  private sweetAlert = inject(SweetAlertService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // ─── Formulario ───────────────────────────────────────────
  titulo = signal<string>('Sala Plena Ordinaria');
  fechaSesion = signal<string>('');
  horaSesion = signal<string>('14:00');
  tipoSesion = signal<string>('presencial');
  selectedFiles = signal<File[]>([]);
  dragOver = signal<boolean>(false);

  // ─── Estado de publicación ────────────────────────────────
  isPublishing = signal<boolean>(false);

  // ─── Progreso ─────────────────────────────────────────────
  progress = signal<SessionProgress | null>(null);
  progressVisible = signal<boolean>(false);
  resultVisible = signal<boolean>(false);
  resultData = signal<any>(null);
  errorMessage = signal<string>('');

  // ─── Estado del envío WhatsApp ──────────────────────────
  whatsappEnviadoOk = signal<boolean>(false);
  mensajeWhatsapp = signal<string>('');
  verificandoWhatsapp = signal<boolean>(false);

  // ─── Modal de confirmación manual ───────────────────────
  confirmModalVisible = signal<boolean>(false);

  // ─── Validaciones ─────────────────────────────────────────
  minDate = computed(() => {
    const today = new Date();
    return this.toISODate(today);
  });

  isFormValid = computed(() => {
    return this.titulo().trim().length > 0 &&
           this.fechaSesion().length > 0 &&
           this.horaSesion().length > 0 &&
           this.selectedFiles().length > 0;
  });

  totalSize = computed(() => {
    return this.selectedFiles().reduce((sum, f) => sum + f.size, 0);
  });

  tiposSesion = [
    { value: 'presencial', label: 'Presencial' },
    { value: 'virtual', label: 'Virtual' },
    { value: 'mixta', label: 'Mixta' }
  ];

  ngOnInit(): void {
    const today = new Date();
    this.fechaSesion.set(this.toISODate(today));
  }

  /**
   * Convierte fecha local a string YYYY-MM-DD sin problemas de timezone.
   */
  private toISODate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ─── Drag & Drop ──────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private addFiles(files: File[]): void {
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    if (pdfFiles.length === 0) {
      this.sweetAlert.warning('Solo se permiten archivos PDF', 'Formato no válido');
      return;
    }

    const current = this.selectedFiles();
    const newFiles = [...current, ...pdfFiles];

    const maxSize = 100 * 1024 * 1024;
    const oversized = pdfFiles.filter(f => f.size > maxSize);
    if (oversized.length > 0) {
      this.sweetAlert.warning(
        `Archivo(s) exceden 100MB: ${oversized.map(f => f.name).join(', ')}`,
        'Tamaño excedido'
      );
      return;
    }

    if (newFiles.length > 50) {
      this.sweetAlert.warning('Máximo 50 archivos permitidos', 'Límite excedido');
      return;
    }

    this.selectedFiles.set(newFiles);
  }

  removeFile(index: number): void {
    const files = [...this.selectedFiles()];
    files.splice(index, 1);
    this.selectedFiles.set(files);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ─── Verificar duplicado ──────────────────────────────────
  /**
   * FIX: Ya no se pregunta al usuario si desea continuar.
   * Si existe una sesión con la misma fecha + título, se muestra
   * un warning (no error, el usuario puede corregirlo) y se bloquea
   * el envío hasta que cambie el título o la fecha.
   */
  private verificarDuplicado(): Promise<boolean> {
    return new Promise((resolve) => {
      this.sesionesService.findAll(1, 1, {
        fechaDesde: this.fechaSesion(),
        fechaHasta: this.fechaSesion(),
        titulo: this.titulo().trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.data && response.data.length > 0) {
            this.sweetAlert.warning(
              `Ya existe una sesión registrada con la fecha "${this.fechaSesion()}" y un título similar. Modifique el título o la fecha para continuar.`,
              'Sesión duplicada'
            );
            resolve(false);
          } else {
            resolve(true);
          }
        },
        error: () => resolve(true)
      });
    });
  }

  // ─── Submit ───────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.isPublishing()) {
      console.log('[NuevaSesion] Submit bloqueado: ya hay una publicación en curso');
      return;
    }

    if (!this.isFormValid()) {
      this.sweetAlert.validationError('Complete todos los campos y seleccione al menos un PDF');
      return;
    }

    const fechaHora = new Date(`${this.fechaSesion()}T${this.horaSesion()}`);
    const ahora = new Date();
    if (fechaHora < ahora) {
      this.sweetAlert.warning('La fecha y hora de la sesión no pueden ser pasadas', 'Fecha inválida');
      return;
    }

    const esUnica = await this.verificarDuplicado();
    if (!esUnica) return;

    this.isPublishing.set(true);
    this.spinnerService.show();
    this.progressVisible.set(true);
    this.errorMessage.set('');
    this.progress.set({
      sesionId: 0,
      etapa: 'iniciando',
      porcentaje: 5,
      mensaje: `Iniciando publicación de sesión... (${this.selectedFiles().length} archivo(s) - ${this.formatBytes(this.totalSize())})`,
      timestamp: new Date().toISOString(),
    });

    const dto: CreateSesionUploadDto = {
      titulo: this.titulo().trim(),
      fechaSesion: this.fechaSesion(),
      horaSesion: this.horaSesion(),
      tipoSesion: this.tipoSesion()
    };

    const files = this.selectedFiles();

    this.sesionesService.createWithUpload(dto, files)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          this.spinnerService.hide();

          if (response && response.sesionId) {
            console.log(`[NuevaSesion] Sesión creada con ID: ${response.sesionId}, iniciando polling...`);
            this.subscribeToProgress(response.sesionId);
          } else {
            this.isPublishing.set(false);
            this.progressVisible.set(false);
            this.errorMessage.set('Respuesta inesperada del servidor');
            this.sweetAlert.error('Respuesta inesperada del servidor', 'Error');
          }
        },
        error: (err) => {
          this.isPublishing.set(false);
          this.spinnerService.hide();
          this.progressVisible.set(false);
          const status = err.status;
          const msg = err.error?.message || err.message || 'Error desconocido';
          this.errorMessage.set(msg);

          // FIX: Conflict 409 es un WARNING, no un error
          if (status === 409) {
            this.sweetAlert.warning(msg, 'Sesión duplicada');
          } else {
            this.sweetAlert.error(msg, 'Error al publicar sesión');
          }
        }
      });
  }

  // ─── Polling de progreso ──────────────────────────────────
  private subscribeToProgress(sesionId: number): void {
    this.sesionesService.getProgressStream(sesionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: SessionProgress) => {
          console.log('[NuevaSesion] Progreso:', data);
          this.progress.set(data);

          if (data.etapa === 'completado') {
            this.isPublishing.set(false);
            this.progressVisible.set(false);
            this.resultVisible.set(true);

            if (data.detalle) {
              const urlMatch = data.detalle.match(/URL:\s*([^|]+)/);
              const passMatch = data.detalle.match(/Contraseña:\s*(\S+)/);
              this.resultData.set({
                id: sesionId,
                urlNextcloud: urlMatch ? urlMatch[1].trim() : '',
                password: passMatch ? passMatch[1].trim() : ''
              });
            }

            // Iniciar polling del estado real
            this.verificarEstadoWhatsappConPolling(sesionId);

          } else if (data.etapa === 'error') {
            this.isPublishing.set(false);
            this.progressVisible.set(false);
            this.errorMessage.set(data.mensaje);
            this.sweetAlert.error(data.mensaje, 'Error en publicación');
          }
        },
        error: (err) => {
          console.error('[NuevaSesion] Error en progreso:', err);
          this.isPublishing.set(false);
          this.progressVisible.set(false);
          this.errorMessage.set('Error en la conexión de progreso');
          this.sweetAlert.error('Error en la conexión de progreso', 'Error');
        }
      });
  }

  /**
   * FIX: Polling del estado de WhatsApp corregido.
   * Antes se detenía apenas email+url estaban listos, sin esperar
   * a que WhatsApp realmente terminara de enviarse (el backend envía
   * el email ANTES que el WhatsApp, así que en el primer poll donde
   * email ya estaba OK, whatsappEnviado todavía podía ser false, y el
   * polling se cortaba ahí dando un falso "no enviado").
   * Ahora el polling sigue corriendo hasta que whatsappEnviado sea
   * true, o hasta agotar los intentos.
   */
  private verificarEstadoWhatsappConPolling(sesionId: number): void {
    this.verificandoWhatsapp.set(true);
    this.whatsappEnviadoOk.set(false);
    let intentos = 0;
    const maxIntentos = 12; // 12 intentos × 5 segundos = 60 segundos máximo

    const sub = interval(5000)
      .pipe(
        switchMap(() => this.sesionesService.getStatus(sesionId))
      )
      .subscribe({
        next: (status: any) => {
          intentos++;

          const whatsappOk = status.whatsappEnviado === true;
          const archivosSubidos = status.archivosSubidos || 0;
          const totalArchivos = status.totalArchivos || this.selectedFiles().length;

          console.log(`[NuevaSesion] Polling ${intentos}/${maxIntentos}: whatsapp=${whatsappOk}, archivos=${archivosSubidos}/${totalArchivos}`);

          // Actualizar progreso con info de archivos subidos
          if (totalArchivos > 0 && archivosSubidos < totalArchivos) {
            this.progress.set({
              sesionId: sesionId,
              etapa: 'subiendo',
              porcentaje: Math.round((archivosSubidos / totalArchivos) * 80) + 5,
              mensaje: `Procesando... ${archivosSubidos} de ${totalArchivos} archivos subidos`,
              detalle: `Subiendo archivos a Nextcloud...`,
              timestamp: new Date().toISOString(),
            });
          }

          // Guardar datos para el mensaje de WhatsApp
          this.generarMensajeWhatsapp(status);

          // Solo paramos de verificar cuando WhatsApp ya se confirmó como enviado
          if (whatsappOk) {
            this.verificandoWhatsapp.set(false);
            this.whatsappEnviadoOk.set(true);
            sub.unsubscribe();
            console.log('[NuevaSesion] WhatsApp confirmado como enviado');
            this.programarRedireccionAutomatica();
            return;
          }

          // Timeout: recién aquí asumimos que no se envió y mostramos opción manual
          if (intentos >= maxIntentos) {
            this.verificandoWhatsapp.set(false);
            this.whatsappEnviadoOk.set(false);
            sub.unsubscribe();
            console.log('[NuevaSesion] Timeout de polling alcanzado, WhatsApp NO confirmado');
          }
        },
        error: (err) => {
          console.error('[NuevaSesion] Error en polling de WhatsApp:', err);
          this.verificandoWhatsapp.set(false);
          this.whatsappEnviadoOk.set(false);
          sub.unsubscribe();
        }
      });
  }

  // Programa la redirección automática después de 5 segundos
  private programarRedireccionAutomatica(): void {
    console.log('[NuevaSesion] Todo completado. Redirigiendo en 5 segundos...');
    setTimeout(() => {
      console.log('[NuevaSesion] Redirigiendo a /dashboard/home');
      this.router.navigate(['/dashboard/home']);
    }, 5000);
  }

  // Generar mensaje de WhatsApp para copiar
  private generarMensajeWhatsapp(status: any): void {
    const titulo = status.titulo || this.titulo();
    const tipo = (status.tipoSesion || 'presencial').toUpperCase();
    const fecha = this.formatFechaDisplay(status.fechaSesion || this.fechaSesion());
    const hora = status.horaSesion || this.horaSesion();
    const url = status.urlNextcloud || '';
    const password = status.password || '';
    const docs = status.documentos || [];

    const nombresArchivos = docs.length > 0
      ? docs.map((d: any, i: number) => `${i + 1}. ${d.nombreArchivo || d.name || 'Documento'}`).join('\n')
      : 'No se especificaron documentos';

    const mensaje = `
🏛️ *TRIBUNAL ELECTORAL DEPARTAMENTAL DE POTOSÍ*
*CITACIÓN A REUNIÓN DE SALA PLENA*

📋 *Título:* ${titulo}
📋 *Modalidad:* ${tipo}
📅 *Fecha:* ${fecha}
🕐 *Hora:* ${hora}

🔗 *Enlace:* ${url}
🔑 *Contraseña:* ${password}

📄 *Documentos disponibles para revisión:*
${nombresArchivos}

Por favor no comparta este enlace.
    `.trim();

    this.mensajeWhatsapp.set(mensaje);
  }

  /**
   * FIX: Envío manual de WhatsApp con fallback para clipboard no disponible.
   * En contextos no seguros (HTTP), navigator.clipboard puede ser undefined.
   */
  /**
   * FIX: Envío manual de WhatsApp con múltiples fallbacks para copiar el mensaje.
   * Intenta: 1) Clipboard API, 2) execCommand, 3) textarea + select, 4) solo abrir WA Web
   */
  envioManualWhatsapp(): void {
    const mensaje = this.mensajeWhatsapp();
    if (!mensaje) {
      console.warn('[NuevaSesion] No hay mensaje para copiar');
      return;
    }

    let copiado = false;

    // Método 1: Clipboard API (requiere HTTPS o localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText(mensaje).then(() => {
          console.log('[NuevaSesion] Mensaje copiado via Clipboard API');
          this.sweetAlert.toast('Mensaje copiado al portapapeles', 'success', 'top-end');
          window.open('https://web.whatsapp.com', '_blank');
          this.confirmModalVisible.set(true);
        }).catch((err) => {
          console.warn('[NuevaSesion] Clipboard API falló:', err);
          this.copiarConFallback(mensaje);
        });
        return; // Async, salimos aquí
      } catch (e) {
        console.warn('[NuevaSesion] Clipboard API excepción:', e);
      }
    }

    // Método 2: Fallback sincrónico
    this.copiarConFallback(mensaje);
  }

  /**
   * Fallback de copiado usando execCommand o textarea
   */
  private copiarConFallback(texto: string): void {
    let copiado = false;

    // Método 2a: document.execCommand (deprecated pero funciona en HTTP)
    const textArea = document.createElement('textarea');
    textArea.value = texto;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      copiado = document.execCommand('copy');
      if (copiado) {
        console.log('[NuevaSesion] Mensaje copiado via execCommand');
        this.sweetAlert.toast('Mensaje copiado al portapapeles', 'success', 'top-end');
      }
    } catch (err) {
      console.warn('[NuevaSesion] execCommand falló:', err);
    }

    document.body.removeChild(textArea);

    // Siempre abrir WhatsApp Web, aunque no se haya copiado
    window.open('https://web.whatsapp.com', '_blank');
    this.confirmModalVisible.set(true);

    if (!copiado) {
      console.warn('[NuevaSesion] No se pudo copiar automáticamente. El usuario debe copiar manualmente.');
    }
  }

  // Confirmar envío manual
  confirmarEnvioManual(enviado: boolean): void {
    this.confirmModalVisible.set(false);

    if (enviado) {
      const sesionId = this.resultData()?.id;
      if (sesionId) {
        this.sesionesService.marcarWhatsappEnviado(sesionId, 'Enviado manualmente por el usuario')
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.sweetAlert.success('Notificación registrada como enviada', 'Éxito');
              this.router.navigate(['/dashboard/home']);
            },
            error: () => {
              this.router.navigate(['/dashboard/home']);
            }
          });
      } else {
        this.router.navigate(['/dashboard/home']);
      }
    } else {
      this.sweetAlert.info('Puede reenviar la notificación desde el panel de notificaciones', 'Reenvío disponible');
      this.router.navigate(['/dashboard/notificacion'], {
        queryParams: { sesionId: this.resultData()?.id }
      });
    }
  }

  // ─── Cancelar ───────────────────────────────────────────
  onCancel(): void {
    this.resetForm();
    this.router.navigate(['/dashboard/home']);
  }

  resetForm(): void {
    this.titulo.set('Sala Plena Ordinaria');
    const today = new Date();
    this.fechaSesion.set(this.toISODate(today));
    this.horaSesion.set('14:00');
    this.tipoSesion.set('presencial');
    this.selectedFiles.set([]);
    this.progress.set(null);
    this.progressVisible.set(false);
    this.resultVisible.set(false);
    this.resultData.set(null);
    this.errorMessage.set('');
    this.isPublishing.set(false);
    this.whatsappEnviadoOk.set(false);
    this.mensajeWhatsapp.set('');
    this.verificandoWhatsapp.set(false);
    this.confirmModalVisible.set(false);
  }

  copyToClipboard(text: string): void {
    if (!text) return;
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      console.warn('[NuevaSesion] Clipboard API no disponible');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      this.sweetAlert.success('Copiado al portapapeles', 'Copiado');
    }).catch((err) => {
      console.error('[NuevaSesion] Error copiando:', err);
    });
  }

  /**
   * FIX: Formatear fecha sin aplicar timezone offset.
   * Para strings YYYY-MM-DD, extrae los componentes directamente.
   */
  private formatFechaDisplay(fecha: string | Date): string {
    if (!fecha) return '';

    // Si es string YYYY-MM-DD, extraer componentes directamente
    if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = fecha.split('-');
      return `${day}/${month}/${year}`;
    }

    // Para Date u otros formatos, usar toLocaleDateString con timezone explícito
    const d = new Date(fecha);
    return d.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/La_Paz'
    });
  }
}