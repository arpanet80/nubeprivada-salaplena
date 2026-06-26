import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SpinnerService } from '../../../core/components/spinner/spinner.service';
import { SweetAlertService } from '../../../core/services/sweet-alert.service';
import { NextcloudFileItem } from '../../../core/models/nextcloud.model';
import { NextcloudService } from '../../../core/services/nextcloud.service';

@Component({
  selector: 'app-explorar-nextcloud',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './explorar-nextcloud.html',
  styleUrl: './explorar-nextcloud.css'
})
export class ExplorarNextcloud implements OnInit, OnDestroy {
  private nextcloudService = inject(NextcloudService);
  private spinnerService = inject(SpinnerService);
  private sweetAlert = inject(SweetAlertService);
  private destroy$ = new Subject<void>();

  items = signal<NextcloudFileItem[]>([]);
  currentPath = signal<string>('');
  breadcrumb = signal<string[]>([]);
  loading = signal<boolean>(false);

  ngOnInit(): void {
    this.cargarDirectorio('');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDirectorio(path: string): void {
    this.loading.set(true);
    this.currentPath.set(path);
    this.actualizarBreadcrumb(path);

    this.nextcloudService.browseDirectory(path)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const ordenados = [...data].sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });
          this.items.set(ordenados);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.sweetAlert.error('No se pudo listar el directorio', 'Error');
        }
      });
  }

  actualizarBreadcrumb(path: string): void {
    if (!path) {
      this.breadcrumb.set(['SalaPlena']);
      return;
    }
    const parts = path.split('/').filter(p => p);
    this.breadcrumb.set(['SalaPlena', ...parts]);
  }

  navegarA(index: number): void {
    if (index === 0) {
      this.cargarDirectorio('');
      return;
    }
    const parts = this.breadcrumb();
    const newPath = parts.slice(1, index + 1).join('/');
    this.cargarDirectorio(newPath);
  }

  onVolver(): void {
    const path = this.currentPath();
    if (!path) return;
    const parts = path.split('/').filter(p => p);
    parts.pop();
    this.cargarDirectorio(parts.join('/'));
  }

  isPdfFile(name: string): boolean {
    return name.toLowerCase().endsWith('.pdf');
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }


  onRowClick(item: NextcloudFileItem): void {
    console.log('CLIC', item);  // ← ya tenías esto
    if (item.isDirectory) {
      this.cargarDirectorio(item.path);
    }
    // Si no es carpeta: aquí podrías emitir un evento para abrir/descargar
  }


}
