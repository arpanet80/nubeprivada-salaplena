import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

/**
 * Extensión de la interfaz Request de Express
 * para incluir el usuario autenticado (inyectado por AuthGuard)
 */
export interface RequestWithUser extends Request {
  /** Payload del JWT decodificado y validado */
  usuario: JwtPayload;
}
