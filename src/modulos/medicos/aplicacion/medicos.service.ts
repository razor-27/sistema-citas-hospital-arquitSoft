import { Inject, Injectable } from '@nestjs/common';
import { RecursoNoEncontradoError } from '../../../shared/errores';
import { Consultorio, Especialidad, Medico } from '../dominio/medicos.entities';
import { MEDICOS_REPOSITORY_PORT, MedicosRepositoryPort } from '../dominio/medicos-repository.port';

@Injectable()
export class MedicosService {
  constructor(
    @Inject(MEDICOS_REPOSITORY_PORT)
    private readonly repo: MedicosRepositoryPort,
  ) {}

  listarEspecialidades(): Promise<Especialidad[]> {
    return this.repo.listarEspecialidadesActivas();
  }

  listarMedicos(especialidadId?: string): Promise<Medico[]> {
    return this.repo.listarMedicos(especialidadId);
  }

  async obtenerEspecialidad(id: string): Promise<Especialidad> {
    const esp = await this.repo.buscarEspecialidadPorId(id);
    if (!esp) {
      throw new RecursoNoEncontradoError(`Especialidad ${id} no encontrada.`);
    }
    return esp;
  }

  async obtenerMedico(id: string): Promise<Medico> {
    const med = await this.repo.buscarMedicoPorId(id);
    if (!med) {
      throw new RecursoNoEncontradoError(`Médico ${id} no encontrado.`);
    }
    return med;
  }

  async obtenerConsultorio(id: string): Promise<Consultorio> {
    const cons = await this.repo.buscarConsultorioPorId(id);
    if (!cons) {
      throw new RecursoNoEncontradoError(`Consultorio ${id} no encontrado.`);
    }
    return cons;
  }
}
