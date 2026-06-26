import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Guard de autenticación.
 * Valida el JWT token emitido por ESTE backend (Sala Plena).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado. Inicie sesión.');
    }

    try {
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');

      if (!secret || secret.trim() === '') {
        throw new Error('JWT_ACCESS_SECRET no está configurado');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
        clockTolerance: 30,
      });

      // Validar estructura del payload (usuario + idrol + roles)
      if (!payload.usuario || !payload.idrol || !Array.isArray(payload.roles)) {
        throw new UnauthorizedException('Token con estructura inválida');
      }

      request['usuario'] = payload;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new UnauthorizedException('Token expirado. Inicie sesión nuevamente.');
        }
        if (error.name === 'JsonWebTokenError') {
          throw new UnauthorizedException('Token inválido.');
        }
      }
      throw new UnauthorizedException('Acceso denegado. Token no válido.');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) return undefined;

    return token;
  }
}
