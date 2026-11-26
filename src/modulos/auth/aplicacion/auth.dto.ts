import { IsEmail, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '../dominio/usuario.entity';

export class LoginDto {
  @ApiProperty({ example: '12345678', description: 'DNI del usuario (8 dígitos)' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos numéricos' })
  dni!: string;

  @ApiProperty({ example: 'contraseña123', description: 'Contraseña del usuario' })
  @IsString()
  @Length(6, 100)
  password!: string;
}

export class RegistroDto {
  @ApiProperty({ example: '12345678' })
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener exactamente 8 dígitos numéricos' })
  dni!: string;

  @ApiPropertyOptional({ example: 'usuario@hospital.gob.pe' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'contraseña123' })
  @IsString()
  @Length(6, 100)
  password!: string;

  @ApiProperty({ enum: ['PACIENTE', 'ADMISION', 'MEDICO', 'ADMIN'] })
  @IsEnum(['PACIENTE', 'ADMISION', 'MEDICO', 'ADMIN'])
  rol!: Rol;
}

export interface TokenResponseDto {
  accessToken: string;
  expiresIn: number;
  rol: Rol;
  usuarioId: string;
}
