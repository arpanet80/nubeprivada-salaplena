export const environment = {
  production: false,

  apiUrl: window["env"]["apiUrl"] || "default",
  apiUsuarios: window["env"]["apiUsuarios"] || "default",
  reportsUrl: window["env"]["reportsUrl"] || "default",
  debug: window["env"]["debug"] || false,

  //// INFORMACIÓN DEL SISTEMA
  systemId: 1,  // <-- ID del sistema de la BD
  systemName: 'Sistema de Usuarios',  // <-- NOMBRE del sistema de la BD

    // ✅ Configuración de seguridad
  security: {
    enableLogging: true,
    logLevel: 'debug', // debug, info, warn, error
    enableConsoleErrors: true,
    enableBruteForceProtection: true,
    maxLoginAttempts: 5,
    blockDuration: 15 * 60 * 1000, // 15 minutos
    tokenRefreshInterval: 30000, // 30 segundos
    requestTimeout: 15000, // 15 segundos
    inactivityTimeout: 30 * 60 * 1000, // 30 minutos
    enableInactivityMonitoring: true,
  },

  // ✅ Feature flags
  features: {
    enableCsrf: true,
    enableInputSanitization: true,
    enableSecurityHeaders: true,
  }
};
