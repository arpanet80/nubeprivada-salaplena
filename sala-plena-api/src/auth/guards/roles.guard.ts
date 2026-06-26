import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/rol.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Guard de autorización basado en roles.
 * Verifica que el usuario autenticado tenga al menos uno de los roles requeridos.
 * Los roles vienen en el payload del JWT (campo 'roles' que contiene PermisoUsuario[])
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener los roles requeridos del decorador @Roles() o @Auth()
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtener el usuario del request (inyectado por AuthGuard)
    const request = context.switchToHttp().getRequest();
    const usuario: JwtPayload = request.usuario;

    // Validar que el usuario exista (AuthGuard ya debería haberlo validado)
    if (!usuario) {
      throw new UnauthorizedException('Usuario no autenticado. Ejecute AuthGuard primero.');
    }

    // Extraer los IDs de roles del payload
    // El payload tiene 'roles' que es un array de PermisoUsuario con 'idrol'
    const userRoleIds: number[] = Array.isArray(usuario.roles)
      ? usuario.roles.map((permiso) => permiso.idrol)
      : [];

    // Si el usuario no tiene roles, denegar acceso
    if (userRoleIds.length === 0) {
      throw new UnauthorizedException('El usuario no tiene roles asignados');
    }

    // Verificar si alguno de los roles del usuario coincide con los requeridos
    const hasRole = requiredRoles.some((requiredRole) =>
      userRoleIds.includes(requiredRole),
    );

    if (!hasRole) {
      throw new UnauthorizedException(
        `No tiene permisos para esta operación. Roles requeridos: ${requiredRoles.map((r) => Role[r]).join(', ')}`,
      );
    }

    return true;
  }
}
