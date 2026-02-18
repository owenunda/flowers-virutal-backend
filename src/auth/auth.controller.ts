import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/rbac/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login and get JWT access token',
    description:
      'Autentica un usuario y retorna un token JWT. El token debe incluirse en requests subsiguientes como Bearer token.',
  })
  @ApiResponse({
    status: 201,
    description: 'Login exitoso, retorna access token',
    schema: {
      example: {
        accessToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6IkNMSUVOVEUiLCJpYXQiOjE2MTYyMzkwMjJ9...',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales inválidas o usuario inactivo',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
