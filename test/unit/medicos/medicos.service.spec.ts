import { MedicosService } from '../../../src/modulos/medicos/aplicacion/medicos.service';
import { MedicosRepositoryPort } from '../../../src/modulos/medicos/dominio/medicos-repository.port';
import { MedicosController } from '../../../src/modulos/medicos/presentacion/medicos.controller';
import { RecursoNoEncontradoError } from '../../../src/shared/errores';

describe('MedicosService y MedicosController', () => {
  const mockRepo: MedicosRepositoryPort = {
    listarEspecialidadesActivas: jest
      .fn()
      .mockResolvedValue([
        { id: 'esp-1', codigo: 'CARD', nombre: 'Cardiología', maxSobrecuposDia: 2, activo: true },
      ]),
    buscarEspecialidadPorId: jest.fn().mockResolvedValue(null),
    listarMedicos: jest.fn().mockResolvedValue([
      {
        id: 'med-1',
        cmp: '054321',
        nombres: 'Ana',
        apellidos: 'Quispe',
        especialidadId: 'esp-1',
        activo: true,
      },
    ]),
    buscarMedicoPorId: jest.fn().mockResolvedValue(null),
    buscarConsultorioPorId: jest.fn().mockResolvedValue(null),
  };

  it('debe listar especialidades y médicos mediante el controlador', async () => {
    const service = new MedicosService(mockRepo);
    const controller = new MedicosController(service);

    const especialidades = await controller.listarEspecialidades();
    const medicos = await controller.listarMedicos('esp-1');

    expect(especialidades).toHaveLength(1);
    expect(medicos).toHaveLength(1);
  });

  it('debe lanzar RecursoNoEncontradoError si no existe especialidad, médico o consultorio', async () => {
    const service = new MedicosService(mockRepo);

    await expect(service.obtenerEspecialidad('x')).rejects.toThrow(RecursoNoEncontradoError);
    await expect(service.obtenerMedico('x')).rejects.toThrow(RecursoNoEncontradoError);
    await expect(service.obtenerConsultorio('x')).rejects.toThrow(RecursoNoEncontradoError);
  });
});
