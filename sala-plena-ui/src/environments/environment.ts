export const environment = {
  production: true,

  apiUrl: window["env"]["apiUrl"] || "default",
  apiUsuarios: window["env"]["apiUsuarios"] || "default",
  reportsUrl: window["env"]["reportsUrl"] || "default",
  debug: window["env"]["debug"] || false,

  //// INFORMACIÓN DEL SISTEMA
  systemId: 1,  // <-- ID del sistema de la BD
  systemName: 'Sistema de Usuarios',  // <-- NOMBRE del sistema de la BD

    // ✅ Configuración de seguridad para producción
  security: {
    enableLogging: true,
    logLevel: 'error', // Solo errores en producción
    enableConsoleErrors: false, // No mostrar errores en consola
    enableBruteForceProtection: true,
    maxLoginAttempts: 5,
    blockDuration: 15 * 60 * 1000,
    tokenRefreshInterval: 30000,
    requestTimeout: 15000,
    inactivityTimeout: 30 * 60 * 1000,
    enableInactivityMonitoring: true,
  },

  features: {
    enableCsrf: true,
    enableInputSanitization: true,
    enableSecurityHeaders: true,
  }


};
