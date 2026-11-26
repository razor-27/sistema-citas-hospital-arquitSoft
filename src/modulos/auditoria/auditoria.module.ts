import { Module } from '@nestjs/common';
import { AuditoriaController } from './presentacion/auditoria.controller';
import { AuditoriaListener, AUDITORIA_REPOSITORY } from './infraestructura/auditoria.listener';
import { PostgresAuditoriaRepository } from './infraestructura/postgres-auditoria.repository';

@Module({
  controllers: [AuditoriaController],
  providers: [
    AuditoriaListener,
    { provide: AUDITORIA_REPOSITORY, useClass: PostgresAuditoriaRepository },
  ],
  exports: [AUDITORIA_REPOSITORY],
})
export class AuditoriaModule {}
