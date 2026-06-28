import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as httpntlm from 'httpntlm';
import { LoggerService } from '../logger/logger.service';

interface NtlmOptions {
  url: string;
  username: string;
  password: string;
  domain: string;
  workstation: string;
  body: string;
  headers: Record<string, string>;
  rejectUnauthorized?: boolean;
  timeout?: number;
}

interface NtlmResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

@Injectable()
export class EmailService {
  private readonly ewsUrl: string;
  private readonly authUser: string;
  private readonly authPass: string;
  private readonly authDomain: string;
  private readonly workstation: string;
  private readonly fromAddress: string;
  private readonly fromName: string;
  private readonly defaultRecipients: string[];
  private readonly timeout: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.ewsUrl = this.configService.get<string>('EWS_URL');
    if (!this.ewsUrl || this.ewsUrl.trim() === '') {
      throw new Error('EWS_URL debe estar definido en las variables de entorno');
    }

    this.authUser = this.configService.get<string>('EMAIL_USER', '');
    this.authPass = this.configService.get<string>('EMAIL_PASSWORD', '');
    this.authDomain = this.configService.get<string>('EMAIL_AUTH_DOMAIN', '');
    this.workstation = this.configService.get<string>('EMAIL_NTLM_WORKSTATION', 'BACKEND');

    this.fromAddress = this.configService.get<string>('EMAIL_ACCOUNTFROM_ADDRESS', '');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'NOTIFICADORA - TED Potosi');

    const recipientsEnv = this.configService.get<string>('EMAIL_RECIPIENTS', '');
    this.defaultRecipients = recipientsEnv
      ? recipientsEnv.split(',').map((r) => r.trim())
      : [];

    this.timeout = this.configService.get<number>('NEXTCLOUD_TIMEOUT_MS', 30000);

    this.loggerService.info(
      'EmailService',
      `EWS (NTLM) configurado - url:${this.ewsUrl} user:${this.authUser} from:${this.fromAddress} domain:"${this.authDomain}"`,
    );
  }

  /**
   * Envía una petición SOAP a EWS autenticada con NTLM.
   */
  private sendNtlmRequest(soapBody: string): Promise<NtlmResponse> {
    const options: NtlmOptions = {
      url: this.ewsUrl,
      username: this.authUser,
      password: this.authPass,
      domain: this.authDomain,
      workstation: this.workstation,
      body: soapBody,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'http://schemas.microsoft.com/exchange/services/2006/messages/CreateItem',
      },
      rejectUnauthorized: false, // ← CRÍTICO: certificados internos/autofirmados
      timeout: this.timeout,      // ← CRÍTICO: evita colgarse indefinidamente
    };

    this.loggerService.debug(
      'EmailService',
      `SOAP Request:\n${soapBody.slice(0, 3000)}`,
    );

    return new Promise((resolve, reject) => {
      try {
        (httpntlm as any).post(options, (err: Error, res: NtlmResponse) => {
          if (err) {
            this.loggerService.logError(
              'EmailService',
              `Error NTLM/HTTP: ${err.message}`,
              err,
            );
            return reject(err);
          }

          this.loggerService.debug(
            'EmailService',
            `SOAP Response status:${res.statusCode} body:${res.body?.slice(0, 2000)}`,
          );

          resolve(res);
        });
      } catch (error) {
        this.loggerService.logError(
          'EmailService',
          'Excepción al invocar httpntlm.post',
          error as Error,
        );
        reject(error);
      }
    });
  }

  /**
   * Escapa caracteres especiales de XML en valores dinámicos (NO en HTML completo).
   */
  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Construye la lista de archivos en HTML.
   */
  private buildArchivosHtml(archivos?: string[]): string {
    if (!archivos || archivos.length === 0) {
      return '<p style="color: #666;">No se especificaron documentos</p>';
    }
    const lista = archivos
      .map((a, i) => `<p style="margin: 4px 0;"><strong>${i + 1}.</strong> ${this.escapeXml(a)}</p>`)
      .join('');
    return lista;
  }

  /**
   * Construye el envelope SOAP de CreateItem (envío de correo) para EWS.
   * NOTA: No incluye <t:From> porque en EWS es de solo lectura en CreateItem.
   */
  private buildCreateItemSoap(
    destinatarios: string[],
    asunto: string,
    cuerpoHtml: string,
  ): string {
    const toRecipientsXml = destinatarios
      .map(
        (d) => `
          <t:Mailbox>
            <t:EmailAddress>${this.escapeXml(d)}</t:EmailAddress>
          </t:Mailbox>`,
      )
      .join('');

    // El cuerpo HTML va dentro de CDATA para preservar las tags HTML sin escapar.
    // Si el HTML contiene "]]>", lo dividimos para no romper el CDATA.
    const cuerpoHtmlSafe = cuerpoHtml.replace(/\]\]>/g, ']]]]><![CDATA[>');

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
               xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages">
  <soap:Header>
    <t:RequestServerVersion Version="Exchange2010_SP2" />
  </soap:Header>
  <soap:Body>
    <m:CreateItem MessageDisposition="SendAndSaveCopy">
      <m:SavedItemFolderId>
        <t:DistinguishedFolderId Id="sentitems" />
      </m:SavedItemFolderId>
      <m:Items>
        <t:Message>
          <t:Subject>${this.escapeXml(asunto)}</t:Subject>
          <t:Body BodyType="HTML"><![CDATA[${cuerpoHtmlSafe}]]></t:Body>
          <t:ToRecipients>${toRecipientsXml}
          </t:ToRecipients>
        </t:Message>
      </m:Items>
    </m:CreateItem>
  </soap:Body>
