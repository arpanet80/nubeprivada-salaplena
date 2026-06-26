/* =============================================================================
   GUÍA DE USO - TABLA GENÉRICA (app-tabla-generica)
   =============================================================================

   COMPONENTE REUTILIZABLE para listados con:
   • Paginación local (client-side) o remota (server-side)
   • Buscador, ordenación, edición inline
   • Avatar, badges, botones de acción configurables
   • Selector de registros por página

   ─────────────────────────────────────────────────────────────────────────────
   1. MODO DE PAGINACIÓN (automático, no configurable manualmente)
   ─────────────────────────────────────────────────────────────────────────────

   La tabla detecta SOLO por el tipo de datos que recibe en [data]:

   • MODO REMOTO (backend pagina):  data = { data: [], meta: {total, page, limit, totalPages} }
     └─ El padre controla la paginación. La tabla emite (pageChange) y (searchChange).

   • MODO LOCAL (cliente pagina):   data = [ {}, {}, ... ]  (array plano)
     └─ La tabla pagina, filtra y ordena internamente.

   ─────────────────────────────────────────────────────────────────────────────
   2. INPUTS (@Input) - Lo que le pasas DESDE el componente padre
   ─────────────────────────────────────────────────────────────────────────────

   [data]              T[] | PaginatedResponse<T>   ← Datos a mostrar
   [tablaColumns]      TableColumnSchema<T>[]       ← Definición de columnas
   [tablaOpciones]     TablaOpciones                ← Configuración visual/funcional
   [loading]           boolean                      ← Muestra spinner si true

   ─────────────────────────────────────────────────────────────────────────────
   3. OUTPUTS (Eventos) - Lo que la tabla EMITE hacia el padre
   ─────────────────────────────────────────────────────────────────────────────

   (btnNuevo)          → void                        ← Click en "Nuevo"
   (btnTableAction)    → { action: string, row: T }  ← Click en botón de acción (edit/delete)
   (btnInlineEditRow)  → T                           ← Guardar edición inline
   (btnExtra)          → string                      ← Click en botón extra configurable
   (pageChange)        → { page: number, limit: number }  ← Cambio de página (modo remoto)
   (searchChange)      → string                      ← Búsqueda (modo remoto)
   (filtrar)           → void                        ← Click en botón "Filtrar"

   ─────────────────────────────────────────────────────────────────────────────
   4. CONFIGURACIÓN DE COLUMNAS (TableColumnSchema<T>)
   ─────────────────────────────────────────────────────────────────────────────

   Cada columna es un objeto con estas propiedades:

   {
     key: 'nombreCampo',           // ← propiedad del objeto T
     type: 'text' | 'number' | 'date' | 'checkbox' | 'avatar' | 'title' |
           'subnivel' | 'button' | 'badge',

     label: 'Nombre Visible',      // ← texto del header
     style?: 'text-center',         // ← clases CSS para las celdas <td>
     hidden?: false,               // ← true = oculta la columna
     disabled?: false,             // ← true = deshabilita input en edición
     required?: false,             // ← true = campo requerido en edición
     readonly?: false,              // ← true = no editable en modo inline

     // Para type: 'subnivel' (acceder a propiedad anidada)
     keysubnivel?: 'descripcion',  // ← ej: row.cargo.descripcion

     // Para type: 'avatar' (muestra foto redonda + nombre)
     formatter?: (row) => string,  // ← función para formatear el texto junto al avatar

     // Para type: 'badge' (etiqueta de color)
     badgeStyle?: (value, row) => { color: 'primary'|'success'|'warning'|'danger'|'info', icon?, text? },

     // Para type: 'button' (botones de acción por fila)
     buttons?: [
       { id: 'edit', icon: 'bi bi-pencil', label: 'Editar', colorClass: 'btn-light-primary',
         tooltip?: '...', show?: (row) => boolean }
     ]
   }

   ─────────────────────────────────────────────────────────────────────────────
   5. CONFIGURACIÓN DE OPCIONES (TablaOpciones)
   ─────────────────────────────────────────────────────────────────────────────

   {
     btnNuevo?: true,              // ← muestra botón "Nuevo"
     btnNuevoLabel?: 'Nuevo Item', // ← texto del botón
     btnFiltrar?: true,            // ← muestra botón "Filtrar"
     btnFiltrarLabel?: 'Filtrar',  // ← texto del botón
     inlineEdit?: false,           // ← true = permite edición inline en la tabla
     buscador?: true,              // ← true = muestra input de búsqueda (modo local)
     registrosPorPagina?: 10,      // ← registros por página (default: 10)
     botones?: [                   // ← botones extra adicionales en el header
       { id: 'export', icon: '...', colorClass: '...', label: 'Exportar', tooltip: '...', show?: () => true }
     ]
   }

   ─────────────────────────────────────────────────────────────────────────────
   6. EJEMPLO DE USO EN UN COMPONENTE PADRE (ej: funcionario-list.ts)
   ─────────────────────────────────────────────────────────────────────────────

   // ---------- HTML del padre ----------
   <app-tabla-generica
     [data]="funcionariosPaginados() ?? []"     ← PaginatedResponse (modo remoto)
     [tablaColumns]="columns"                    ← Array de columnas
     [tablaOpciones]="tablaOpciones"             ← Configuración
     [loading]="loading()"

     (btnNuevo)="onNuevo()"                      ← Navegar a formulario nuevo
     (btnTableAction)="onTableAction($event)"   ← Manejar editar/eliminar
     (pageChange)="onPageChange($event)"         ← Cargar otra página del backend
     (filtrar)="onFiltrar()">                    ← Abrir modal de filtros
   </app-tabla-generica>

   // ---------- TS del padre ----------
   columns: TableColumnSchema<Funcionario>[] = [
     { key: 'id', type: 'text', label: 'ID', style: 'text-center' },
     {
       key: 'nombres', type: 'avatar', label: 'NOMBRES',
       formatter: (row) => [row.nombres, row.paterno, row.materno].filter(Boolean).join(' ')
     },
     { key: 'tipofuncionario', type: 'subnivel', keysubnivel: 'descripcion', label: 'TIPO' },
     { key: 'documento', type: 'number', label: 'DOCUMENTO' },
     { key: 'fechaingreso', type: 'date', label: 'INGRESO' },
     {
       key: 'acciones', type: 'button', label: 'ACCIONES',
       buttons: [
         { id: 'edit', icon: 'bi bi-pencil', label: 'Editar', colorClass: 'btn-light-primary', show: () => true },
         { id: 'delete', icon: 'bi bi-trash', label: 'Eliminar', colorClass: 'btn-light-danger', show: () => true }
       ]
     }
   ];

   tablaOpciones: TablaOpciones = {
     btnNuevo: true,
     btnNuevoLabel: 'Nuevo Funcionario',
     btnFiltrar: true,           // ← Activa botón de filtro
     buscador: false,            // ← Desactivado en remoto (el backend no soporta búsqueda aún)
     registrosPorPagina: 10
   };

   // ---------- Handlers del padre ----------
   onPageChange(event: { page: number, limit: number }) {
     this.api.getFuncionarios(event.page, event.limit).subscribe(r => this.data.set(r));
   }

   onTableAction(event: { action: string, row: Funcionario }) {
     if (event.action === 'edit') this.router.navigate(['/editar', event.row.id]);
     if (event.action === 'delete') this.confirmarEliminar(event.row);
   }

   onFiltrar() {
     this.showFilterModal.set(true);  // ← El padre maneja SU propio modal de filtros
   }

   ─────────────────────────────────────────────────────────────────────────────
   7. NOTAS IMPORTANTES
   ─────────────────────────────────────────────────────────────────────────────

   • La tabla NUNCA hace peticiones HTTP. Solo emite eventos. El padre las maneja.
   • El filtro avanzado (modal) NO está incluido en la tabla. Cada padre implementa
     el suyo propio porque los campos de filtro son específicos de cada dominio.
   • En modo remoto, la ordenación por click en headers está deshabilitada.
   • El avatar usa object-fit: cover para no deformarse. El campo 'foto' debe ser
     base64 sin el prefijo "data:image/..." (la tabla lo agrega automáticamente).
   • Para edición inline: la fila recibe .isEdit = true. El padre recibe el objeto
     completo en (btnInlineEditRow) para guardar en el backend.

   ============================================================================= */



