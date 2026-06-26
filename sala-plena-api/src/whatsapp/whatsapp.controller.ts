import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../auth/enums/rol.enum';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppStatus, WhatsAppSendResult } from './interfaces/whatsapp-status.interface';
import { SendNotificationDto, SendToNumbersDto } from './dto/send-notification.dto';

@ApiTags('WhatsApp')
@ApiBearerAuth('JWT-auth')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  // ============================================
  // NUEVO: Health Check
  // ============================================
  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Verificar si WhatsApp está realmente conectado y listo para enviar' })
  @Get('health')
  getHealth(): { ok: boolean; estado: string; mensaje: string; puedeEnviar: boolean } {
    const status = this.whatsAppService.getStatus();
    const puedeEnviar = status.estado === 'conectado';
    return {
      ok: puedeEnviar,
      estado: status.estado,
      mensaje: status.mensaje,
      puedeEnviar,
    };
  }

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Estado de WhatsApp Web y QR de vinculación' })
  @Get('status')
  getStatus(): WhatsAppStatus {
    return this.whatsAppService.getStatus();
  }

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Regenerar QR de vinculación' })
  @Post('qr')
  async regenerateQr(): Promise<WhatsAppStatus> {
    return this.whatsAppService.regenerateQr();
  }

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Enviar mensaje al grupo configurado' })
  @Post('send')
  async sendMessage(
    @Body('mensaje') mensaje: string,
  ): Promise<WhatsAppSendResult> {
    return this.whatsAppService.sendToGroup(mensaje);
  }

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Enviar mensaje a vocales individuales (números de .env)' })
  @Post('send-individual')
  async sendToIndividuals(
    @Body('mensaje') mensaje: string,
  ): Promise<{ ok: boolean; resultados: WhatsAppSendResult[] }> {
    const resultados = await this.whatsAppService.sendToIndividuals(mensaje);
    const allOk = resultados.every((r) => r.ok);
    return {
      ok: allOk,
      resultados,
    };
  }

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Enviar mensaje a número(s) específico(s)' })
  @Post('send-to')
  async sendToNumbers(
    @Body() dto: SendToNumbersDto,
  ): Promise<{ ok: boolean; enviados: number; fallidos: number; detalles: WhatsAppSendResult[] }> {
    const resultados = await this.whatsAppService.sendToNumbers(dto.numeros, dto.mensaje);
    const enviados = resultados.filter((r) => r.ok).length;
    const fallidos = resultados.filter((r) => !r.ok).length;
    
    return {
      ok: fallidos === 0,
      enviados,
      fallidos,
      detalles: resultados,
    };
  }

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Enviar notificación completa de sesión (template con archivos)' })
  @Post('notify-session')
  async notifySession(
    @Body() dto: SendNotificationDto,
  ): Promise<WhatsAppSendResult> {
    return this.whatsAppService.enviarNotificacionSesion(dto);
  }
}