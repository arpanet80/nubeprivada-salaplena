import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from '../logger/logger.service';
import { LdapAuthService } from './ldap-auth.service';
import { Role } from './enums/rol.enum';

export interface LoginDto {
  usuario: string;
  password: string;
}

export interface AuthResponse {
  ok: boolean;
  usuario: string;
  idrol: number;
  rol: string;
  accessToken: string;
  expiresIn: string;
}

export interface JwtPayloadSalaPlena {
  usuario: string;
  idrol: number;
  roles: { idrol: number; nombreRol: string }[];
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly ldapAuthService: LdapAuthService,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * Login: valida contra LDAP y genera token JWT (válido 24h).
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const result = await this.ldapAuthService.validateCredentials(
      dto.usuario,
      dto.password,
    );

    if (!result.ok) {
      throw new UnauthorizedException(result.error || 'Autenticación fallida');
    }

    const accessToken = this.generateAccessToken(
      result.usuario!,
      result.rol!,
      result.nombreRol!,
    );
    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRATION', '1d');

    this.loggerService.info('AuthService', `Login exitoso: ${result.usuario} (${result.nombreRol})`);

    return {
      ok: true,
      usuario: result.usuario!,
      idrol: result.rol!,
      rol: result.nombreRol!,
      accessToken,
      expiresIn,
    };
  }

  private generateAccessToken(usuario: string, rol: Role, nombreRol: string): string {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRATION', '1d');

    return this.jwtService.sign(
      {
        usuario,
        idrol: rol,
        roles: [{ idrol: rol, nombreRol }],
      },
      { secret, expiresIn },
    );
  }
}
