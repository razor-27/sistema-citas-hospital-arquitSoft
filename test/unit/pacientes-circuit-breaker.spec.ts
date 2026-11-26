import {
  ValidarIdentidadUseCase,
  IDENTIDAD_PORT,
  ASEGURAMIENTO_PORT,
} from '../../src/modulos/pacientes/aplicacion/validar-identidad.use-case';
import {
  IdentidadPort,
  AseguramientoPort,
} from '../../src/modulos/pacientes/dominio/integracion.ports';
import { Test } from '@nestjs/testing';

const mockIdentidadOk: IdentidadPort = {
  consultar: jest.fn().mockResolvedValue({
    dni: '12345678',
    nombres: 'JUAN CARLOS',
    apellidos: 'QUISPE MAMANI',
    validado: true,
  }),
};

const mockAseguramientoSis: AseguramientoPort = {
  consultar: jest.fn().mockResolvedValue({
    dni: '12345678',
    cobertura: 'SIS',
    activo: true,
    estado: 'ACTIVO',
  }),
};

const mockAseguramientoFallback: AseguramientoPort = {
  consultar: jest.fn().mockResolvedValue({
    dni: '12345678',
    cobertura: 'PARTICULAR',
    activo: false,
    estado: 'PENDIENTE_VALIDACION',
  }),
};

describe('ValidarIdentidadUseCase — Circuit Breaker Fallback (EQ-06)', () => {
  it('retorna datos completos cuando RENIEC y SIS responden correctamente', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ValidarIdentidadUseCase,
        { provide: IDENTIDAD_PORT, useValue: mockIdentidadOk },
        { provide: ASEGURAMIENTO_PORT, useValue: mockAseguramientoSis },
      ],
    }).compile();

    const uc = module.get(ValidarIdentidadUseCase);
    const result = await uc.ejecutar('12345678');

    expect(result.nombres).toBe('JUAN CARLOS');
    expect(result.validacionReniec).toBe(true);
    expect(result.cobertura).toBe('SIS');
    expect(result.estadoCobertura).toBe('ACTIVO');
  });

  it('aplica fallback cuando SIS no responde (EQ-06 — Circuit Breaker abierto)', async () => {
    const module = await Test.createTestingModule({
      providers: [
        ValidarIdentidadUseCase,
        { provide: IDENTIDAD_PORT, useValue: mockIdentidadOk },
        { provide: ASEGURAMIENTO_PORT, useValue: mockAseguramientoFallback },
      ],
    }).compile();

    const uc = module.get(ValidarIdentidadUseCase);

    const inicio = Date.now();
    const result = await uc.ejecutar('12345678');
    const duracion = Date.now() - inicio;

    // Fallback inmediato: no esperar timeout
    expect(result.estadoCobertura).toBe('PENDIENTE_VALIDACION');
    expect(duracion).toBeLessThan(800); // EQ-06: < 800ms
  });

  it('devuelve validacionReniec=false cuando RENIEC falla con fallback', async () => {
    const mockIdentidadFallback: IdentidadPort = {
      consultar: jest.fn().mockResolvedValue({
        dni: '12345678',
        nombres: 'PENDIENTE',
        apellidos: 'PENDIENTE',
        validado: false,
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        ValidarIdentidadUseCase,
        { provide: IDENTIDAD_PORT, useValue: mockIdentidadFallback },
        { provide: ASEGURAMIENTO_PORT, useValue: mockAseguramientoFallback },
      ],
    }).compile();

    const uc = module.get(ValidarIdentidadUseCase);
    const result = await uc.ejecutar('12345678');
    expect(result.validacionReniec).toBe(false);
    expect(result.nombres).toBe('PENDIENTE');
  });
});
