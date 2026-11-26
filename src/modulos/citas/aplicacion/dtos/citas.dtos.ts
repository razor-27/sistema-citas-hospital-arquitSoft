import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';
import { Cita } from '../../dominio/cita.entity';
import { EstadoCita } from '../../dominio/estado-cita.vo';

export class ReservarCitaDto {
  @ApiProperty({ description: 'UUID del cupo (slot) a reservar' })
  @IsUUID()
  slotId!: string;

  @ApiProperty({ description: 'UUID del paciente' })
  @IsUUID()
  pacienteId!: string;
}

export class CancelarCitaDto {
  @ApiProperty({ example: 'No podré asistir por viaje' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  motivo!: string;
}

export class ReprogramarCitaDto {
  @ApiProperty({ description: 'UUID del nuevo cupo (slot) disponible' })
  @IsUUID()
  nuevoSlotId!: string;
}

export class RegistrarSobrecupoDto {
  @ApiProperty()
  @IsUUID()
  slotId!: string;

  @ApiProperty()
  @IsUUID()
  pacienteId!: string;

  @ApiProperty({ example: 'Emergencia referida por jefatura de guardia' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  motivoSobrecupo!: string;
}

export enum AccionEstadoClinico {
  ATENDIDA = 'ATENDIDA',
  NO_ASISTIO = 'NO_ASISTIO',
}

export class ActualizarEstadoClinicoDto {
  @ApiProperty({ enum: AccionEstadoClinico })
  @IsEnum(AccionEstadoClinico)
  accion!: AccionEstadoClinico;
}

export class ConsultarAgendaMedicaQueryDto {
  @ApiProperty()
  @IsUUID()
  medicoId!: string;

  @ApiProperty({ example: '2026-12-01' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha!: string;
}

export class CitaQueryOpcionalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  pacienteId?: string;
}

export interface CitaResponseDto {
  readonly id: string;
  readonly codigoReserva: string;
  readonly pacienteId: string;
  readonly slotId: string;
  readonly medicoId: string;
  readonly especialidadId: string;
  readonly fechaHoraInicio: string;
  readonly estado: EstadoCita;
  readonly esSobrecupo: boolean;
  readonly motivoSobrecupo: string | null;
}

export function toCitaResponse(cita: Cita): CitaResponseDto {
  return {
    id: cita.id,
    codigoReserva: cita.codigoReserva.valor,
    pacienteId: cita.pacienteId,
    slotId: cita.slotId,
    medicoId: cita.medicoId,
    especialidadId: cita.especialidadId,
    fechaHoraInicio: cita.fechaHoraInicio.toISOString(),
    estado: cita.estado,
    esSobrecupo: cita.esSobrecupo,
    motivoSobrecupo: cita.motivoSobrecupo,
  };
}
