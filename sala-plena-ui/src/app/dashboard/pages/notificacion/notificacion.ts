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

  // ─── Modal de confirmación de envío manual ──────────────
  confirmModalVisible = signal<boolean>(false);

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
  // CARGAR SESIONES - FIX: Ordenar por fecha_publicacion descendente
  // ============================================
  cargarSesiones(): void {
    this.loading.set(true);
    this.sesionesService.findAll(1, 20, { estado: 'activo' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          // FIX: Ordenar por fecha_publicacion descendente (más reciente arriba)
          // Con manejo defensivo: si fecha_publicacion no existe, fallback a fechaSesion+horaSesion
          const ordenadas = response.data.sort((a: Sesion, b: Sesion) => {
            const aAny = a as any;
            const bAny = b as any;

            // Intentar usar fecha_publicacion primero
            const fechaPubA = aAny.fecha_publicacion || aAny.fechaPublicacion;
            const fechaPubB = bAny.fecha_publicacion || bAny.fechaPublicacion;

            if (fechaPubA && fechaPubB) {
              return new Date(fechaPubB).getTime() - new Date(fechaPubA).getTime();
            }

            // Fallback: usar fechaSesion + horaSesion
            const fechaA = new Date(`${a.fechaSesion}T${a.horaSesion || '00:00'}`);
            const fechaB = new Date(`${b.fechaSesion}T${b.horaSesion || '00:00'}`);
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
  // ENVÍO MANUAL DE WHATSAPP (mismo comportamiento que nueva-sesion)
  // Copia el mensaje de la sesión seleccionada, abre WhatsApp Web
  // y pide confirmar si se envió correctamente.
  //
  // FIX: el modal de confirmación se muestra de inmediato (síncrono,
  // dentro del mismo clic). Antes, confirmModalVisible.set(true) estaba
  // dentro del .then() de clipboard.writeText(), DESPUÉS de window.open().
  // En varios navegadores, llamar a window.open() luego de una promesa
  // resuelta (como clipboard.writeText) ya no se considera "gesto directo
  // del usuario" y puede ser bloqueado/lanzar excepción, lo que cortaba
  // la ejecución antes de llegar al set(true) del modal. Por eso se veía
  // el toastr de "copiado" pero nunca el modal.
  // ============================================
  abrirWhatsappWeb(): void {
    const sesion = this.selectedSesion();
    if (!sesion) {
      this.toastr.warning('Seleccione una sesión de la lista', 'Sin sesión seleccionada');
      return;
    }

    const mensaje = this.mensajeGenerado();
    if (!mensaje) {
      console.warn('[Notificacion] No hay mensaje para copiar');
      return;
    }

    // 1. Copiar al portapapeles (efecto secundario, no bloqueante)
    this.copiarMensajeAlPortapapeles(mensaje);

    // 2. Abrir WhatsApp Web (protegido, no debe impedir que se muestre el modal)
    try {
      window.open('https://web.whatsapp.com', '_blank');
    } catch (e) {
      console.warn('[Notificacion] No se pudo abrir WhatsApp Web:', e);
    }

    // 3. Mostrar SIEMPRE el modal de confirmación, en el mismo clic
    this.confirmModalVisible.set(true);
  }

  /**
   * Copia el mensaje usando Clipboard API y, si falla o no está
   * disponible, recurre al fallback de execCommand/textarea.
   * No abre ventanas ni controla el modal: solo copia.
   */
  private copiarMensajeAlPortapapeles(texto: string): void {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto)
        .then(() => {
          console.log('[Notificacion] Mensaje copiado via Clipboard API');
          this.toastr.success('Mensaje copiado al portapapeles', 'Copiado');
        })
        .catch((err) => {
          console.warn('[Notificacion] Clipboard API falló:', err);
          this.copiarConFallback(texto);
        });
      return;
    }
    this.copiarConFallback(texto);
  }

  /**
   * Fallback de copiado usando execCommand o textarea.
   * Solo copia, no abre ventanas ni controla el modal.
   */
  private copiarConFallback(texto: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = texto;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const copiado = document.execCommand('copy');
      if (copiado) {
        console.log('[Notificacion] Mensaje copiado via execCommand');
        this.toastr.success('Mensaje copiado al portapapeles', 'Copiado');
      } else {
        console.warn('[Notificacion] No se pudo copiar automáticamente. El usuario debe copiar manualmente.');
      }
    } catch (err) {
      console.warn('[Notificacion] execCommand falló:', err);
    }

    document.body.removeChild(textArea);
  }

  // ============================================
  // CONFIRMAR ENVÍO MANUAL
  // Sin redirección: solo marca el estado y refresca la lista.
  // ============================================
  confirmarEnvioManual(enviado: boolean): void {
    this.confirmModalVisible.set(false);

    const sesion = this.selectedSesion();
    if (!sesion) return;

    if (enviado) {
      this.sesionesService.marcarWhatsappEnviado(sesion.id, 'Enviado manualmente por el usuario')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toastr.success('Notificación registrada como enviada', 'Éxito');
            this.cargarSesiones();
          },
          error: () => {
            this.toastr.error('No se pudo registrar el envío', 'Error');
          }
        });
    } else {
      this.toastr.info('Puede reenviar la notificación cuando lo necesite', 'Reenvío disponible');
    }
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

  /**
   * FIX: Formatear fecha sin aplicar timezone offset.
   * Para strings YYYY-MM-DD, extrae los componentes directamente.
   * Usa timezone America/La_Paz para evitar desfase de un día.
   */
  formatFecha(fecha: string | Date): string {
    if (!fecha) return '';

    // Si es string YYYY-MM-DD, extraer componentes directamente (sin timezone)
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

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}