</soap:Envelope>`;
  }

  async enviarEmail(
    destinatarios: string[],
    asunto: string,
    cuerpoHtml: string,
    cuerpoTexto?: string,
  ): Promise<{ ok: boolean; message: string; messageId?: string }> {
    void cuerpoTexto;
    try {
      if (!destinatarios || destinatarios.length === 0) {
        return {
          ok: false,
          message: 'No hay destinatarios',
        };
      }

      // Validar formato básico de emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = destinatarios.filter((d) => !emailRegex.test(d));
      if (invalidEmails.length > 0) {
        return {
          ok: false,
          message: `Emails inválidos: ${invalidEmails.join(', ')}`,
        };
      }

      const soapBody = this.buildCreateItemSoap(destinatarios, asunto, cuerpoHtml);
      const res = await this.sendNtlmRequest(soapBody);

      if (res.statusCode !== 200) {
        this.loggerService.logError(
          'EmailService',
          `EWS respondió status ${res.statusCode}`,
          new Error(res.body?.slice(0, 1000)),
        );
        return {
          ok: false,
          message: `Error EWS: HTTP ${res.statusCode}`,
        };
      }

      if (res.body.includes('ResponseClass="Error"')) {
        const match = res.body.match(/<m:MessageText>(.*?)<\/m:MessageText>/);
        const errorMsg = match ? match[1] : 'Error desconocido devuelto por EWS';
        this.loggerService.logError(
          'EmailService',
          'EWS devolvió error en el SOAP response',
          new Error(errorMsg),
        );
        return {
          ok: false,
          message: `Error EWS: ${errorMsg}`,
        };
      }

      this.loggerService.info(
        'EmailService',
        `Email enviado vía EWS/NTLM a: ${destinatarios.join(', ')}`,
      );

      return {
        ok: true,
        message: 'Email enviado correctamente',
      };
    } catch (error) {
      this.loggerService.logError(
        'EmailService',
        'Error enviando email vía EWS/NTLM',
        error as Error,
      );
      return {
        ok: false,
        message: `Error: ${(error as Error).message}`,
      };
    }
  }

  async enviarNotificacionSesion(params: {
    destinatarios?: string[];
    titulo: string;
    tipoSesion: string;
    fecha: string;
    hora: string;
    urlNextcloud: string;
    password: string;
    fechaExpiracion: string;
    archivos?: string[];
  }): Promise<{ ok: boolean; message: string; messageId?: string }> {
    const destinatarios = params.destinatarios || this.defaultRecipients;

    if (destinatarios.length === 0) {
      return {
        ok: false,
        message: 'No hay destinatarios configurados',
      };
    }

    const asunto = `Citación a ${params.titulo} - TED Potosí`;
    const archivosHtml = this.buildArchivosHtml(params.archivos);

    const cuerpoHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #003366; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; }
          .documents { background: #e8f4fd; padding: 15px; border-left: 4px solid #0d6efd; margin: 15px 0; }
          .documents h3 { margin-top: 0; color: #0d6efd; font-size: 16px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .btn { display: inline-block; padding: 10px 20px; background: #003366; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏛️ TRIBUNAL ELECTORAL DEPARTAMENTAL DE POTOSÍ</h1>
            <h2>CITACIÓN A REUNIÓN DE SALA PLENA</h2>
          </div>
          <div class="content">
            <p>Estimados Vocales:</p>
            <p>Se les convoca a la siguiente sesión de Sala Plena:</p>
            <div class="highlight">
              <p><strong>📋 Título:</strong> ${params.titulo}</p>
              <p><strong>📋 Modalidad:</strong> ${params.tipoSesion.toUpperCase()}</p>
              <p><strong>📅 Fecha:</strong> ${params.fecha}</p>
              <p><strong>🕐 Hora:</strong> ${params.hora}</p>
            </div>
            <div class="documents">
              <h3>📄 Documentos disponibles para revisión:</h3>
              ${archivosHtml}
            </div>
            <p><strong>🔗 Enlace a documentos:</strong></p>
            <p><a href="${params.urlNextcloud}" class="btn">Acceder a Documentos</a></p>
            <p>O copie este enlace: <code>${params.urlNextcloud}</code></p>
            <p><strong>🔑 Contraseña:</strong> <span style="font-size: 18px; color: #d63384;">${params.password}</span></p>
            <p><strong>⏰ Enlace expira:</strong> ${params.fechaExpiracion}</p>
            <p style="color: #666; font-size: 12px;">
              Este es un mensaje automático del Sistema de Gestión Documental - Sala Plena TED Potosí.
            </p>
          </div>
          <div class="footer">
            <p>Tribunal Electoral Departamental de Potosí</p>
            <p>Secretaría de Sala Plena</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.enviarEmail(destinatarios, asunto, cuerpoHtml);
  }
}