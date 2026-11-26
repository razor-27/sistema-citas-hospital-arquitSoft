import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { UsuarioRepositoryPort } from '../dominio/usuario-repository.port';
import { Usuario } from '../dominio/usuario.entity';
import { HashServicePort, HASH_SERVICE } from './login.use-case';
import { RegistroDto } from './auth.dto';

@Injectable()
export class RegistroUseCase {
  constructor(
    @Inject('USUARIO_REPOSITORY')
    private readonly usuarioRepo: UsuarioRepositoryPort,
    @Inject(HASH_SERVICE)
    private readonly hashService: HashServicePort,
  ) {}

  async ejecutar(dto: RegistroDto): Promise<{ id: string }> {
    const existe = await this.usuarioRepo.existeDni(dto.dni);
    if (existe) {
      throw new ConflictException(`Ya existe un usuario registrado con DNI ${dto.dni}`);
    }

    const passwordHash = await this.hashService.hash(dto.password);
    const usuario = Usuario.crear({
      dni: dto.dni,
      email: dto.email,
      passwordHash,
      rol: dto.rol,
    });

    await this.usuarioRepo.guardar(usuario);
    return { id: usuario.id };
  }
}
