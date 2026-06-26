import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  BadRequestException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../auth/enums/rol.enum';
import { NextcloudService } from './nextcloud.service';
import { BrowseDirectoryDto } from './dto/browse-directory.dto';
import { CreateShareDto } from './dto/create-share.dto';
import { NextcloudFileItem, NextcloudQuota, NextcloudShare } from './interfaces/nextcloud-response.interface';
import { Response } from 'express';

@ApiTags('Nextcloud - Nube Privada')
@ApiBearerAuth('JWT-auth')
@Controller('nextcloud')
export class NextcloudController {
  constructor(private readonly nextcloudService: NextcloudService) {}

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Debug: listar directorio con logs detallados' })
  @Get('browse-debug')
  async browseDebug(@Query('path') path?: string) {
    try {
      const result = await this.nextcloudService.listDirectory(path || '');
      return {
        success: true,
        path: path || '',
        itemsCount: result.length,
        items: result,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        path: path || '',
        error: err.message,
        errorType: err.constructor.name,
      };
    }
  }

  @Get('debug-config')
  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Debug: ver configuración Nextcloud' })
  async debugConfig() {
    return this.nextcloudService.debugConfig();
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Obtener cuota de espacio en Nextcloud' })
  @Get('quota')
  async getQuota(): Promise<NextcloudQuota> {
    return this.nextcloudService.getUserQuota();
  }

  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Listar contenido de directorio' })
  @ApiQuery({ name: 'path', required: false, description: 'Ruta relativa a SalaPlena' })
  @Get('browse')
  async browseDirectory(@Query('path') path?: string): Promise<NextcloudFileItem[]> {
    return this.nextcloudService.listDirectory(path || '');
  }

  // 🆕 NUEVO: Descargar archivo vía proxy para visualización PDF
  @Auth(Role.Admin, Role.Usuario)
  @ApiOperation({ summary: 'Descargar archivo vía proxy (para visualización PDF)' })
  @ApiQuery({ name: 'path', required: true, description: 'Ruta relativa a SalaPlena' })
  @Get('download')
  async downloadFile(@Query('path') path: string, @Res() res: Response) {
    if (!path) throw new BadRequestException('El parámetro path es requerido');
    
    const fileBuffer = await this.nextcloudService.downloadFile(path);
    const fileName = path.split('/').pop() || 'archivo';
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(fileBuffer);
  }

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Crear enlace compartido' })
  @Post('share')
  async createShare(@Body() dto: CreateShareDto): Promise<NextcloudShare> {
    return this.nextcloudService.createShare(
      dto.path,
      dto.password,
      dto.expireDate,
    );
  }

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Buscar share por path' })
  @ApiQuery({ name: 'path', required: true, description: 'Ruta relativa a SalaPlena' })
  @Get('share')
  async findShare(@Query('path') path: string): Promise<NextcloudShare | null> {
    if (!path) throw new BadRequestException('El parámetro path es requerido');
    return this.nextcloudService.findShareByPath(path);
  }

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Eliminar share por ID' })
  @Delete('share/:id')
  async deleteShare(@Param('id') id: string): Promise<{ message: string }> {
    await this.nextcloudService.deleteShare(parseInt(id, 10));
    return { message: 'Share eliminado correctamente' };
  }

  @Auth(Role.Admin)
  @ApiOperation({ summary: 'Eliminar archivo/carpeta' })
  @ApiQuery({ name: 'path', required: true, description: 'Ruta relativa a SalaPlena' })
  @Delete('file')
  async deleteFile(@Query('path') path: string): Promise<{ message: string }> {
    if (!path) throw new BadRequestException('El parámetro path es requerido');
    await this.nextcloudService.deleteFile(path);
    return { message: 'Eliminado correctamente' };
  }
}