import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';
import { LoggerService } from '../logger/logger.service';
import { WhatsAppStatus, WhatsAppSendResult } from './interfaces/whatsapp-status.interface';

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private client: Client;
  private status: WhatsAppStatus = { estado: 'desconectado', mensaje: 'No iniciado' };
  private qrCode: string | null = null;
  private readonly groupName: string;
  private readonly sessionPath: string;
  private readonly headless: boolean;
  private readonly vocalNumbers: string[];
  private isReady = false;
  private readonly enabled: boolean;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false; // ← NUEVO: evitar reconexiones concurrentes

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.enabled = this.parseBoolSafe(this.configService.get<string>('WHATSAPP_ENABLED'), true);
    if (!this.enabled) {
      this.status = { estado: 'desconectado', mensaje: 'WhatsApp deshabilitado en configuración' };
      return;
    }

    this.groupName = this.configService.get<string>('WHATSAPP_GROUP_NAME', 'NOTIFICACIONES SALA PLENA');
    this.sessionPath = this.configService.get<string>('WHATSAPP_SESSION_PATH', '/app/whatsapp-session');
    this.headless = this.parseBoolSafe(this.configService.get<string>('WHATSAPP_HEADLESS'), true);
    this.maxReconnectAttempts = this.configService.get<number>('WHATSAPP_MAX_RECONNECT', 10);

    const numbersEnv = this.configService.get<string>('WHATSAPP_VOCAL_NUMBERS', '');
    this.vocalNumbers = numbersEnv
      ? numbersEnv.split(',').map((n) => n.trim())
      : [];

    this.initializeClient();
  }

  private parseBoolSafe(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined || value === null) return defaultValue;
    const normalized = value.toString().trim().toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === '') return false;
    if (normalized === 'true' || normalized === '1') return true;
    return defaultValue;
  }

  // ============================================
  // INICIALIZACIÓN DEL CLIENTE
  // ============================================
  private initializeClient() {
    const puppeteerOptions = {
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
      executablePath: this.configService.get<string>('PUPPETEER_EXECUTABLE_PATH') || undefined,
    };

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.sessionPath,
      }),
      puppeteer: puppeteerOptions,
    });

    // Evento: QR generado
    this.client.on('qr', async (qr) => {
      this.reconnectAttempts = 0;
      this.status = { estado: 'conectando', mensaje: 'Escanea el QR con tu WhatsApp' };
      this.qrCode = await qrcode.toDataURL(qr);
      this.loggerService.info('WhatsAppService', 'QR generado, esperando escaneo');
    });

    // Evento: Autenticado
    this.client.on('authenticated', () => {
      this.status = { estado: 'autenticado', mensaje: 'Autenticado, iniciando sesión...' };
      this.loggerService.info('WhatsAppService', 'WhatsApp autenticado');
    });

    // TEMPORAL: diagnóstico de carga interna (quitar después de resolver)
    this.client.on('loading_screen', (percent, message) => {
      this.loggerService.info('WhatsAppService', `Loading screen: ${percent}% - ${message}`);
    });

    this.client.on('change_state', (state) => {
      this.loggerService.info('WhatsAppService', `Change state: ${state}`);
    });

    // Evento: Listo
    this.client.on('ready', () => {
      this.isReady = true;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.status = {
        estado: 'conectado',
        mensaje: 'Conectado y listo para enviar mensajes',
        info: {
          nombreGrupo: this.groupName,
          numeroVocales: this.vocalNumbers.length,
        },
      };
      this.qrCode = null;
      this.loggerService.info('WhatsAppService', 'WhatsApp listo para enviar mensajes');
      this.startHeartbeat();
    });

    // Evento: Desconectado
    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      this.isReconnecting = false;
      this.status = { estado: 'desconectado', mensaje: `Desconectado: ${reason}` };
      this.loggerService.logError('WhatsAppService', 'WhatsApp desconectado', new Error(reason));
      this.stopHeartbeat();
      this.scheduleReconnect();
    });

    // Evento: Error de autenticación
    this.client.on('auth_failure', (msg) => {
      this.isReady = false;
      this.status = { estado: 'fallo', mensaje: `Fallo de autenticación: ${msg}` };
      this.loggerService.logError('WhatsAppService', 'Fallo de autenticación WhatsApp', new Error(msg));
      this.scheduleReconnect();
    });

    // NUEVO: Evento de error del cliente (puppeteer crashes, etc.)
    this.client.on('error', (error) => {
      this.isReady = false;
      this.loggerService.logError('WhatsAppService', 'Error interno del cliente', error);
      this.scheduleReconnect();
    });
  }

  // ============================================
  // RECONEXIÓN AUTOMÁTICA (CORREGIDA)
  // ============================================
  private scheduleReconnect(): void {
    if (this.isReconnecting) {
      this.loggerService.info('WhatsAppService', 'Reconexión ya en curso, ignorando solicitud duplicada');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.status = { 
        estado: 'fallo', 
        mensaje: `Máximo de intentos de reconexión (${this.maxReconnectAttempts}) alcanzado. Reinicie manualmente.` 
      };
      this.loggerService.logError('WhatsAppService', 'Máximo de reconexiones alcanzado', new Error('Max reconnect'));
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    const delay = Math.min(5000 * this.reconnectAttempts, 60000);

    this.loggerService.info('WhatsAppService', `Reconexión programada en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        this.loggerService.info('WhatsAppService', 'Intentando reconectar...');
        // Destruir cliente anterior completamente
        try {
          await this.client.destroy();
        } catch (e) {
          // Ignorar errores de destroy
        }
        this.initializeClient();
        await this.client.initialize();
      } catch (err) {
        this.loggerService.logError('WhatsAppService', 'Error en reconexión', err as Error);
        this.isReconnecting = false; // ← Permitir reintentar
        this.scheduleReconnect();
      }
    }, delay);
  }

  // ============================================
  // HEARTBEAT (OPCIONAL - 60 min)
  // ============================================
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      if (!this.isReady) return;
      try {
        const state = await this.client.getState();
        this.loggerService.info('WhatsAppService', `Heartbeat OK - estado: ${state}`);
      } catch (err) {
        this.loggerService.logError('WhatsAppService', 'Heartbeat falló, frame posiblemente detached', err as Error);
        this.isReady = false;
        this.scheduleReconnect();
      }
    }, 60 * 60 * 1000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ============================================
  // CICLO DE VIDA
  // ============================================
  onModuleInit() {
    if (!this.client) return;
    
    this.client.initialize().catch((err) => {
      this.loggerService.logError('WhatsAppService', 'Error iniciando cliente WhatsApp', err);
      this.scheduleReconnect();
    });
  }

  onModuleDestroy() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.client) {
      this.client.destroy().catch(() => {});
    }
  }

  // ============================================
  // MÉTODOS PÚBLICOS
  // ============================================

  getStatus(): WhatsAppStatus {
    if (this.qrCode && this.status.estado === 'conectando') {
      return { ...this.status, qr: this.qrCode };
    }
    return this.status;
  }

  async regenerateQr(): Promise<WhatsAppStatus> {
    if (!this.enabled || !this.client) {
      return { estado: 'fallo', mensaje: 'WhatsApp deshabilitado' };
    }

    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.qrCode = null;
    try { await this.client.destroy(); } catch (e) {}
    this.initializeClient();
    await this.client.initialize();

    return this.getStatus();
  }

  // ============================================
  // ENVÍO DE MENSAJES (CON DETECCIÓN DE FRAME DETACHED)
  // ============================================

  /**
   * CORRECCIÓN CRÍTICA: Verificar que el cliente esté realmente listo
   * antes de intentar enviar. Si falla por frame detached, reconectar.
   */
  async sendToGroup(mensaje: string): Promise<WhatsAppSendResult> {
    if (!this.isReady || !this.client) {
      return {
        ok: false,
        mensaje: 'WhatsApp no está listo. Estado: ' + this.status.mensaje,
      };
    }

    try {
      const chats = await this.client.getChats();
      const group = chats.find(
        (chat) => chat.isGroup && chat.name === this.groupName,
      );

      if (!group) {
        return {
          ok: false,
          mensaje: `Grupo "${this.groupName}" no encontrado. Verifique que el bot esté en el grupo.`,
        };
      }

      const sent = await this.client.sendMessage(group.id._serialized, mensaje);

      this.loggerService.info('WhatsAppService', `Mensaje enviado al grupo ${this.groupName}`);

      return {
        ok: true,
        messageId: sent.id.id,
        mensaje: 'Mensaje enviado correctamente',
      };
    } catch (error) {
      const errMsg = (error as Error).message;
      this.loggerService.logError('WhatsAppService', `Error enviando mensaje al grupo: ${errMsg}`, error as Error);
      
      // DETECTAR FRAME DETACHED Y RECONectar
      if (errMsg.includes('detached Frame') || errMsg.includes('Target closed') || errMsg.includes('Protocol error')) {
        this.loggerService.info('WhatsAppService', 'Frame detached detectado, iniciando reconexión...');
        this.isReady = false;
        this.scheduleReconnect();
        return {
          ok: false,
          mensaje: `WhatsApp se desconectó (frame detached). Reconexión en progreso. Intente nuevamente en unos segundos.`,
        };
      }

      return {
        ok: false,
        mensaje: `Error: ${errMsg}`,
      };
    }
  }

  async sendToIndividuals(mensaje: string): Promise<WhatsAppSendResult[]> {
    return this.sendToNumbers(this.vocalNumbers, mensaje);
  }

  async sendToNumbers(numeros: string[], mensaje: string): Promise<WhatsAppSendResult[]> {
    const results: WhatsAppSendResult[] = [];

    if (!this.isReady || !this.client) {
      return [{
        ok: false,
        mensaje: 'WhatsApp no está listo',
      }];
    }

    if (!numeros || numeros.length === 0) {
      return [{
        ok: false,
        mensaje: 'No se proporcionaron números',
      }];
    }

    for (const number of numeros) {
      try {
        const cleanNumber = number.trim().replace(/\s/g, '').replace(/\+/g, '');
        const chatId = `${cleanNumber}@c.us`;
        
        const sent = await this.client.sendMessage(chatId, mensaje);

        results.push({
          ok: true,
          messageId: sent.id.id,
          mensaje: `Enviado a ${cleanNumber}`,
        });
      } catch (error) {
        const errMsg = (error as Error).message;
        
        // DETECTAR FRAME DETACHED
        if (errMsg.includes('detached Frame') || errMsg.includes('Target closed')) {
          this.isReady = false;
          this.scheduleReconnect();
          results.push({
            ok: false,
            mensaje: `Error a ${number}: WhatsApp se desconectó. Reconexión en progreso.`,
          });
          // No seguir intentando con otros números si el frame está roto
          break;
        }
        
        results.push({
          ok: false,
          mensaje: `Error a ${number}: ${errMsg}`,
        });
      }
    }

    return results;
  }

  async enviarNotificacionSesion(params: {
    titulo: string;
    tipoSesion: string;
    fecha: string;
    hora: string;
    urlNextcloud: string;
    password: string;
    archivos?: string[];
  }): Promise<WhatsAppSendResult> {
    const archivosLista = params.archivos && params.archivos.length > 0
      ? params.archivos.map((a, i) => `${i + 1}. ${a}`).join('\n')
      : 'No se especificaron documentos';

    const mensaje = `
🏛️ *TRIBUNAL ELECTORAL DEPARTAMENTAL DE POTOSÍ*
*CITACIÓN A REUNIÓN DE SALA PLENA*

📋 *Título:* ${params.titulo}
📋 *Modalidad:* ${params.tipoSesion.toUpperCase()}
📅 *Fecha:* ${params.fecha}
🕐 *Hora:* ${params.hora}

🔗 *Enlace:* ${params.urlNextcloud}
🔑 *Contraseña:* ${params.password}

📄 *Documentos disponibles para revisión:*
${archivosLista}

Por favor no comparta este enlace.
    `.trim();

    // Intentar grupo primero
    const groupResult = await this.sendToGroup(mensaje);

    // Si falla el grupo por frame detached, NO intentar individuales (también fallarán)
    if (!groupResult.ok) {
      if (groupResult.mensaje.includes('frame detached') || groupResult.mensaje.includes('Reconexión en progreso')) {
        return groupResult; // Devolver error de reconexión directamente
      }
      
      // Si falló por otro motivo (grupo no encontrado), intentar individuales
      if (this.vocalNumbers.length > 0) {
        this.loggerService.info('WhatsAppService', 'Fallo grupo (no detached), intentando envío a vocales individuales');
        const individualResults = await this.sendToIndividuals(mensaje);
        const allOk = individualResults.every((r) => r.ok);
        return {
          ok: allOk,
          mensaje: allOk
            ? 'Enviado a vocales individualmente'
            : `Fallo grupo y individuales: ${individualResults.map((r) => r.mensaje).join('; ')}`,
        };
      }
    }

    return groupResult;
  }
  
}