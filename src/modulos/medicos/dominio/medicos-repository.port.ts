import { Consultorio, Especialidad, Medico } from './medicos.entities';

export const MEDICOS_REPOSITORY_PORT = 'MEDICOS_REPOSITORY_PORT';

export interface MedicosRepositoryPort {
  listarEspecialidadesActivas(): Promise<Especialidad[]>;
  buscarEspecialidadPorId(id: string): Promise<Especialidad | null>;
  listarMedicos(especialidadId?: string): Promise<Medico[]>;
  buscarMedicoPorId(id: string): Promise<Medico | null>;
  buscarConsultorioPorId(id: string): Promise<Consultorio | null>;
}
