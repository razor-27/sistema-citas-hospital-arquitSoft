import { Usuario } from './usuario.entity';

export abstract class UsuarioRepositoryPort {
  abstract buscarPorDni(dni: string): Promise<Usuario | null>;
  abstract buscarPorId(id: string): Promise<Usuario | null>;
  abstract guardar(usuario: Usuario): Promise<void>;
  abstract existeDni(dni: string): Promise<boolean>;
}
