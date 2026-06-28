import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFiles,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiTags, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { SesionesService, PaginatedResponse } from './sesiones.service';
import { Sesion } from './entities/sesion.entity';
import { CreateSesionDto, CreateSesionUploadDto } from './dto/create-sesion.dto';
import { UpdateSesionDto } from './dto/update-sesion.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../auth/enums/rol.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmailService } from '../email/email.service';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Sesiones')
@Controller('sesiones')
export class SesionesController {
  constructor(
    private readonly sesionesService: SesionesService,
    private readonly emailService: EmailService,
  ) {}

  // ============================================
  // RUTAS SIN :id (van primero)
  // ============================================

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Crear nueva sesión con archivos PDF' })
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 50, {
    storage: diskStorage({
      destination: (req, file, cb) => {
        // Ruta configurable: leer de .env o usar fallback
        const uploadPath = process.env.UPLOAD_TEMP_PATH || './uploads/temp';
        const resolvedPath = path.resolve(uploadPath);

        // Crear directorio si no existe (multer no lo hace automáticamente
        // cuando se usa callback en destination)
        try {
          if (!fs.existsSync(resolvedPath)) {
            fs.mkdirSync(resolvedPath, { recursive: true });
          }
        } catch (err) {
          // Fallback a directorio local si no tiene permisos
          const fallbackPath = path.resolve('./uploads/temp');
          if (!fs.existsSync(fallbackPath)) {
            fs.mkdirSync(fallbackPath, { recursive: true });
          }
          return cb(null, fallbackPath);
        }

        cb(null, resolvedPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${path.basename(file.originalname)}`);
      },
    }),
    limits: {
      fileSize: 100 * 1024 * 1024,
      files: 50,
    },
  }))
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createWithUpload(
    @Body() createSesionDto: CreateSesionUploadDto,
    @UploadedFiles() files: any[],
    @CurrentUser() user: JwtPayload,
  ) {
    if (!createSesionDto.usuarioRegistro) {
      createSesionDto.usuarioRegistro = user.usuario;
    }
    return this.sesionesService.createWithUpload(createSesionDto, files);
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Crear nueva sesión (sin archivos)' })
  @Post()
  create(
    @Body() createSesionDto: CreateSesionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!createSesionDto.usuarioRegistro) {
      createSesionDto.usuarioRegistro = user.usuario;
    }
    return this.sesionesService.create(createSesionDto);
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Listar sesiones (paginado, con filtros)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'fechaDesde', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'fechaHasta', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'estado', required: false, type: String, description: 'activo | inactivo | archivado' })
  @ApiQuery({ name: 'titulo', required: false, type: String, description: 'Búsqueda parcial por título' })
  @ApiQuery({ name: 'emailEnviado', required: false, type: Boolean })
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('estado') estado?: string,
    @Query('titulo') titulo?: string,
    @Query('emailEnviado') emailEnviado?: string,
  ): Promise<PaginatedResponse<Sesion>> {
    const emailEnviadoBool = emailEnviado !== undefined ? emailEnviado === 'true' : undefined;

    return this.sesionesService.findAll(page, limit, {
      fechaDesde,
      fechaHasta,
      estado,
      titulo,
      emailEnviado: emailEnviadoBool,
    });
  }

  // ============================================
  // RUTAS ESPECÍFICAS CON :id/accion
  // ============================================

  // ESTADO de sesión (para polling del frontend)
  @Throttle({ short: { ttl: 1000, limit: 999999 }, medium: { ttl: 60000, limit: 999999 }, long: { ttl: 3600000, limit: 999999 } })
  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Obtener estado de procesamiento de sesión' })
  @Get(':id/status')
  async getStatus(@Param('id', ParseIntPipe) id: number) {
    const sesion = await this.sesionesService.findOne(id);
    return {
      id: sesion.id,
      titulo: sesion.titulo,
      estado: sesion.estado,
      carpeta: sesion.carpeta,
      urlNextcloud: sesion.urlNextcloud,
      password: sesion.password,
      fechaExpiracion: sesion.fechaExpiracion,
      respaldoOk: sesion.respaldoOk,
      emailEnviado: sesion.emailEnviado,
      whatsappEnviado: sesion.whatsappEnviado,
      documentosCount: sesion.documentos?.length || 0,
      archivosSubidos: sesion.archivosSubidos || 0,
      totalArchivos: sesion.totalArchivos || 0,
      completado: !!sesion.urlNextcloud && sesion.emailEnviado,
    };
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Reenviar notificación de sesión por email' })
  @Post(':id/retry-email')
  async retryEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: { destinatarios?: string[] },
  ) {
    const sesion = await this.sesionesService.findOne(id);
    const nombresArchivos = sesion.documentos?.map((d) => d.nombreArchivo) || [];

    const result = await this.emailService.enviarNotificacionSesion({
      destinatarios: dto?.destinatarios,
      titulo: sesion.titulo,
      tipoSesion: sesion.tipoSesion || 'presencial',
      fecha: this.formatFecha(sesion.fechaSesion),
      hora: sesion.horaSesion,
      urlNextcloud: sesion.urlNextcloud || '',
      password: sesion.password || '',
      fechaExpiracion: sesion.fechaExpiracion
        ? this.formatFecha(sesion.fechaExpiracion)
        : '',
      archivos: nombresArchivos,
    });

    if (result.ok) {
      await this.sesionesService.marcarEmailEnviado(id, result.message);
    }

    return result;
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Reenviar notificación de sesión por WhatsApp' })
  @Post(':id/retry-whatsapp')
  async retryWhatsapp(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.sesionesService.retryWhatsapp(id);
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Cambiar estado de la sesión' })
  @Patch(':id/estado/:estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Param('estado') estado: string,
  ): Promise<Sesion> {
    return this.sesionesService.cambiarEstado(id, estado);
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Marcar email como enviado' })
  @Patch(':id/email-enviado')
  marcarEmailEnviado(
    @Param('id', ParseIntPipe) id: number,
    @Body('mensaje') mensaje: string,
  ): Promise<Sesion> {
    return this.sesionesService.marcarEmailEnviado(id, mensaje);
  }

  // NUEVO: Marcar WhatsApp como enviado manualmente
  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Marcar WhatsApp como enviado manualmente' })
  @Patch(':id/whatsapp-enviado')
  async marcarWhatsappEnviado(
    @Param('id', ParseIntPipe) id: number,
    @Body('mensaje') mensaje: string,
  ): Promise<Sesion> {
    return this.sesionesService.marcarWhatsappEnviado(id, mensaje);
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Marcar respaldo como exitoso' })
  @Patch(':id/respaldo-ok')
  marcarRespaldoOk(@Param('id', ParseIntPipe) id: number): Promise<Sesion> {
    return this.sesionesService.marcarRespaldoOk(id);
  }

  // ============================================
  // RUTAS CON :id SIN SUFIJO
  // ============================================

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Obtener sesión por ID' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Sesion> {
    return this.sesionesService.findOne(id);
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Actualizar sesión' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSesionDto: UpdateSesionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    console.log(`Sesión ${id} actualizada por: ${user.usuario}`);
    return this.sesionesService.update(id, updateSesionDto);
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Eliminar sesión (soft delete)' })
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    console.log(`Sesión ${id} marcada como inactiva por: ${user.usuario}`);
    return this.sesionesService.remove(id);
  }

  // ============================================
  // RANGO DE FECHAS
  // ============================================
  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Buscar sesiones por rango de fechas' })
  @Get('rango/:desde/:hasta')
  findByRangoFechas(
    @Param('desde') desde: string,
    @Param('hasta') hasta: string,
  ): Promise<Sesion[]> {
    return this.sesionesService.findByRangoFechas(desde, hasta);
  }

  // ============================================
  // HELPER PRIVADO
  // ============================================
  private formatFecha(fecha: any): string {
    if (!fecha) return '';
    if (typeof fecha === 'string') return fecha;
    if (fecha instanceof Date) return fecha.toISOString().split('T')[0];
    return new Date(fecha).toISOString().split('T')[0];
  }
}