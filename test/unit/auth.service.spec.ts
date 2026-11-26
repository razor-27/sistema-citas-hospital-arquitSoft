import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUseCase, HASH_SERVICE } from '../../src/modulos/auth/aplicacion/login.use-case';
import { RegistroUseCase } from '../../src/modulos/auth/aplicacion/registro.use-case';
import { Usuario } from '../../src/modulos/auth/dominio/usuario.entity';
import { UsuarioRepositoryPort } from '../../src/modulos/auth/dominio/usuario-repository.port';

/** Double en memoria para UsuarioRepository */
class InMemoryUsuarioRepo implements UsuarioRepositoryPort {
  private readonly store: Map<string, Usuario> = new Map();

  async buscarPorDni(dni: string): Promise<Usuario | null> {
    for (const u of this.store.values()) {
      if (u.dni === dni) return u;
    }
    return null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    return this.store.get(id) ?? null;
  }

  async guardar(usuario: Usuario): Promise<void> {
    this.store.set(usuario.id, usuario);
  }

  async existeDni(dni: string): Promise<boolean> {
    return (await this.buscarPorDni(dni)) !== null;
  }
}

/** Double de HashService */
const mockHashService = {
  hash: jest.fn(async (plain: string) => `hashed:${plain}`),
  verify: jest.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
};

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {
    sign = jest.fn(() => 'mock-jwt-token');
  },
}));

describe('Auth — LoginUseCase y RegistroUseCase', () => {
  let loginUC: LoginUseCase;
  let registroUC: RegistroUseCase;
  let repo: InMemoryUsuarioRepo;
  let jwtService: JwtService;

  beforeEach(async () => {
    repo = new InMemoryUsuarioRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        RegistroUseCase,
        { provide: 'USUARIO_REPOSITORY', useValue: repo },
        { provide: HASH_SERVICE, useValue: mockHashService },
        JwtService,
      ],
    }).compile();

    loginUC = module.get(LoginUseCase);
    registroUC = module.get(RegistroUseCase);
    jwtService = module.get(JwtService);
  });

  describe('RegistroUseCase', () => {
    it('debe registrar un usuario nuevo y retornar su id', async () => {
      const result = await registroUC.ejecutar({
        dni: '12345678',
        password: 'pass123',
        rol: 'PACIENTE',
      });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });

    it('debe lanzar ConflictException si el DNI ya existe', async () => {
      await registroUC.ejecutar({ dni: '12345678', password: 'pass123', rol: 'PACIENTE' });
      await expect(
        registroUC.ejecutar({ dni: '12345678', password: 'otrapass', rol: 'ADMISION' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('LoginUseCase', () => {
    beforeEach(async () => {
      await registroUC.ejecutar({ dni: '12345678', password: 'pass123', rol: 'PACIENTE' });
    });

    it('debe retornar token JWT con credenciales válidas', async () => {
      const result = await loginUC.ejecutar({ dni: '12345678', password: 'pass123' });
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.rol).toBe('PACIENTE');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ dni: '12345678', rol: 'PACIENTE' }),
      );
    });

    it('debe lanzar UnauthorizedException con contraseña incorrecta', async () => {
      await expect(loginUC.ejecutar({ dni: '12345678', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar UnauthorizedException si el DNI no existe', async () => {
      await expect(loginUC.ejecutar({ dni: '99999999', password: 'pass123' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Usuario.crear() — validaciones de dominio', () => {
    it('debe rechazar DNI con menos de 8 dígitos', () => {
      expect(() => Usuario.crear({ dni: '1234', passwordHash: 'h', rol: 'PACIENTE' })).toThrow(
        'El DNI debe tener exactamente 8 dígitos numéricos',
      );
    });

    it('debe rechazar DNI con letras', () => {
      expect(() => Usuario.crear({ dni: 'ABCD1234', passwordHash: 'h', rol: 'PACIENTE' })).toThrow(
        'El DNI debe tener exactamente 8 dígitos numéricos',
      );
    });

    it('debe crear usuario con datos válidos', () => {
      const u = Usuario.crear({ dni: '12345678', passwordHash: 'h', rol: 'ADMIN' });
      expect(u.id).toBeDefined();
      expect(u.tieneRol('ADMIN')).toBe(true);
      expect(u.tieneRol('PACIENTE')).toBe(false);
    });
  });
});
