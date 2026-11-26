import { Module } from '@nestjs/common';
import { MedicosService } from './aplicacion/medicos.service';
import { MEDICOS_REPOSITORY_PORT } from './dominio/medicos-repository.port';
import { PostgresMedicosRepository } from './infraestructura/postgres-medicos.repository';
import { MedicosController } from './presentacion/medicos.controller';

@Module({
  controllers: [MedicosController],
  providers: [
    MedicosService,
    {
      provide: MEDICOS_REPOSITORY_PORT,
      useClass: PostgresMedicosRepository,
    },
  ],
  exports: [MedicosService],
})
export class MedicosModule {}
