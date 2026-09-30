import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

@ApiTags('Auth (Autenticación)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Sincronizar o registrar un usuario tras el login en Firebase' })
  @ApiResponse({ status: 200, description: 'Usuario sincronizado correctamente.' })
  syncUser(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.syncUser(registerUserDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario con Email y Contraseña' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente.' })
  @ApiResponse({ status: 400, description: 'El correo electrónico ya existe o datos inválidos.' })
  register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con Email y Contraseña' })
  @ApiResponse({ status: 200, description: 'Login exitoso, retorna Token y datos de usuario.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión o registrarse mediante Google / Gmail' })
  @ApiResponse({ status: 200, description: 'Autenticación con Google exitosa.' })
  googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.googleLogin(googleLoginDto);
  }
}
