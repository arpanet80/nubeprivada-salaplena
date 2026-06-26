import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';
import { Role } from './enums/rol.enum';
import * as ldap from 'ldapjs';

interface AllowedUser {
  usuario: string;
  rol: number;
}

interface LdapValidationResult {
  ok: boolean;
  usuario?: string;
  rol?: Role;
  nombreRol?: string;
  error?: string;
}

@Injectable()
export class LdapAuthService {
  private readonly ldapUrl: string;
  private readonly bindDn: string;
  private readonly bindPassword: string;
  private readonly baseDn: string;
  private readonly userSearchFilter: string;
  private readonly allowedUsers: AllowedUser[];

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.ldapUrl = this.configService.get<string>('LDAP_URL', 'ldap://PTSDC01.oep.net');
    this.bindDn = this.configService.get<string>('LDAP_BIND_DN', '');
    this.bindPassword = this.configService.get<string>('LDAP_BIND_PASSWORD', '');
    this.baseDn = this.configService.get<string>('LDAP_BASE_DN', 'DC=oep,DC=net');
    this.userSearchFilter = this.configService.get<string>('LDAP_USER_SEARCH_FILTER', '(sAMAccountName={{username}})');

    const allowedUsersEnv = this.configService.get<string>('ALLOWED_USERS', '[]');
    try {
      this.allowedUsers = JSON.parse(allowedUsersEnv);
    } catch (e) {
      this.loggerService.logError('LdapAuthService', 'Error parseando ALLOWED_USERS', e as Error);
      this.allowedUsers = [];
    }

    this.loggerService.info('LdapAuthService', `LDAP configurado: ${this.ldapUrl}, usuarios permitidos: ${this.allowedUsers.length}`);
  }

  /**
   * Valida credenciales contra Active Directory vía LDAP.
   * 1. Verifica que el usuario esté en ALLOWED_USERS
   * 2. Intenta bind LDAP con las credenciales del usuario
   * 3. Si el bind es exitoso, retorna el rol asignado
   */
  async validateCredentials(username: string, password: string): Promise<LdapValidationResult> {
    // 1. Verificar que el usuario esté en la lista permitida
    const allowedUser = this.allowedUsers.find(
      (u) => u.usuario.toLowerCase() === username.toLowerCase(),
    );

    if (!allowedUser) {
      this.loggerService.info('LdapAuthService', `Usuario no permitido: ${username}`);
      return { ok: false, error: 'Usuario no autorizado para este sistema' };
    }

    // 2. Intentar autenticación LDAP
    try {
      const ldapOk = await this.authenticateLdap(username, password);
      if (!ldapOk) {
        return { ok: false, error: 'Credenciales inválidas' };
      }

      const rol = allowedUser.rol as Role;
      const nombreRol = Role[rol];

      this.loggerService.info('LdapAuthService', `Autenticación exitosa: ${username} (${nombreRol})`);

      return {
        ok: true,
        usuario: username,
        rol,
        nombreRol,
      };
    } catch (error) {
      this.loggerService.logError('LdapAuthService', `Error LDAP para ${username}`, error as Error);
      return { ok: false, error: 'Error en servicio de autenticación' };
    }
  }

  /**
   * Autentica contra LDAP usando bind directo con credenciales de usuario.
   * Si el bind es exitoso, las credenciales son válidas.
   */
  private authenticateLdap(username: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const client = ldap.createClient({
        url: this.ldapUrl,
        connectTimeout: 10000,
        timeout: 10000,
      });

      // Construir DN del usuario: username@oep.net o CN=username,DC=oep,DC=net
      const userDn = `${username}@${this.extractDomainFromBaseDn()}`;

      client.bind(userDn, password, (err) => {
        client.unbind();
        if (err) {
          // Códigos comunes de error LDAP
          if (err.message?.includes('49')) {
            // Invalid credentials
            resolve(false);
          } else if (err.message?.includes('52e')) {
            // Invalid credentials (AD específico)
            resolve(false);
          } else {
            reject(new Error(`LDAP error: ${err.message}`));
          }
        } else {
          resolve(true);
        }
      });

      client.on('error', (err) => {
        reject(new Error(`LDAP connection error: ${err.message}`));
      });
    });
  }

  /**
   * Extrae el dominio del base DN (DC=oep,DC=net → oep.net)
   */
  private extractDomainFromBaseDn(): string {
    const matches = this.baseDn.match(/DC=([^,]+)/gi);
    if (!matches) return 'oep.net';
    return matches.map((m) => m.replace('DC=', '').toLowerCase()).join('.');
  }

  /**
   * Obtiene el rol de un usuario permitido.
   */
  getUserRole(username: string): { rol: Role; nombreRol: string } | null {
    const user = this.allowedUsers.find(
      (u) => u.usuario.toLowerCase() === username.toLowerCase(),
    );
    if (!user) return null;
    const rol = user.rol as Role;
    return { rol, nombreRol: Role[rol] };
  }
}
