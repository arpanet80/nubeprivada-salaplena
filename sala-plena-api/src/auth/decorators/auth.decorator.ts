import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '../enums/rol.enum';
import { Roles } from './roles.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';

/**
 * Decorador compuesto que aplica:
 * - @ApiBearerAuth() para Swagger
 * - @Roles() para definir roles permitidos
 * - @UseGuards(AuthGuard, RolesGuard) para protección
 *
 * @param roles - Roles requeridos para acceder al endpoint
 * @returns Decorador compuesto
 *
 * @example
 * @Auth(Role.Admin)
 * @Post()
 * create(@Body() dto: CreateVotanteDto) { ... }
 *
 * @example
 * @Auth(Role.Admin, Role.Usuario) // Múltiples roles
 * @Get()
 * findAll() { ... }
 */
export function Auth(...roles: Role[]) {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    Roles(...roles),
    UseGuards(AuthGuard, RolesGuard),
  );
}
