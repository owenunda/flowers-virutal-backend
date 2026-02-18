import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../common/rbac/roles.decorator';
import { Role } from '../common/rbac/role.enum';
import { Permissions } from '../common/rbac/permissions.decorator';
import { Permission } from '../common/rbac/permission.enum';
import { Public } from '../common/rbac/public.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Public() // TEMPORAL: Endpoint público para crear primer usuario
  // @Roles(Role.EMPLEADO) // TODO: Descomentar cuando exista al menos un usuario EMPLEADO
  // @Permissions(Permission.USER_CREATE)
  @ApiOperation({
    summary: 'Create user (TEMPORAL: Public)',
    description:
      '⚠️ TEMPORAL: Endpoint público para crear el primer usuario del sistema. En producción debe requerir rol EMPLEADO y permiso USER_CREATE.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'cliente@example.com',
        name: 'Juan Pérez',
        role: 'CLIENTE',
        isActive: true,
        createdAt: '2026-02-17T10:30:00.000Z',
        updatedAt: '2026-02-17T10:30:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Email ya existe o datos de entrada inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: 'Email already exists',
        error: 'Bad Request',
      },
    },
  })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  @Roles(Role.EMPLEADO)
  @ApiOperation({
    summary: 'List users',
    description: 'Retrieve a list of users, optionally filtered by role.',
  })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(@Query('role') role?: Role) {
    return this.users.findAll(role);
  }
}
