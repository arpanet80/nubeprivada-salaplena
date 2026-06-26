export interface AppError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  context?: any;
}

export const ERROR_CODES = {
  // Errores de red
  NETWORK_ERROR: 'NETWORK_ERROR',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  
  // Errores de autenticación
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_MISSING: 'AUTH_MISSING',
  
  // Errores de autorización
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Errores de negocio
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  
  // Errores del servidor
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Errores de cliente
  CLIENT_ERROR: 'CLIENT_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  BRUTE_FORCE_BLOCKED: 'BRUTE_FORCE_BLOCKED'
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export function createAppError(
  code: ErrorCode, 
  message: string, 
  severity: 'low' | 'medium' | 'high' = 'medium',
  context?: any
): AppError {
  return {
    code,
    message,
    severity,
    timestamp: new Date(),
    context
  };
}

export function getErrorMessage(error: AppError): string {
  const messages: Record<ErrorCode, string> = {
    NETWORK_ERROR: 'Error de conexión. Verifique su internet.',
    REQUEST_TIMEOUT: 'La solicitud tardó demasiado tiempo.',
    AUTH_EXPIRED: 'Su sesión ha expirado.',
    AUTH_INVALID: 'Credenciales inválidas.',
    AUTH_MISSING: 'No está autenticado.',
    FORBIDDEN: 'No tiene permisos para esta acción.',
    UNAUTHORIZED: 'Acceso no autorizado.',
    VALIDATION_ERROR: 'Datos inválidos.',
    NOT_FOUND: 'Recurso no encontrado.',
    CONFLICT: 'Conflicto de datos.',
    SERVER_ERROR: 'Error interno del servidor.',
    SERVICE_UNAVAILABLE: 'Servicio no disponible.',
    CLIENT_ERROR: 'Error en la solicitud.',
    RATE_LIMITED: 'Demasiadas solicitudes.',
    BRUTE_FORCE_BLOCKED: 'Cuenta bloqueada temporalmente.'
  };
  
  return messages[error.code] || error.message;
}