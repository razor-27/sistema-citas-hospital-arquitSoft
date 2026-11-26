import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

export interface RequestWithUser {
  user: { sub: string; rol: string };
  params: Record<string, string>;
}

/**
 * OwnershipGuard — Anti-IDOR: valida que el recurso pertenece al usuario autenticado.
 * Los roles ADMIN y ADMISION pueden acceder a cualquier recurso.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, params } = request;

    if (!user) {
      throw new ForbiddenException('Acceso denegado');
    }

    // Admin y personal de admisión tienen acceso sin restricción de ownership
    if (user.rol === 'ADMIN' || user.rol === 'ADMISION' || user.rol === 'MEDICO') {
      return true;
    }

    const pacienteIdParam = params['pacienteId'] ?? params['id'];
    if (pacienteIdParam && pacienteIdParam !== user.sub) {
      throw new ForbiddenException('No puede acceder a recursos de otro paciente');
    }

    return true;
  }
}
