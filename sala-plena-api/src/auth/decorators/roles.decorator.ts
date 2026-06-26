import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/rol.enum';

/** Key usada por el Reflector para obtener los roles requeridos */
export const ROLES_KEY = 'roles';

/**
 * Decorador para especificar qué roles tienen acceso a un endpoint.
 * @example
 * @Roles(Role.Admin, Role.Usuario)
 * @Get('votantes')
 * findAll() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
