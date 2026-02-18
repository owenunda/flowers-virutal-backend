import { Controller, Post, Get, Param, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ConsolidationService } from './consolidation.service';
import { Roles } from '../common/rbac/roles.decorator';
import { Permissions } from '../common/rbac/permissions.decorator';
import { Role } from '../common/rbac/role.enum';
import { Permission } from '../common/rbac/permission.enum';

@ApiTags('consolidation')
@ApiBearerAuth('bearer')
@Controller('consolidation')
export class ConsolidationController {
  constructor(private readonly consolidation: ConsolidationService) {}

  @Post('run')
  @Roles(Role.EMPLEADO)
  @Permissions(Permission.CONSOLIDATE_CREATE)
  @ApiOperation({
    summary: 'Ejecutar consolidación',
    description:
      'Consolida todas las órdenes VALIDADAS agrupándolas por proveedor. Solo EMPLEADO.',
  })
  @ApiResponse({
    status: 201,
    description: 'Consolidación ejecutada exitosamente',
    schema: {
      example: {
        consolidatedOrders: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            providerId: '660e8400-e29b-41d4-a716-446655440000',
            provider: {
              id: '660e8400-e29b-41d4-a716-446655440000',
              name: 'Proveedor Flores SAS',
              email: 'proveedor@flores.com',
            },
            items: [
              {
                id: '770e8400-e29b-41d4-a716-446655440000',
                productId: '880e8400-e29b-41d4-a716-446655440000',
                totalQty: 150,
                unitPrice: '2.25',
                lineTotal: '337.50',
                product: {
                  id: '880e8400-e29b-41d4-a716-446655440000',
                  sku: 'ROSE-RED-001',
                  name: 'Rosa Roja Premium',
                },
              },
            ],
            createdAt: '2026-02-17T10:30:00.000Z',
          },
        ],
        ordersProcessed: 5,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'No hay órdenes validadas para consolidar' })
  run() {
    return this.consolidation.consolidateValidatedOrders();
  }

  @Get()
  @Roles(Role.EMPLEADO, Role.PROVEEDOR)
  @Permissions(Permission.CONSOLIDATE_READ_OWN)
  @ApiOperation({
    summary: 'Listar órdenes consolidadas',
    description: 'Retorna todas las consolidaciones (EMPLEADO) o solo las propias (PROVEEDOR).',
  })
  @ApiResponse({ status: 200, description: 'Lista de órdenes consolidadas' })
  findAll(@Request() req: any) {
    const user = req.user;
    // Si es PROVEEDOR, filtrar solo sus consolidaciones
    const providerId = user.role === 'PROVEEDOR' ? user.sub : undefined;
    return this.consolidation.findAll(providerId);
  }

  @Get(':id')
  @Roles(Role.EMPLEADO, Role.PROVEEDOR)
  @Permissions(Permission.CONSOLIDATE_READ_OWN)
  @ApiOperation({ summary: 'Obtener consolidación por ID' })
  @ApiResponse({ status: 200, description: 'Consolidación encontrada' })
  @ApiBadRequestResponse({ description: 'Consolidación no encontrada' })
  findOne(@Param('id') id: string) {
    return this.consolidation.findOne(id);
  }
}
