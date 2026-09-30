import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';

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
}
