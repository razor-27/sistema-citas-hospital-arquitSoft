import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/modulos/auth/infraestructura/roles.guard';
import { OwnershipGuard } from '../../src/modulos/auth/infraestructura/ownership.guard';
import { ExecutionContext } from '@nestjs/common';

function makeContext(user: object, params: Record<string, string> = {}, handler?: object) {
  const request = { user, params };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler ?? {},
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite acceso si no hay roles requeridos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext({ rol: 'PACIENTE' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite acceso si el usuario tiene el rol requerido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'ADMISION']);
    const ctx = makeContext({ rol: 'ADMIN' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('lanza ForbiddenException si el rol no coincide (EQ-05 RBAC)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const ctx = makeContext({ rol: 'PACIENTE' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException si no hay usuario autenticado', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const ctx = makeContext({});
    // user.rol es undefined → no incluido en roles requeridos
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});

describe('OwnershipGuard (Anti-IDOR — EQ-05)', () => {
  let guard: OwnershipGuard;

  beforeEach(() => {
    guard = new OwnershipGuard();
  });

  it('permite al ADMIN acceder a cualquier recurso sin restricción', () => {
    const ctx = makeContext({ sub: 'admin-1', rol: 'ADMIN' }, { id: 'pac-otro' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite al MEDICO acceder a citas de cualquier paciente', () => {
    const ctx = makeContext({ sub: 'med-1', rol: 'MEDICO' }, { id: 'pac-otro' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite a PACIENTE acceder a su propio recurso', () => {
    const ctx = makeContext({ sub: 'pac-1', rol: 'PACIENTE' }, { id: 'pac-1' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('bloquea IDOR: PACIENTE no puede acceder al recurso de otro paciente', () => {
    const ctx = makeContext({ sub: 'pac-1', rol: 'PACIENTE' }, { id: 'pac-otro' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException si no hay usuario (token inválido)', () => {
    const ctx = makeContext(null as unknown as object, { id: 'pac-1' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