import {
  Component, Input, output, ChangeDetectionStrategy, signal, computed, OnChanges, SimpleChanges, OnDestroy, Pipe, PipeTransform, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TableColumnSchema, TablaOpciones, PaginatedResponse, toInputDate, fromInputDate } from './tabla-column.model';

type SortDirection = 'asc' | 'desc' | '';
interface SortState { column: string; direction: SortDirection }

interface PageItem {
  type: 'page' | 'ellipsis';
  value: number;
}

/** Pipe puro para renderizar celdas sin ejecutar función en cada ciclo de detección */
@Pipe({
  name: 'tableCell',
  standalone: true,
  pure: true
})
export class TableCellPipe implements PipeTransform {
  transform(row: any, col: TableColumnSchema): string {
    if (col.formatter) return col.formatter(row);
    if (col.keysubnivel) return row[col.key]?.[col.keysubnivel] ?? '';
    return row[col.key] ?? '';
  }
}

@Component({
  selector: 'app-tabla-generica',
  standalone: true,
  imports: [CommonModule, FormsModule, TableCellPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tabla-generica.component.html',
  styleUrls: ['./tabla-generica.component.css']
})
export class TablaGenericaComponent<T extends Record<string, any>> implements OnChanges, OnDestroy {

  /* ---------- entradas ---------- */
  @Input() data: T[] | PaginatedResponse<T> = [];
  @Input() tablaColumns: TableColumnSchema<T>[] = [];
  @Input() tablaOpciones: TablaOpciones = {};
  @Input() loading: boolean = false;

  /* ---------- salidas ---------- */
  btnNuevo         = output<void>();
  btnInlineEditRow = output<T>();
  btnTableAction   = output<{ action: string; row: T }>();
  btnExtra         = output<string>();
  pageChange       = output<{ page: number; limit: number }>();
  searchChange     = output<string>();
  filtrar          = output<void>();
  // sortChange REMOVIDO - el sort es 100% local e inmediato

  /* ---------- referencias al template ---------- */
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  /* ---------- señales internas ---------- */
  private rawData      = signal<T[]>([]);
  private originalData = new Map<T, T>();
  public  sortState    = signal<SortState>({ column: '', direction: '' });
  public searchTerm   = signal<string>('');

  public mode = signal<'local' | 'remote'>('local');
  private remoteMeta = signal<PaginatedResponse['meta'] | null>(null);

  currentPage = signal<number>(1);
  pageSize    = signal<number>(10);

  readonly pageSizeOptions = [5, 10, 25, 50, 100];

  /* ---------- debounce búsqueda remota ---------- */
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  /* ---------- cache de paths para deepValue ---------- */
  private pathCache = new Map<string, string[]>();

  /* ---------- utilidades expuestas al template ---------- */
  protected toInputDate = toInputDate;

  /* ---------- derivadas ---------- */
  columnasVisibles = computed(() => this.tablaColumns.filter(c => !c.hidden));

  totalRecords = computed(() => {
    return this.mode() === 'remote' && this.remoteMeta()
      ? this.remoteMeta()!.total
      : this.filteredData().length;
  });

  totalPages = computed(() => {
    const total = this.totalRecords();
    const size  = this.pageSize();
    return total === 0 ? 0 : Math.ceil(total / size);
  });

  /**
   * FILTRA SIEMPRE localmente (tanto en modo local como remoto).
   * Esto da feedback inmediato al usuario al escribir en el buscador.
   */
  filteredData = computed(() => {
    let rows = [...this.rawData()]; // Copia para no mutar el original
    const term = this.searchTerm().toLowerCase().trim();

    if (term) {
      rows = rows.filter(r =>
        this.tablaColumns.some(col => {
          // No buscar en columnas de tipo botón
          if (col.type === 'button') return false;

          let v: any;
          if (col.keysubnivel) {
            v = r[col.key]?.[col.keysubnivel];
          } else if (col.formatter) {
            v = col.formatter(r);
          } else {
            v = r[col.key];
          }

          // Convertir a string y buscar
          const strValue = v === null || v === undefined ? '' : String(v);
          return strValue.toLowerCase().includes(term);
        })
      );
    }

    return this.sortRows(rows);
  });

  paginatedData = computed<T[]>(() => {
    const sorted = this.filteredData();
    if (this.mode() === 'remote') {
      // En modo remoto mostramos todos los datos filtrados/ordenados
      // (que son la página actual del backend)
      return sorted;
    }
    // Modo local: paginación client-side
    const start = (this.currentPage() - 1) * this.pageSize();
    const end   = start + this.pageSize();
    return sorted.slice(start, end);
  });

  /* ---------- visibilidad ---------- */
  showBtnNuevo   = computed(() => this.tablaOpciones.btnNuevo === true);
  showBuscador   = computed(() => this.tablaOpciones.buscador !== false);
  showBtnEdit    = computed(() => this.tablaOpciones.inlineEdit === true);
  showBtnFiltrar = computed(() => this.tablaOpciones.btnFiltrar === true);

  botonesExtra = computed(() => (this.tablaOpciones.botones ?? []).filter(
    b => (typeof b.show === 'function' ? b.show() : b.show !== false)
  ));

  paginationRange = computed((): PageItem[] => {
    const total = this.totalPages();
    const current = this.currentPage();
    const result: PageItem[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) result.push({ type: 'page', value: i });
      return result;
    }
    if (current <= 4) {
      [1, 2, 3, 4, 5].forEach(v => result.push({ type: 'page', value: v }));
      result.push({ type: 'ellipsis', value: 0 });
      result.push({ type: 'page', value: total });
      return result;
    }
    if (current >= total - 3) {
      result.push({ type: 'page', value: 1 });
      result.push({ type: 'ellipsis', value: 0 });
      for (let i = total - 4; i <= total; i++) result.push({ type: 'page', value: i });
      return result;
    }
    result.push({ type: 'page', value: 1 });
    result.push({ type: 'ellipsis', value: 0 });
    [current - 1, current, current + 1].forEach(v => result.push({ type: 'page', value: v }));
    result.push({ type: 'ellipsis', value: 0 });
    result.push({ type: 'page', value: total });
    return result;
  });

  /* ---------- constructor ---------- */
  constructor() {
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchChange.emit(term);
    });
  }

  /* ---------- ciclo de vida ---------- */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.processIncomingData(this.data);
    }
    if (changes['tablaColumns']) {
      this.resetSort();
    }
    if (changes['tablaOpciones']) {
      this.pageSize.set(this.tablaOpciones.registrosPorPagina ?? 10);
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.originalData.clear();
    this.pathCache.clear();
  }

  private processIncomingData(value: T[] | PaginatedResponse<T>): void {
    if (value && typeof value === 'object' && 'data' in value && 'meta' in value) {
      this.mode.set('remote');
      this.rawData.set((value as PaginatedResponse<T>).data);
      this.remoteMeta.set((value as PaginatedResponse<T>).meta);
      this.currentPage.set((value as PaginatedResponse<T>).meta.page);
      this.pageSize.set((value as PaginatedResponse<T>).meta.limit);
    } else {
      this.mode.set('local');
      this.rawData.set((value as T[]) ?? []);
      this.remoteMeta.set(null);
      this.currentPage.set(1);
    }
  }

  /* ---------- paginación ---------- */
  goPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    if (this.mode() === 'remote') {
      this.pageChange.emit({ page, limit: this.pageSize() });
    }
  }

  changePageSize(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    if (this.mode() === 'remote') {
      this.pageChange.emit({ page: 1, limit: newSize });
    }
  }

  /* ---------- ordenación INMEDIATA (100% local) ---------- */
  sort(column: string): void {
    const col = this.tablaColumns.find(c => c.key === column);
    if (!col) return;

    const path = col.type === 'subnivel' && col.keysubnivel
              ? `${column}.${col.keysubnivel}`
              : column;

    const current = this.sortState();
    let direction: SortDirection = 'asc';

    if (current.column === path && current.direction === 'asc') {
      direction = 'desc';
    } else if (current.column === path && current.direction === 'desc') {
      direction = '';
    }

    // Solo actualizar sortState - NO emitir evento
    // filteredData se recalcula automáticamente por ser computed()
    this.sortState.set({ column: direction ? path : '', direction });

    // El sort es INMEDIATO porque:
    // 1. sortState es una signal
    // 2. filteredData depende de sortState (computed)
    // 3. Angular detecta el cambio y re-renderiza automáticamente
    // NO hay llamada a API, NO hay recarga de página
  }

  /** Determina si una columna está activa en el sort */
  isSortActive(col: TableColumnSchema<T>): boolean {
    const state = this.sortState().column;
    if (!state) return false;
    if (state === col.key) return true;
    if (col.keysubnivel && state === `${col.key}.${col.keysubnivel}`) return true;
    return false;
  }

  /** Obtiene la dirección de sort para una columna */
  getSortDirection(col: TableColumnSchema<T>): SortDirection {
    const state = this.sortState();
    if (!state.column) return '';
    if (state.column === col.key) return state.direction;
    if (col.keysubnivel && state.column === `${col.key}.${col.keysubnivel}`) return state.direction;
    return '';
  }

  private sortRows(rows: T[]): T[] {
    const { column, direction } = this.sortState();
    if (!direction || !column) return rows;

    return [...rows].sort((a, b) => {
      const av = column.includes('.') ? this.deepValue(a, column) : a[column];
      const bv = column.includes('.') ? this.deepValue(b, column) : b[column];

      let aNorm: string | number | null | undefined = av instanceof Date ? av.getTime() : av;
      let bNorm: string | number | null | undefined = bv instanceof Date ? bv.getTime() : bv;

      if (aNorm === null || aNorm === undefined) aNorm = '';
      if (bNorm === null || bNorm === undefined) bNorm = '';

      if (typeof aNorm === 'string') aNorm = aNorm.toLowerCase();
      if (typeof bNorm === 'string') bNorm = bNorm.toLowerCase();

      const res = aNorm > bNorm ? 1 : aNorm < bNorm ? -1 : 0;
      return direction === 'asc' ? res : -res;
    });
  }

  private deepValue(obj: any, path: string): any {
    let keys = this.pathCache.get(path);
    if (!keys) {
      keys = path.split('.');
      this.pathCache.set(path, keys);
    }
    return keys.reduce((o, k) => o?.[k], obj);
  }

  private resetSort(): void {
    this.sortState.set({ column: '', direction: '' });
  }

  /* ---------- filtros / búsqueda ---------- */
  onSearch(val: string): void {
    const trimmed = val.trim();
    this.searchTerm.set(trimmed);
    this.currentPage.set(1);

    // SIEMPRE emitir searchChange para que el padre pueda sincronizar
    this.searchSubject.next(trimmed);
  }

  /** Limpia el término de búsqueda y resetea la tabla */
  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
    this.searchSubject.next('');

    // Enfocar el input después de limpiar
    if (this.searchInputRef?.nativeElement) {
      this.searchInputRef.nativeElement.value = '';
      this.searchInputRef.nativeElement.focus();
    }
  }

  /* ---------- utilitarios ---------- */
  trackByFn(index: number, item: T): any {
    const id = item['id'] ?? item['_id'];
    if (id !== undefined && id !== null) return id;
    try {
      return index + '-' + JSON.stringify(item).slice(0, 50);
    } catch {
      return index;
    }
  }

  /** Mantenido para compatibilidad interna. En template usar pipe tableCell. */
  getDisplayValue(row: T, col: TableColumnSchema<T>): string {
    if (col.formatter) return col.formatter(row);
    if (col.keysubnivel) return row[col.key]?.[col.keysubnivel] ?? '';
    return row[col.key] ?? '';
  }

  getAvatarUrl(row: T): string {
    const foto = row['foto'];
    if (foto) return `data:image/png;base64,${foto}`;
    return 'assets/img/svg/avatar/blank-image.svg';
  }

  /* ---------- edición inline ---------- */
  startEdit(row: T): void {
    if (!this.tablaOpciones.inlineEdit) return;
    this.originalData.set(row, { ...row });
    (row as any).isEdit = true;
  }

  cancelRow(row: T): void {
    const original = this.originalData.get(row);
    if (original) {
      Object.assign(row, original);
      this.originalData.delete(row);
    }
    (row as any).isEdit = false;
  }

  saveRow(row: T): void {
    this.originalData.delete(row);
    this.btnInlineEditRow.emit(row);
    (row as any).isEdit = false;
  }

  isEditing(row: T): boolean {
    return (row as any).isEdit === true;
  }

  updateDate(row: T, key: string, value: string): void {
    (row as any)[key] = fromInputDate(value);
  }
}
