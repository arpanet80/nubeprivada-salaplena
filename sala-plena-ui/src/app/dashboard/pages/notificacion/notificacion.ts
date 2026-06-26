import { Component, OnInit, signal, inject, DestroyRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerService } from '../../../core/components/spinner/spinner.service';
import { ToastrAlertService } from '../../../core/services/toastr-alert.service';
import { Sesion } from '../../../core/models/sesion.model';
import { SesionesService } from '../../../core/services/sesiones.service';
import { WhatsAppService } from '../../../core/services/whatsapp.service';
import { WhatsAppHealth, WhatsAppStatus } from '../../../core/models/whatsapp.model';

@Component({
  selector: 'app-notificacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificacion.html',
  styleUrl: './notificacion.css'
})
export class Notificacion implements OnInit {
  private sesionesService = inject(SesionesService);
  private whatsAppService = inject(WhatsAppService);
  private spinnerService = inject(SpinnerService);
  private toastr = inject(ToastrAlertService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  // ─── Lista de sesiones ───────────────────────────────────
  sesiones = signal<Sesion[]>([]);
  selectedSesion = signal<Sesion | null>(null);
  loading = signal<boolean>(false);
  loadingAction = signal<boolean>(false);

  // ─── WhatsApp estado ─────────────────────────────────────
  whatsappStatus = signal<WhatsAppStatus | null>(null);
  whatsappHealth = signal<WhatsAppHealth | null>(null);
  showQr = signal<boolean>(false);
  qrImage = signal<string>('');

  // ─── Mensaje generado ────────────────────────────────────
  mensajeGenerado = signal<string>('');

  // ─── Computed defensivos ─────────────────────────────────
  documentosSesion = computed(() => {
    const s = this.selectedSesion();
    if (!s) return [];
    const docs = (s as any).documentos || (s as any).archivos || (s as any).files || [];
    return Array.isArray(docs) ? docs : [];
  });

  passwordSesion = computed(() => {
    const s = this.selectedSesion();
    if (!s) return '';
    return (s as any).password || (s as any).sharePassword || (s as any).contrasena || (s as any).clave || '';
  });

  urlSesion = computed(() => {
    const s = this.selectedSesion();
    if (!s) return '';
    return (s as any).urlNextcloud || (s as any).shareUrl || (s as any).url || '';
  });

  // NUEVO: Indica si WhatsApp está realmente listo para enviar mensajes
  puedeEnviarWhatsapp = computed(() => {
    const health = this.whatsappHealth();
    return health?.puedeEnviar === true;
  });

  // NUEVO: Mensaje de estado de WhatsApp para mostrar al usuario
  mensajeWhatsappEstado = computed(() => {
    const health = this.whatsappHealth();
    if (!health) return 'Verificando estado...';
    if (health.puedeEnviar) return 'Conectado y listo';
    return health.mensaje || 'Desconectado';
  });

  ngOnInit(): void {
    this.cargarSesiones();
    this.cargarWhatsappHealth();

    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        if (params['sesionId']) {
          this.seleccionarSesionPorId(+params['sesionId']);
        }
      });
  }

  // ============================================
  // CARGAR SESIONES
  // ============================================
  cargarSesiones(): void {
    this.loading.set(true);
    this.sesionesService.findAll(1, 20, { estado: 'activo' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          // 🆕 ORDENAR por fecha_publicacion descendente (más reciente arriba)
          const ordenadas = response.data.sort((a: Sesion, b: Sesion) => {
            const fechaA = new Date((a as any).fecha_publicacion || `${a.fechaSesion}T${a.horaSesion}`);
            const fechaB = new Date((b as any).fecha_publicacion || `${b.fechaSesion}T${b.horaSesion}`);
            return fechaB.getTime() - fechaA.getTime();
          });

          this.sesiones.set(ordenadas);
          this.loading.set(false);

          if (!this.selectedSesion() && ordenadas.length > 0) {
            this.seleccionarSesion(ordenadas[0]);
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error('No se pudieron cargar las sesiones', 'Error');
        }
      });
  }

  // ============================================
  // WHATSAPP HEALTH CHECK (NUEVO)
  // ============================================
  cargarWhatsappHealth(): void {
    this.whatsAppService.getHealth()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (health) => {
          this.whatsappHealth.set(health);
          // Mantener compatibilidad con template que usa whatsappStatus
          this.whatsappStatus.set({
            estado: health.estado as any,
            mensaje: health.mensaje,
          });
        },
        error: () => {
          this.whatsappHealth.set({
            ok: false,
            estado: 'desconectado',
            mensaje: 'No se pudo verificar estado',
            puedeEnviar: false
          });
          this.whatsappStatus.set({
            estado: 'desconectado',
            mensaje: 'No se pudo obtener estado'
          });
        }
      });
  }

  // Mantener por compatibilidad si se necesita en otro lugar
  cargarWhatsappStatus(): void {
    this.whatsAppService.getStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.whatsappStatus.set(status);
          if (status.qr) {
            this.qrImage.set(status.qr);
          }
        },
        error: () => {
          this.whatsappStatus.set({
            estado: 'desconectado',
            mensaje: 'No se pudo obtener estado'
          });
        }
      });
  }

  // ============================================
  // SELECCIONAR SESION
  // ============================================
  seleccionarSesion(sesion: Sesion): void {
    this.selectedSesion.set(sesion);
    this.generarMensaje(sesion);
  }

  seleccionarSesionPorId(id: number): void {
    this.sesionesService.findOne(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sesion) => {
          this.selectedSesion.set(sesion);
          this.generarMensaje(sesion);
        },
        error: () => {
          this.toastr.error('No se encontró la sesión', 'Error');
        }
      });
  }

  // ============================================
  // GENERAR MENSAJE PARA WHATSAPP
  // ============================================
  generarMensaje(sesion: Sesion): void {
    const docs = this.documentosSesion();
    const nombresArchivos = docs.length > 0
      ? docs.map((d: any) => d.nombreArchivo || d.name || d.filename || 'Documento').join('\n')
      : 'No se especificaron documentos';

    const pwd = this.passwordSesion();
    const url = this.urlSesion();

    const mensaje = `
🏛️ *TRIBUNAL ELECTORAL DEPARTAMENTAL DE POTOSÍ*
*CITACIÓN A REUNIÓN DE SALA PLENA*

📋 *Título:* ${sesion.titulo}
📋 *Modalidad:* ${(sesion.tipoSesion || 'presencial').toUpperCase()}
📅 *Fecha:* ${this.formatFecha(sesion.fechaSesion)}
🕐 *Hora:* ${sesion.horaSesion}

🔗 *Enlace:* ${url || 'No disponible'}
🔑 *Contraseña:* ${pwd || 'No disponible'}

📄 *Documentos disponibles para revisión:*
${nombresArchivos}

Por favor no comparta este enlace.
    `.trim();
    this.mensajeGenerado.set(mensaje);
  }

  // ============================================
  // REENVIAR EMAIL
  // ============================================
  reenviarEmail(): void {
    const sesion = this.selectedSesion();
    if (!sesion) return;

    this.loadingAction.set(true);
    this.sesionesService.retryEmail(sesion.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.loadingAction.set(false);
          if (result.ok) {
            this.toastr.success('Email reenviado correctamente', 'Éxito');
            this.cargarSesiones();
          } else {
            this.toastr.warning(result.message || 'Error al reenviar email', 'Advertencia');
          }
        },
        error: (err) => {
          this.loadingAction.set(false);
          this.toastr.error('Error al reenviar email', 'Error');
        }
      });
  }

  // ============================================
  // REENVIAR WHATSAPP (CORREGIDO)
  // ============================================
  reenviarWhatsapp(): void {
    const sesion = this.selectedSesion();
    if (!sesion) return;

    // NUEVO: Validar health check antes de intentar enviar
    if (!this.puedeEnviarWhatsapp()) {
      this.toastr.warning(
        `WhatsApp no está listo: ${this.whatsappHealth()?.mensaje || 'Desconectado'}. Espere la reconexión o escanee el QR.`,
        'WhatsApp no disponible'
      );
      return;
    }

    this.loadingAction.set(true);
    this.sesionesService.retryWhatsapp(sesion.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.loadingAction.set(false);
          if (result.ok) {
            this.toastr.success('WhatsApp reenviado correctamente', 'Éxito');
            this.cargarSesiones();
          } else {
            // Si falló por frame detached, recargar health check
            if (result.mensaje?.includes('detached') || result.mensaje?.includes('Reconexión')) {
              this.toastr.warning(result.mensaje, 'WhatsApp se desconectó');
              this.cargarWhatsappHealth();
            } else {
              this.toastr.warning(result.mensaje || 'Error al reenviar WhatsApp', 'Advertencia');
            }
          }
        },
        error: (err) => {
          this.loadingAction.set(false);
          this.toastr.error('Error al reenviar WhatsApp', 'Error');
          this.cargarWhatsappHealth();
        }
      });
  }

  // ============================================
  // COPIAR MENSAJE
  // ============================================
  copiarMensaje(): void {
    const mensaje = this.mensajeGenerado();
    if (!mensaje) return;
    navigator.clipboard.writeText(mensaje).then(() => {
      this.toastr.success('Mensaje copiado al portapapeles', 'Copiado');
    });
  }

  // ============================================
  // ABRIR WHATSAPP WEB
  // ============================================
  abrirWhatsappWeb(): void {
    this.copiarMensaje();
    window.open('https://web.whatsapp.com', '_blank');
  }

  // ============================================
  // REGENERAR QR
  // ============================================
  regenerarQr(): void {
    this.loadingAction.set(true);
    this.whatsAppService.regenerateQr()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.loadingAction.set(false);
          this.whatsappStatus.set(status);
          if (status.qr) {
            this.qrImage.set(status.qr);
            this.showQr.set(true);
          }
          this.toastr.info('QR regenerado. Escanee con su WhatsApp.', 'QR');
          // Recargar health después de unos segundos
          setTimeout(() => this.cargarWhatsappHealth(), 5000);
        },
        error: () => {
          this.loadingAction.set(false);
          this.toastr.error('No se pudo regenerar el QR', 'Error');
        }
      });
  }

  // ============================================
  // REFRESCAR HEALTH (NUEVO)
  // ============================================
  refrescarHealth(): void {
    this.cargarWhatsappHealth();
    this.toastr.info('Estado de WhatsApp actualizado', 'Actualizar');
  }

  // ============================================
  // UTILIDADES
  // ============================================
  copyToClipboard(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toastr.success('Copiado al portapapeles', 'Copiado');
    }).catch(() => {
      this.toastr.error('No se pudo copiar', 'Error');
    });
  }

  formatFecha(fecha: string | Date): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
