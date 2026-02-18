import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/rbac/role.enum';

export class CreateUserDto {
  @ApiProperty({
    example: 'cliente@example.com',
    description: 'Email único del usuario',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo del usuario',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'password123',
    description: 'Contraseña (mínimo 6 caracteres)',
    minLength: 6,
  })
  @MinLength(6)
  password!: string;

  @ApiProperty({
    enum: Role,
    example: Role.CLIENTE,
    description: 'Rol del usuario: CLIENTE, EMPLEADO o PROVEEDOR',
  })
  @IsEnum(Role)
  role!: Role;
}
