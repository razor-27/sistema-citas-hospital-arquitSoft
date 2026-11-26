import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsuarioRepositoryPort } from '../dominio/usuario-repository.port';
import { LoginDto, TokenResponseDto } from './auth.dto';

export const HASH_SERVICE = 'HASH_SERVICE';

export interface HashServicePort {
  verify(plain: string, hash: string): Promise<boolean>;
  hash(plain: string): Promise<string>;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('USUARIO_REPOSITORY')
    private readonly usuarioRepo: UsuarioRepositoryPort,
    private readonly jwtService: JwtService,
    @Inject(HASH_SERVICE)
    private readonly hashService: HashServicePort,
  ) {}

  async ejecutar(dto: LoginDto): Promise<TokenResponseDto> {
    const usuario = await this.usuarioRepo.buscarPorDni(dto.dni);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valido = await this.hashService.verify(dto.password, usuario.passwordHash);
    if (!valido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: usuario.id, dni: usuario.dni, rol: usuario.rol };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      expiresIn: 3600,
      rol: usuario.rol,
      usuarioId: usuario.id,
    };
  }
}
