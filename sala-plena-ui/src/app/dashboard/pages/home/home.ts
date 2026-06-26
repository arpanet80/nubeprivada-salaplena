import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerService } from '../../../core/components/spinner/spinner.service';
import { ToastrAlertService } from '../../../core/services/toastr-alert.service';
import { TableColumnSchema } from '../../../core/components/tabla-generica/tabla-column.model';
import { TablaGenericaComponent } from '../../../core/components/tabla-generica/tabla-generica.component';
import { Router } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { SesionesService } from '../../../core/services/sesiones.service';
import { NextcloudService } from '../../../core/services/nextcloud.service';
import { DashboardStats } from '../../../core/models/dashboard.model';
import { Sesion } from '../../../core/models/sesion.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, TablaGenericaComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  private dashboardService = inject(DashboardService);
  private sesionesService = inject(SesionesService);
  private nextcloudService = inject(NextcloudService);
  private spinnerService = inject(SpinnerService);
  private toastr = inject(ToastrAlertService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // ─── Señales ──────────────────────────────────────────────
  stats = signal<DashboardStats | null>(null);
  ultimasSesiones = signal<Sesion[]>([]);
  loadingStats = signal<boolean>(false);
  loadingSesiones = signal<boolean>(false);
  loadingQuota = signal<boolean>(false);
  executingRotation = signal<boolean>(false);

  // ─── Computed ─────────────────────────────────────────────
  espacioBajo = computed(() => {
    const s = this.stats();
    if (!s) return false;
    return s.espacioNextcloud.librePercent < 20 && s.espacioNextcloud.librePercent >= 0;
  });

  espacioIlimitado = computed(() => {
    const s = this.stats();
    return s?.espacioNextcloud.libreMb === -1;
  });

  // ─── Columnas tabla ───────────────────────────────────────
  columns: TableColumnSchema<Sesion>[] = [
    { key: 'id', type: 'text', label: 'ID', style: 'text-center' },
    { key: 'titulo', type: 'text', label: 'TÍTULO' },
    {
      key: 'fechaSesion', type: 'date', label: 'FECHA',
      formatter: (row) => this.formatFecha(row.fechaSesion)
    },
    { key: 'horaSesion', type: 'text', label: 'HORA', style: 'text-center' },
    {
      key: 'tipoSesion', type: 'badge', label: 'TIPO',
      badgeStyle: (val) => ({
        color: val === 'presencial' ? 'primary' : 'info',
        text: String(val).toUpperCase()
      })
    },
    {
      key: 'estado', type: 'badge', label: 'ESTADO',
      badgeStyle: (val) => {
        const map: Record<string, any> = {
          activo: { color: 'success', text: 'ACTIVO' },
          inactivo: { color: 'warning', text: 'INACTIVO' },
          archivado: { color: 'danger', text: 'ARCHIVADO' }
        };
        return map[val] || { color: 'secondary', text: String(val).toUpperCase() };
      }
    },
    {
      key: 'respaldoOk', type: 'badge', label: 'RESPALDO',
      badgeStyle: (val) => val
        ? { color: 'success', text: '✓ OK', icon: 'ki-duotone ki-check-circle' }
        : { color: 'danger', text: '✗ PENDIENTE', icon: 'ki-duotone ki-cross-circle' }
    },
    {
      key: 'emailEnviado', type: 'badge', label: 'EMAIL',
      badgeStyle: (val) => val
        ? { color: 'success', text: '✓ ENVIADO' }
        : { color: 'warning', text: '✗ PENDIENTE' }
    },
    {
      key: 'acciones', type: 'button', label: 'ACCIONES',
      buttons: [
        {
          id: 'ver', icon: 'ki-duotone ki-eye', label: 'Ver',
          colorClass: 'btn-light-primary btn-sm', tooltip: 'Ver detalle',
          show: () => true
        },
        {
          id: 'notificar', icon: 'ki-duotone ki-send', label: 'Notificar',
          colorClass: 'btn-light-success btn-sm', tooltip: 'Reenviar notificación',
          show: (row) => row.estado === 'activo'
        }
      ]
    }
  ];

  tablaOpciones = {
    btnNuevo: true,
    btnNuevoLabel: 'Nueva Sesión',
    buscador: false,
    registrosPorPagina: 5
  };

  ngOnInit(): void {
    this.cargarDashboard();
  }

  // ─── Métodos ──────────────────────────────────────────────

  cargarDashboard(): void {
    this.loadingStats.set(true);
    this.loadingSesiones.set(true);

    this.dashboardService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.stats.set(data);
          this.loadingStats.set(false);
        },
        error: (err) => {
          this.loadingStats.set(false);
          this.toastr.error('No se pudieron cargar las estadísticas', 'Error');
        }
      });

    // Cargar últimas sesiones activas con paginación
    this.sesionesService.findAll(1, 5, { estado: 'activo' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          // 🆕 ORDENAR de más reciente a más antiguo (descendente por fecha+hora)
          const ordenadas = response.data.sort((a: Sesion, b: Sesion) => {
            const fechaHoraA = new Date(`${a.fechaSesion}T${a.horaSesion}`);
            const fechaHoraB = new Date(`${b.fechaSesion}T${b.horaSesion}`);
            return fechaHoraB.getTime() - fechaHoraA.getTime(); // descendente
          });
          this.ultimasSesiones.set(ordenadas);
          this.loadingSesiones.set(false);
        },
        error: (err) => {
          this.loadingSesiones.set(false);
          this.toastr.error('No se pudieron cargar las sesiones', 'Error');
        }
      });
  }

  ejecutarRotacion(): void {
    this.executingRotation.set(true);
    this.dashboardService.executeRotation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.executingRotation.set(false);
          if (result.ok) {
            this.toastr.success(result.mensaje, 'Rotación Completada');
            this.cargarDashboard(); // Refrescar
          } else {
            this.toastr.warning(result.mensaje, 'Rotación');
          }
        },
        error: (err) => {
          this.executingRotation.set(false);
          this.toastr.error('Error ejecutando rotación', 'Error');
        }
      });
  }

  onNuevaSesion(): void {
    this.router.navigate(['/dashboard/nueva-sesion']);
  }

  onTableAction(event: { action: string; row: Sesion }): void {
    if (event.action === 'ver') {
      this.router.navigate(['/dashboard/notificacion'], { queryParams: { sesionId: event.row.id } });
    } else if (event.action === 'notificar') {
      this.router.navigate(['/dashboard/notificacion'], { queryParams: { sesionId: event.row.id } });
    }
  }

  formatFecha(fecha: string | Date): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('es-BO').format(num);
  }
}
