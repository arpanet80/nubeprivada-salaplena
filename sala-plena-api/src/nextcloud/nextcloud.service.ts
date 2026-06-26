import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DataSource } from 'typeorm';
import { XMLParser } from 'fast-xml-parser';
import { firstValueFrom } from 'rxjs';
import { NextcloudQuota, NextcloudShare, NextcloudFileItem, OcsResponse } from './interfaces/nextcloud-response.interface';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class NextcloudService implements OnModuleInit {
  private readonly logger = new Logger(NextcloudService.name);
  private readonly baseUrl: string;
  private readonly basePath: string;
  private readonly auth: { username: string; password: string };
  private readonly basicAuthHeader: string;
  private readonly xmlParser: XMLParser;
  private readonly timeout: number;

  // Se inicializan dinámicamente en onModuleInit()
  private userId: string = '';
  private webdavUrl: string = '';
  private webdavPath: string = '';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly dataSource: DataSource,
    private readonly loggerService: LoggerService,
  ) {
    this.baseUrl = this.configService.get<string>('NEXTCLOUD_URL', '').replace(/\/$/, '');
    this.basePath = this.configService.get<string>('NEXTCLOUD_BASE_PATH', 'SalaPlena');

    const username = this.configService.get<string>('NEXTCLOUD_SERVICE_USER', '');
    const password = this.configService.get<string>('NEXTCLOUD_SERVICE_PASSWORD', '');

    if (!this.baseUrl || !username || !password) {
      throw new Error('NEXTCLOUD_URL, NEXTCLOUD_SERVICE_USER y NEXTCLOUD_SERVICE_PASSWORD son requeridos en .env');
    }

    this.auth = { username, password };
    this.basicAuthHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    
    this.timeout = this.configService.get<number>('NEXTCLOUD_TIMEOUT_MS', 30000);

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      removeNSPrefix: true,
    });
  }

  // ============================================
  // INICIALIZACIÓN DINÁMICA DEL USER ID
  // ============================================
  async onModuleInit(): Promise<void> {
    this.logger.log('Inicializando NextcloudService - obteniendo userId dinámicamente...');
    
    try {
      const resolvedUserId = await this.resolveUserId();
      this.userId = resolvedUserId;
      this.webdavUrl = `${this.baseUrl}/remote.php/dav/files/${this.userId}`;
      this.webdavPath = `/remote.php/dav/files/${this.userId}`;
      
      this.logger.log(`✅ NextcloudService inicializado - userId: ${this.userId}`);
      this.logger.log(`   webdavUrl: ${this.webdavUrl}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ No se pudo obtener userId dinámicamente: ${err.message}`);
      
      // Fallback: intentar usar el valor del .env si existe
      const fallbackUserId = this.configService.get<string>('NEXTCLOUD_USER_ID', '');
      if (fallbackUserId) {
        this.logger.warn(`⚠️ Usando NEXTCLOUD_USER_ID del .env como fallback: ${fallbackUserId}`);
        this.userId = fallbackUserId;
        this.webdavUrl = `${this.baseUrl}/remote.php/dav/files/${this.userId}`;
        this.webdavPath = `/remote.php/dav/files/${this.userId}`;
      } else {
        this.logger.error('❌ No hay NEXTCLOUD_USER_ID en .env como fallback. El servicio no funcionará.');
        throw new InternalServerErrorException('No se pudo inicializar NextcloudService: falta userId');
      }
    }
  }

  private async resolveUserId(): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/ocs/v2.php/cloud/user`,
        {
          auth: this.getAuth(),
          headers: {
            ...this.getHeaders(),
            'Accept': 'application/json',
          },
          timeout: this.timeout,
          validateStatus: () => true,
        },
      ),
    );

    if (response.status !== 200) {
      throw new Error(`OCS /cloud/user falló con status ${response.status}`);
    }

    const ocsData = response.data as OcsResponse<any>;
    if (ocsData.ocs?.meta?.statuscode !== 200) {
      throw new Error(`OCS error: ${ocsData.ocs?.meta?.message}`);
    }

    const userId = ocsData.ocs.data?.id;
    if (!userId) {
      throw new Error('No se encontró id en la respuesta OCS /cloud/user');
    }

    return userId;
  }

  // ============================================
  // HEADERS COMUNES (OCS API)
  // ============================================
  private getHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'SalaPlenaApp/2.0',
      'X-Requested-With': 'XMLHttpRequest',
      'OCS-APIRequest': 'true',
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  private getAuth() {
    return {
      username: this.auth.username,
      password: this.auth.password,
    };
  }

  // ============================================
  // HEADERS PARA WEBDAV (Basic Auth manual)
  // ============================================
  private getWebdavHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'SalaPlenaApp/2.0',
      'Authorization': this.basicAuthHeader,
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  // ============================================
  // HELPER: Manejo de errores HTTP
  // ============================================
  private handleHttpError(status: number, context: string): never {
    switch (status) {
      case 401:
        throw new InternalServerErrorException(
          `Autenticación fallida en Nextcloud (${context}). Verifique credenciales de servicio.`
        );
      case 403:
        throw new InternalServerErrorException(
          `Acceso denegado en Nextcloud (${context}). Verifique permisos del usuario.`
        );
      case 404:
        throw new InternalServerErrorException(
          `Recurso no encontrado en Nextcloud (${context})`
        );
      case 409:
        throw new InternalServerErrorException(
          `Conflicto en Nextcloud (${context}). Posiblemente el recurso ya existe.`
        );
      case 423:
        throw new InternalServerErrorException(
          `Recurso bloqueado en Nextcloud (${context})`
        );
      case 507:
        throw new InternalServerErrorException(
          `Espacio insuficiente en Nextcloud (${context})`
        );
      default:
        throw new InternalServerErrorException(
          `Error ${status} en Nextcloud (${context})`
        );
    }
  }

  // ============================================
  // HELPER: Construir URL WebDAV correctamente
  // ============================================
  private buildWebdavUrl(...segments: string[]): string {
    let url = this.webdavUrl;
    for (const segment of segments) {
      if (!segment) continue;
      const cleanSegment = segment.replace(/^\/+/, '').replace(/\/+$/, '');
      if (cleanSegment) {
        const parts = cleanSegment.split('/').map(part => encodeURIComponent(part));
        url = url + '/' + parts.join('/');
      }
    }
    return url;
  }

  // ============================================
  // A: CUOTA (OCS API)
  // ============================================
  async getUserQuota(): Promise<NextcloudQuota> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/ocs/v2.php/cloud/user`,
          {
            auth: this.getAuth(),
            headers: {
              ...this.getHeaders(),
              'Accept': 'application/json',
            },
            timeout: this.timeout,
            validateStatus: () => true,
          },
        ),
      );

      if (response.status !== 200) {
        throw new Error(`OCS falló con status ${response.status}`);
      }

      const ocsData = response.data as OcsResponse<any>;
      if (ocsData.ocs?.meta?.statuscode !== 200) {
        throw new Error(`OCS error: ${ocsData.ocs?.meta?.message}`);
      }

      const quota = ocsData.ocs.data?.quota;
      if (!quota) {
        throw new Error('No se encontró información de cuota');
      }

      const used = parseInt(quota.used, 10) || 0;
      const free = parseInt(quota.free, 10) || 0;
      const total = parseInt(quota.total, 10) || 0;
      const relative = parseFloat(quota.relative) || 0;

      const result: NextcloudQuota = {
        used,
        available: free,
        total: total > 0 ? total : used + free,
        usedPercent: Math.round(relative),
        freePercent: 100 - Math.round(relative),
      };

      this.loggerService.info(
        'NextcloudService',
        `Cuota obtenida - usedMB:${Math.round(used / 1024 / 1024)} freePercent:${result.freePercent}%`,
      );

      return result;
    } catch (error) {
      const err = error as Error;
      this.loggerService.logError('NextcloudService', 'Error obteniendo cuota', err);
      throw new InternalServerErrorException('No se pudo obtener la cuota de Nextcloud');
    }
  }

  // ============================================
  // B: CREAR CARPETA (MKCOL)
  // ============================================
  async createFolder(relativePath: string): Promise<void> {
    const fullPath = this.buildWebdavUrl(this.basePath, relativePath);
    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'MKCOL',
          url: fullPath,
          headers: this.getWebdavHeaders(),
          timeout: this.timeout,
          validateStatus: () => true,
        }),
      );

      if (response.status === 405) {
        this.loggerService.info('NextcloudService', 'Carpeta ya existe', { path: relativePath });
        return;
      }

      if (response.status !== 201) {
        this.handleHttpError(response.status, `MKCOL ${relativePath}`);
      }

      this.loggerService.info('NextcloudService', 'Carpeta creada', { path: relativePath });
    } catch (error) {
      const err = error as Error;
      this.loggerService.logError('NextcloudService', 'Error creando carpeta', err, { path: relativePath });
      throw new InternalServerErrorException(`No se pudo crear la carpeta: ${relativePath}`);
    }
  }

  // ============================================
  // C: SUBIR ARCHIVO (PUT) — CON LOGGING DETALLADO
  // ============================================
  async uploadFile(relativePath: string, fileBuffer: Buffer): Promise<void> {
    const fullPath = this.buildWebdavUrl(this.basePath, relativePath);
    
    this.loggerService.info(
      'NextcloudService',
      `PUT REQUEST - relativePath: ${relativePath}`,
      { 
        fullPath, 
        bufferSize: fileBuffer.length,
        bufferType: typeof fileBuffer,
        isBuffer: Buffer.isBuffer(fileBuffer),
        webdavUrl: this.webdavUrl,
        basePath: this.basePath,
      }
    );

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'PUT',
          url: fullPath,
          headers: {
            ...this.getWebdavHeaders(),
            'Content-Type': 'application/octet-stream',
            'Content-Length': fileBuffer.length.toString(),
          },
          data: fileBuffer,
          timeout: this.timeout * 2,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          validateStatus: () => true,
          transformRequest: [(data) => data],
        }),
      );

      this.loggerService.info(
        'NextcloudService',
        `PUT RESPONSE - status: ${response.status}`,
        { 
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          bodyType: typeof response.data,
          bodyPreview: response.data?.toString?.()?.slice(0, 500) || 'empty/no-string'
        }
      );

      console.log('🔴 DEBUG PUT RESPONSE:', {
        url: fullPath,
        status: response.status,
        statusText: response.statusText,
        body: response.data?.toString?.()?.slice(0, 500),
      });

      if (![201, 204].includes(response.status)) {
        this.loggerService.logError(
          'NextcloudService',
          `PUT falló con status ${response.status}: ${response.statusText}`,
          new Error(response.data?.toString?.()?.slice(0, 500) || 'No body')
        );
        this.handleHttpError(response.status, `PUT ${relativePath}`);
      }

      this.loggerService.info('NextcloudService', 'Archivo subido OK', {
        path: relativePath,
        size: fileBuffer.length,
      });
    } catch (error) {
      const err = error as Error;
      this.loggerService.logError(
        'NextcloudService', 
        `Error subiendo archivo - ${err.message}`, 
        err, 
        { 
          path: relativePath, 
          fullPath,
          bufferSize: fileBuffer?.length,
          bufferIsDefined: fileBuffer !== undefined,
          bufferIsBuffer: Buffer.isBuffer(fileBuffer)
        }
      );
      console.log('🔴 DEBUG PUT ERROR:', {
        message: err.message,
        stack: err.stack?.slice(0, 500),
        path: relativePath,
        fullPath,
      });
      throw new InternalServerErrorException(`No se pudo subir el archivo: ${relativePath}`);
    }
  }

  // ============================================
  // D: VERIFICAR UPLOAD (PROPFIND)
  // ============================================
  async verifyUpload(relativePath: string, expectedSize: number): Promise<boolean> {
    const fullPath = this.buildWebdavUrl(this.basePath, relativePath);
    try {
      const propfindBody = `<?xml version="1.0"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop>
            <d:getcontentlength/>
          </d:prop>
        </d:propfind>`;

      const response = await firstValueFrom(
        this.httpService.request({
          method: 'PROPFIND',
          url: fullPath,
          headers: this.getWebdavHeaders('application/xml'),
          data: propfindBody,
          timeout: this.timeout,
          validateStatus: () => true,
        }),
      );

      if (response.status !== 207) {
        return false;
      }

      const parsed = this.xmlParser.parse(response.data);
      const props = this.extractPropsFromPropstat(parsed);
      const remoteSize = parseInt(String(props?.getcontentlength || props?.['d:getcontentlength'] || '0'), 10);

      const verified = remoteSize === expectedSize;
      this.loggerService.info('NextcloudService', 'Verificación de upload', {
        path: relativePath,
        expectedSize,
        remoteSize,
        verified,
      });

      return verified;
    } catch (error) {
      const err = error as Error;
      this.loggerService.logError('NextcloudService', 'Error verificando upload', err, { path: relativePath });
      return false;
    }
  }

  // ============================================
  // E: CREAR SHARE (OCS API)
  // ============================================
  async createShare(
    relativePath: string,
    password: string,
    expireDate?: string,
  ): Promise<NextcloudShare> {
    try {
      const formData = new URLSearchParams();
      formData.append('path', `/${this.basePath}/${relativePath}`);
      formData.append('shareType', '3');
      formData.append('permissions', '1');
      formData.append('password', password);
      if (expireDate) {
        formData.append('expireDate', expireDate);
      }

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
          formData.toString(),
          {
            auth: this.getAuth(),
            headers: {
              ...this.getHeaders('application/x-www-form-urlencoded'),
              'Accept': 'application/json',
            },
            timeout: this.timeout,
            validateStatus: () => true,
          },
        ),
      );

      if (response.status !== 200) {
        throw new Error(`OCS createShare falló con status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      const ocsData = response.data as OcsResponse<any>;
      if (ocsData.ocs.meta.statuscode !== 200) {
        throw new Error(`OCS error: ${ocsData.ocs.meta.message}`);
      }

      const shareData = ocsData.ocs.data;
      const share: NextcloudShare = {
        id: shareData.id,
        token: shareData.token,
        url: shareData.url,
        path: shareData.path,
        shareType: shareData.share_type,
        permissions: shareData.permissions,
        expiration: shareData.expiration,
        password: shareData.password,
      };

      this.loggerService.info('NextcloudService', 'Share creado', {
        shareId: share.id,
        token: share.token,
        url: share.url,
      });

      return share;
    } catch (error) {
      const err = error as Error;
      this.loggerService.logError('NextcloudService', 'Error creando share', err, { path: relativePath });
      throw new InternalServerErrorException('No se pudo crear el enlace compartido');
    }
  }

  // ============================================
  // F: LISTAR DIRECTORIO (PROPFIND Depth:1)
  // ============================================
  async listDirectory(relativePath: string = ''): Promise<NextcloudFileItem[]> {
    const cleanPath = relativePath.replace(/^\/+/, '').replace(/\/+$/, '');
    const fullPath = this.buildWebdavUrl(this.basePath, cleanPath);

    try {
      const propfindBody = `<?xml version="1.0"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop>
            <d:displayname/>
            <d:getcontentlength/>
            <d:resourcetype/>
            <d:getlastmodified/>
            <d:getetag/>
          </d:prop>
        </d:propfind>`;

      const response = await firstValueFrom(
        this.httpService.request({
          method: 'PROPFIND',
          url: fullPath,
          headers: {
            ...this.getWebdavHeaders('application/xml'),
            'Depth': '1',
          },
          data: propfindBody,
          timeout: this.timeout,
          validateStatus: () => true,
        }),
      );

      if (response.status !== 207) {
        throw new Error(`PROPFIND listDirectory falló con status ${response.status}: ${response.statusText}`);
      }

      const parsed = this.xmlParser.parse(response.data);
      
      const multistatus = parsed?.multistatus || parsed?.['d:multistatus'];
      if (!multistatus) {
        return [];
      }

      const responses = multistatus?.response || multistatus?.['d:response'];
      if (!responses) {
        return [];
      }

      const items: NextcloudFileItem[] = [];
      const responseArray = Array.isArray(responses) ? responses : [responses];
      const expectedPrefix = `${this.webdavPath}/${this.basePath}`.replace(/\/+/g, '/');

      for (const resp of responseArray) {
        const href = String(resp?.href || resp?.['d:href'] || '');
        const cleanHref = decodeURIComponent(href).replace(/\/$/, '');
        
        let relativeHref = '';
        if (cleanHref.startsWith(expectedPrefix + '/')) {
          relativeHref = cleanHref.substring(expectedPrefix.length + 1);
        } else if (cleanHref === expectedPrefix || cleanHref === expectedPrefix + '/') {
          relativeHref = '';
        } else {
          const parts = cleanHref.split('/');
          const baseParts = expectedPrefix.split('/');
          if (parts.length > baseParts.length) {
            relativeHref = parts.slice(baseParts.length).join('/');
          }
        }

        if (!relativeHref || relativeHref === cleanPath) {
          continue;
        }

        const propstat = resp?.propstat || resp?.['d:propstat'];
        const propstatArray = Array.isArray(propstat) ? propstat : [propstat];

        let props: any = null;
        for (const ps of propstatArray) {
          if (!ps) continue;
          const statusText = String(ps?.status || ps?.['d:status'] || '');
          if (statusText.includes('200')) {
            props = ps?.prop || ps?.['d:prop'] || {};
            break;
          }
        }

        if (!props) {
          continue;
        }

        const resourceType = props?.resourcetype || props?.['d:resourcetype'] || {};


        const isDirectory = (
          'collection' in resourceType || 
          'd:collection' in resourceType
        );

        const displayName = String(props?.displayname || props?.['d:displayname'] || '');
        const name = displayName || relativeHref.split('/').pop() || 'unknown';

        const contentLength = String(props?.getcontentlength || props?.['d:getcontentlength'] || '0');
        const size = isDirectory ? 0 : parseInt(contentLength, 10) || 0;

        const lastModifiedRaw = String(props?.getlastmodified || props?.['d:getlastmodified'] || '');
        const etagRaw = String(props?.getetag || props?.['d:getetag'] || '');

        items.push({
          name,
          path: relativeHref,
          isDirectory,
          size,
          lastModified: lastModifiedRaw ? new Date(lastModifiedRaw) : new Date(),
          etag: etagRaw || undefined,
        });
      }

      this.loggerService.info('NextcloudService', 'Directorio listado', {
        path: cleanPath,
        itemsCount: items.length,
      });

      return items;
    } catch (error) {
      const err = error as Error;
      this.loggerService.logError('NextcloudService', 'Error listando directorio', err, { path: relativePath });
      throw new InternalServerErrorException('No se pudo listar el directorio');
    }
  }

  // ============================================
  // G: ELIMINAR ARCHIVO/CARPETA (DELETE)
  // ============================================
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.buildWebdavUrl(this.basePath, relativePath);
    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'DELETE',
          url: fullPath,
          headers: this.getWebdavHeaders(),
          timeout: this.timeout,
          validateStatus: () => true,
        }),
      );

      if (![204, 404].includes(response.status)) {
        throw new Error(`DELETE falló con status ${response.status}: ${response.statusText}`);
      }

      this.loggerService.info('NextcloudService', 'Archivo/carpeta eliminado', { path: relativePath });
    } catch (error) {
      const err = error as Error;
      this.loggerService.logError('NextcloudService', 'Error eliminando archivo', err, { path: relativePath });
      throw new InternalServerErrorException(`No se pudo eliminar: ${relativePath}`);
    }
  }

  // ============================================
  // H: BUSCAR SHARE POR PATH (OCS GET)
  // ============================================
  async findShareByPath(relativePath: string): Promise<NextcloudShare | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
          {
            auth: this.getAuth(),
            headers: {
              ...this.getHeaders(),
              'Accept': 'application/json',
            },
            params: {
              path: `/${this.basePath}/${relativePath}`,
              reshares: 'true',
            },
            timeout: this.timeout,
            validateStatus: () => true,
          },
        ),
      );

      if (response.status !== 200) {
        return null;
      }

      const ocsData = response.data as OcsResponse<any>;
      if (ocsData.ocs.meta.statuscode !== 200) {
        return null;
      }

      const shares = ocsData.ocs.data;
      if (!shares || (Array.isArray(shares) && shares.length === 0)) {
        return null;
      }

      const shareData = Array.isArray(shares) ? shares[0] : shares;
      return {
        id: shareData.id,
        token: shareData.token,
        url: shareData.url,
        path: shareData.path,
        shareType: shareData.share_type,
        permissions: shareData.permissions,
        expiration: shareData.expiration,
      };
    } catch (error) {
      const err = error as Error;
      this.loggerService.logError('NextcloudService', 'Error buscando share', err, { path: relativePath });
      return null;
    }
  }

  // ============================================
  // I: ELIMINAR SHARE (OCS DELETE)
  // ============================================
  async deleteShare(shareId: number): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'DELETE',
          url: `${this.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares/${shareId}`,
          auth: this.getAuth(),
          headers: {
            ...this.getHeaders(),
            'Accept': 'application/json',
          },
          timeout: this.timeout,
          validateStatus: () => true,
        }),
      );

      if (![200, 204, 404].includes(response.status)) {
        throw new Error(`DELETE share falló con status ${response.status}: ${response.statusText}`);
      }

      this.loggerService.info('NextcloudService', 'Share eliminado', { shareId });
    } catch (error) {
      const err = error as Error;
      this.loggerService.logError('NextcloudService', 'Error eliminando share', err, { shareId });
      throw new InternalServerErrorException('No se pudo eliminar el share');
    }
  }

  // ============================================
  // J: VERIFICAR ESPACIO SUFICIENTE
  // ============================================
  async checkSpaceRequired(requiredBytes: number): Promise<boolean> {
    const quota = await this.getUserQuota();
    if (quota.available === -1) return true;
    return quota.available >= requiredBytes;
  }

  // 🆕 NUEVO: DESCARGAR ARCHIVO (GET vía WebDAV) — Para proxy de visualización PDF
  // ============================================
  async downloadFile(relativePath: string): Promise<Buffer> {
    const fullPath = this.buildWebdavUrl(this.basePath, relativePath);
    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'GET',
          url: fullPath,
          headers: this.getWebdavHeaders(),
          timeout: this.timeout,
          responseType: 'arraybuffer',
          validateStatus: () => true,
        }),
      );

      if (response.status !== 200) {
        throw new Error(`GET falló con status ${response.status}: ${response.statusText}`);
      }

      this.loggerService.info('NextcloudService', 'Archivo descargado para proxy', {
        path: relativePath,
        size: response.data?.byteLength || 0,
      });

      return Buffer.from(response.data);
    } catch (error) {
      const err = error as Error;
      this.loggerService.logError('NextcloudService', 'Error descargando archivo', err, { path: relativePath });
      throw new InternalServerErrorException(`No se pudo descargar: ${relativePath}`);
    }
  }

  // ============================================
  // DEBUG: Verificar configuración Nextcloud
  // ============================================
  async debugConfig(): Promise<any> {
    const whoami = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/ocs/v2.php/cloud/user`,
        {
          auth: this.getAuth(),
          headers: { ...this.getHeaders(), 'Accept': 'application/json' },
          timeout: this.timeout,
          validateStatus: () => true,
        },
      ),
    );

    const rootPropfind = `<?xml version="1.0"?>
      <d:propfind xmlns:d="DAV:"><d:prop><d:displayname/></d:prop></d:propfind>`;
    
    const rootTest = await firstValueFrom(
      this.httpService.request({
        method: 'PROPFIND',
        url: `${this.webdavUrl}/`,
        headers: {
          ...this.getWebdavHeaders('application/xml'),
          'Depth': '0',
        },
        data: rootPropfind,
        timeout: this.timeout,
        validateStatus: () => true,
      }),
    );

    const salaPlenaTest = await firstValueFrom(
      this.httpService.request({
        method: 'PROPFIND',
        url: this.buildWebdavUrl(this.basePath),
        headers: {
          ...this.getWebdavHeaders('application/xml'),
          'Depth': '0',
        },
        data: rootPropfind,
        timeout: this.timeout,
        validateStatus: () => true,
      }),
    );

    return {
      config: {
        baseUrl: this.baseUrl,
        resolvedUserId: this.userId,
        serviceUser: this.auth.username,
        webdavPath: this.webdavPath,
      },
      ocsWhoami: {
        status: whoami.status,
        userId: whoami.data?.ocs?.data?.id,
        displayName: whoami.data?.ocs?.data?.displayname,
        quota: whoami.data?.ocs?.data?.quota,
      },
      webdavRoot: {
        url: `${this.webdavUrl}/`,
        status: rootTest.status,
        statusText: rootTest.statusText,
      },
      webdavSalaPlena: {
        url: this.buildWebdavUrl(this.basePath),
        status: salaPlenaTest.status,
        statusText: salaPlenaTest.statusText,
      },
    };
  }

  // ============================================
  // HELPERS PRIVADOS
  // ============================================
  private extractPropsFromPropstat(parsed: any): any {
    const multistatus = parsed?.multistatus || parsed?.['d:multistatus'];
    const response = multistatus?.response || multistatus?.['d:response'];
    const resp = Array.isArray(response) ? response[0] : response;
    const propstat = resp?.propstat || resp?.['d:propstat'];
    const ps = Array.isArray(propstat) ? propstat[0] : propstat;
    return ps?.prop || ps?.['d:prop'] || {};
  }
}