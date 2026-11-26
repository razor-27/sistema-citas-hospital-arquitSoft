export type Rol = 'PACIENTE' | 'ADMISION' | 'MEDICO' | 'ADMIN';

export interface UsuarioProps {
  id: string;
  dni: string;
  email?: string;
  passwordHash: string;
  rol: Rol;
  activo: boolean;
  creadoEn: Date;
}

export class Usuario {
  readonly id: string;
  readonly dni: string;
  readonly email?: string;
  readonly passwordHash: string;
  readonly rol: Rol;
  readonly activo: boolean;
  readonly creadoEn: Date;

  constructor(props: UsuarioProps) {
    this.id = props.id;
    this.dni = props.dni;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.rol = props.rol;
    this.activo = props.activo;
    this.creadoEn = props.creadoEn;
  }

  static crear(params: { dni: string; email?: string; passwordHash: string; rol: Rol }): Usuario {
    if (!/^\d{8}$/.test(params.dni)) {
      throw new Error('El DNI debe tener exactamente 8 dígitos numéricos');
    }
    return new Usuario({
      id: crypto.randomUUID(),
      dni: params.dni,
      email: params.email,
      passwordHash: params.passwordHash,
      rol: params.rol,
      activo: true,
      creadoEn: new Date(),
    });
  }

  tieneRol(...roles: Rol[]): boolean {
    return roles.includes(this.rol);
  }
}
