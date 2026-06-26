import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, takeWhile, switchMap, of } from 'rxjs';
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
              `Ya existe una sesión con la fecha "${this.fechaSesion()}" y título "${this.titulo().trim()}". Cambie el título o la fecha.`,
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
      mensaje: 'Iniciando publicación de sesión...',
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
          const msg = err.error?.message || err.message || 'Error desconocido';
          this.errorMessage.set(msg);
          this.sweetAlert.error(msg, 'Error al publicar sesión');
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
            this.sweetAlert.success(data.mensaje, 'Publicación Completada');

            if (data.detalle) {
              const urlMatch = data.detalle.match(/URL:\s*([^|]+)/);
              const passMatch = data.detalle.match(/Contraseña:\s*(\S+)/);
              this.resultData.set({
                id: sesionId,
                urlNextcloud: urlMatch ? urlMatch[1].trim() : '',
                password: passMatch ? passMatch[1].trim() : ''
              });
            }

            // Iniciar polling del estado real en vez de consulta única
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

  // Polling del estado hasta confirmar WhatsApp (máx 30 segundos)
  private verificarEstadoWhatsappConPolling(sesionId: number): void {
    this.verificandoWhatsapp.set(true);
    let intentos = 0;
    const maxIntentos = 15; // 15 intentos × 2 segundos = 30 segundos máximo

    interval(2000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.sesionesService.getStatus(sesionId)),
        takeWhile((status: any) => {
          intentos++;
          const whatsappOk = status.whatsappEnviado === true;

          console.log(`[NuevaSesion] Polling intento ${intentos}/${maxIntentos}, whatsappEnviado=${status.whatsappEnviado}`);

          if (whatsappOk) {
            // WhatsApp confirmado como enviado
            this.whatsappEnviadoOk.set(true);
            this.generarMensajeWhatsapp(status);
            this.verificandoWhatsapp.set(false);
            // 🆕 REDIRECCIÓN AUTOMÁTICA tras 5 segundos
            this.programarRedireccionAutomatica();
            return false; // Detener polling
          }

          if (intentos >= maxIntentos) {
            // Timeout: asumir que no se envió
            this.whatsappEnviadoOk.set(false);
            this.generarMensajeWhatsapp(status);
            this.verificandoWhatsapp.set(false);
            return false; // Detener polling
          }

          // Seguir polleando
          return true;
        }, true) // Inclusive: emite el último valor que hace que se detenga
      )
      .subscribe({
        next: (status: any) => {
          // Último valor emitido
        },
        error: (err) => {
          console.error('[NuevaSesion] Error en polling de WhatsApp:', err);
          this.whatsappEnviadoOk.set(false);
          this.verificandoWhatsapp.set(false);
        }
      });
  }

  // 🆕 NUEVO: Programa la redirección automática después de 5 segundos
  private programarRedireccionAutomatica(): void {
    console.log('[NuevaSesion] WhatsApp enviado correctamente. Redirigiendo en 5 segundos...');
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

  // Envío manual de WhatsApp (fallback)
  envioManualWhatsapp(): void {
    const mensaje = this.mensajeWhatsapp();
    if (!mensaje) return;

    navigator.clipboard.writeText(mensaje).then(() => {
      this.sweetAlert.success('Mensaje copiado al portapapeles', 'Copiado');
      window.open('https://web.whatsapp.com', '_blank');
      this.confirmModalVisible.set(true);
    }).catch(() => {
      this.sweetAlert.error('No se pudo copiar el mensaje', 'Error');
    });
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
    navigator.clipboard.writeText(text).then(() => {
      this.sweetAlert.success('Copiado al portapapeles', 'Copiado');
    });
  }

  private formatFechaDisplay(fecha: string | Date): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
