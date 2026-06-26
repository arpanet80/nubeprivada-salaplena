// Genérico por defecto para que TableColumnSchema funcione fuera del componente
export interface TableColumnSchema<T = any> {
  key: string;
  type: 'text' | 'number' | 'date' | 'checkbox' | 'avatar' | 'title' | 'subnivel' | 'button' | 'badge';
  keysubnivel?: string;
  buttons?: TableButton<T>[];
  label: string;
  style?: string;               // clases CSS para el <td>
  hidden?: boolean;
  disabled?: boolean;
  required?: boolean;
  badgeStyle?: (value: any, row: T) => BadgeStyle | null;
  readonly?: boolean;
  /** Función para formatear el valor mostrado (útil para concatenar campos) */
  formatter?: (row: T) => string;
}

export interface BadgeStyle {
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
  text?: string;
}

export interface TableButton<T = any> {
  id: string;
  icon?: string;
  label?: string;
  colorClass: string;
  tooltip?: string;
  show?: (row: T) => boolean;
  action?: (row: T) => void;
}

export interface OpcionCustom {
  icono: string;
  colorClass: string;
  tooltip: string;
}

export interface TablaOpciones {
  btnNuevo?: boolean;
  btnNuevoLabel?: string;
  btnEditarEnTabla?: boolean;
  inlineEdit?: boolean;
  registrosPorPagina?: number;
  buscador?: boolean;
  botones?: BotonExtra[];

  /** Bandera: muestra/oculta el botón de filtros avanzados */
  btnFiltrar?: boolean;
  btnFiltrarLabel?: string;
}

export interface BotonExtra {
  id: string;
  icon?: string;
  colorClass: string;
  label?: string;
  tooltip?: string;
  show?: boolean | (() => boolean);
}

/** Respuesta paginada del backend */
export interface PaginatedResponse<T = any> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Convierte un valor a formato yyyy-MM-dd para inputs date */
export function toInputDate(val: any): string {
  if (!val) return '';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

/** Convierte string yyyy-MM-dd a Date */
export function fromInputDate(str: string): Date {
  return str ? new Date(str + 'T00:00:00') : new Date();
}
