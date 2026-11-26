import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginUseCase } from '../aplicacion/login.use-case';
import { RegistroUseCase } from '../aplicacion/registro.use-case';
import { LoginDto, RegistroDto, TokenResponseDto } from '../aplicacion/auth.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly loginUC: LoginUseCase,
    private readonly registroUC: RegistroUseCase,
  ) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Autenticar usuario y obtener JWT' })
  @ApiResponse({ status: 200, description: 'Token JWT válido por 1 hora' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.loginUC.ejecutar(dto);
  }

  @Post('registro')
  @HttpCode(201)
  @ApiOperation({ summary: 'Registrar nuevo usuario en el sistema' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 409, description: 'El DNI ya está registrado' })
  registro(@Body() dto: RegistroDto): Promise<{ id: string }> {
    return this.registroUC.ejecutar(dto);
  }
}
