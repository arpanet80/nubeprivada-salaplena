import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../interfaces/user-request.interface';

/**
 * Decorador para extraer el usuario autenticado del request.
 * Inyecta el payload del JWT directamente en el parámetro del controller.
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) {
 *   return user.usuario;
 * }
 *
 * @example
 * @Get('mis-datos')
 * getMisDatos(@CurrentUser('idfuncionario') userId: number) {
 *   return this.service.findByUserId(userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof import('../interfaces/jwt-payload.interface').JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.usuario;

    // Si se especifica una propiedad, retornar solo esa
    // Si no, retornar el objeto completo
    return data ? user?.[data] : user;
  },
);
