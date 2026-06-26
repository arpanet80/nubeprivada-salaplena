/**
 * Respuesta de cuota de Nextcloud (PROPFIND)
 */
export interface NextcloudQuota {
  used: number;      // bytes usados
  available: number; // bytes disponibles (-3 = ilimitado)
  total: number;     // bytes totales (calculado)
  usedPercent: number;
  freePercent: number;
}

/**
 * Respuesta de creación de share (OCS API)
 */
export interface NextcloudShare {
  id: number;
  token: string;
  url: string;
  path: string;
  shareType: number;
  permissions: number;
  expiration?: string;
  password?: string;
}

/**
 * Item de directorio (PROPFIND)
 */
export interface NextcloudFileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: Date;
  etag?: string;
}

/**
 * Respuesta genérica OCS
 */
export interface OcsResponse<T> {
  ocs: {
    meta: {
      status: string;
      statuscode: number;
      message?: string;
    };
    data: T;
  };
}