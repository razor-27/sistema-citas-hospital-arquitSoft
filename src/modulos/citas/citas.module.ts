import { Module } from '@nestjs/common';
import { CancelarCitaUseCase } from './aplicacion/cancelar-cita.use-case';
import { CheckInUseCase } from './aplicacion/check-in.use-case';
import { ConsultarCitasUseCase } from './aplicacion/consultar-citas.use-case';
import { RegistrarSobrecupoUseCase } from './aplicacion/registrar-sobrecupo.use-case';
import { ReprogramarCitaUseCase } from './aplicacion/reprogramar-cita.use-case';
import { ReservarCitaUseCase } from './aplicacion/reservar-cita.use-case';
import { CITAS_REPOSITORY_PORT, DISTRIBUTED_LOCK_PORT } from './dominio/citas.ports';
import { PoliticaReservaService } from './dominio/politica-reserva.service';
import { PostgresCitaRepository } from './infraestructura/postgres-cita.repository';
import { RedisDistributedLockAdapter } from './infraestructura/redis-distributed-lock';
import { CitaController } from './presentacion/cita.controller';
import { VentanillaCitaController } from './presentacion/ventanilla-cita.controller';

@Module({
  controllers: [CitaController, VentanillaCitaController],
  providers: [
    PoliticaReservaService,
    ReservarCitaUseCase,
    CancelarCitaUseCase,
    ReprogramarCitaUseCase,
    CheckInUseCase,
    RegistrarSobrecupoUseCase,
    ConsultarCitasUseCase,
    {
      provide: CITAS_REPOSITORY_PORT,
      useClass: PostgresCitaRepository,
    },
    {
      provide: DISTRIBUTED_LOCK_PORT,
      useClass: RedisDistributedLockAdapter,
    },
  ],
  exports: [ConsultarCitasUseCase],
})
export class CitasModule {}
