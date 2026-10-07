import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResendCodeDto } from './dto/resend-code.dto';

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

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar el código OTP enviado al correo' })
  @ApiResponse({ status: 200, description: 'Código verificado con éxito.' })
  @ApiResponse({ status: 400, description: 'Código inválido o expirado.' })
  verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.authService.verifyCode(verifyCodeDto.email, verifyCodeDto.code);
  }

  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar código de verificación por correo' })
  @ApiResponse({ status: 200, description: 'Nuevo código enviado exitosamente.' })
  resendCode(@Body() resendCodeDto: ResendCodeDto) {
    return this.authService.resendCode(resendCodeDto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con Email y Contraseña' })
  @ApiResponse({ status: 200, description: 'Login exitoso, retorna Token y datos de usuario.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o correo no verificado.' })
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