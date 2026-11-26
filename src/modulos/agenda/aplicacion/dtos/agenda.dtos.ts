import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';
import { TurnoDia } from '../../dominio/estado-slot.vo';

export class ConsultarDisponibilidadDto {
  @ApiProperty({ description: 'UUID de la especialidad médica' })
  @IsUUID()
  especialidadId!: string;

  @ApiProperty({ example: '2026-12-01', description: 'Fecha en formato YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha!: string;

  @ApiPropertyOptional({ description: 'UUID del médico especialista' })
  @IsOptional()
  @IsUUID()
  medicoId?: string;

  @ApiPropertyOptional({ enum: TurnoDia, description: 'Turno de atención' })
  @IsOptional()
  @IsEnum(TurnoDia)
  turno?: TurnoDia;

  @ApiPropertyOptional({ example: 'HUAMANGA-CENTRAL' })
  @IsOptional()
  @IsString()
  sedeId?: string;
}

export class CrearOfertaMedicaDto {
  @ApiProperty()
  @IsUUID()
  medicoId!: string;

  @ApiProperty()
  @IsUUID()
  especialidadId!: string;

  @ApiProperty()
  @IsUUID()
  consultorioId!: string;

  @ApiPropertyOptional({ example: 'HUAMANGA-CENTRAL' })
  @IsOptional()
  @IsString()
  sedeId?: string;

  @ApiProperty({ example: '2026-12-01' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha!: string;

  @ApiProperty({ example: '08:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'horaInicio debe tener formato HH:mm' })
  horaInicio!: string;

  @ApiProperty({ example: '12:00' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'horaFin debe tener formato HH:mm' })
  horaFin!: string;

  @ApiProperty({ enum: [15, 20, 30], example: 20 })
  @IsIn([15, 20, 30])
  duracionMin!: number;

  @ApiProperty({ example: '2026-11-28T07:00:00.000Z' })
  @IsDateString()
  fechaApertura!: string;
}

export class BloquearSlotsDto {
  @ApiProperty()
  @IsUUID()
  medicoId!: string;

  @ApiProperty({ example: '2026-12-01' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha!: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  horaDesde?: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  horaHasta?: string;

  @ApiProperty({ example: 'Descanso médico autorizado' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  motivo!: string;
}
