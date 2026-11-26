import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LoginUseCase, HASH_SERVICE } from './aplicacion/login.use-case';
import { RegistroUseCase } from './aplicacion/registro.use-case';
import { AuthController } from './presentacion/auth.controller';
import { JwtAuthGuard } from './infraestructura/jwt-auth.guard';
import { JwtStrategy } from './infraestructura/jwt.strategy';
import { RolesGuard } from './infraestructura/roles.guard';
import { OwnershipGuard } from './infraestructura/ownership.guard';
import { PostgresUsuarioRepository } from './infraestructura/postgres-usuario.repository';
import { Argon2HashService } from './infraestructura/argon2-hash.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RegistroUseCase,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    OwnershipGuard,
    { provide: 'USUARIO_REPOSITORY', useClass: PostgresUsuarioRepository },
    { provide: HASH_SERVICE, useClass: Argon2HashService },
  ],
  exports: [JwtAuthGuard, RolesGuard, OwnershipGuard, JwtModule, PassportModule],
})
export class AuthModule {}
