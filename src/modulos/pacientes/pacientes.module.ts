import { Module } from '@nestjs/common';
import {
  ValidarIdentidadUseCase,
  IDENTIDAD_PORT,
  ASEGURAMIENTO_PORT,
} from './aplicacion/validar-identidad.use-case';
import { PacientesController } from './presentacion/pacientes.controller';
import { ReniecAdapter } from './infraestructura/reniec.adapter';
import { SisResilientAdapter } from './infraestructura/sis-resilient.adapter';

@Module({
  controllers: [PacientesController],
  providers: [
    ValidarIdentidadUseCase,
    { provide: IDENTIDAD_PORT, useClass: ReniecAdapter },
    { provide: ASEGURAMIENTO_PORT, useClass: SisResilientAdapter },
  ],
})
export class PacientesModule {}
