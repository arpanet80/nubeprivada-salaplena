import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../auth/enums/rol.enum';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';

@ApiTags('Email')
@ApiBearerAuth('JWT-auth')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Enviar email genérico' })
  @Post('send')
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.emailService.enviarEmail(
      dto.destinatarios,
      dto.asunto,
      dto.cuerpoHtml,
      dto.cuerpoTexto,
    );
  }
}