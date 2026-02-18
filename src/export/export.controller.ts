import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ExportService } from './export.service';
import { Roles } from '../common/rbac/roles.decorator';
import { Permissions } from '../common/rbac/permissions.decorator';
import { Role } from '../common/rbac/role.enum';
import { Permission } from '../common/rbac/permission.enum';

@ApiTags('export')
@ApiBearerAuth('bearer')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('orders/:id')
  @Roles(Role.EMPLEADO, Role.CLIENTE)
  @Permissions(Permission.EXPORT_READ)
  @ApiOperation({
    summary: 'Exportar orden',
    description: 'Retorna datos estructurados de una orden para exportación a PDF/Excel.',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos estructurados de la orden',
    schema: {
      example: {
        exportType: 'ORDER',
        exportDate: '2026-02-17T10:30:00.000Z',
        data: {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          orderNumber: '550E8400',
          status: 'COMPLETADO',
          customer: {
            name: 'Juan Pérez',
            email: 'cliente@example.com',
            role: 'CLIENTE',
          },
          totals: {
            subtotal: '250.00',
            discount: '0.00',
            total: '250.00',
          },
          items: [
            {
              product: {
                sku: 'ROSE-RED-001',
                name: 'Rosa Roja Premium',
                provider: 'Proveedor Flores SAS',
              },
              qty: 100,
              unitPrice: '2.50',
              lineTotal: '250.00',
            },
          ],
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  exportOrder(@Param('id') id: string) {
    return this.exportService.exportOrder(id);
  }

  @Get('consolidated-orders/:id')
  @Roles(Role.EMPLEADO, Role.PROVEEDOR)
  @Permissions(Permission.EXPORT_READ)
  @ApiOperation({
    summary: 'Exportar orden consolidada',
    description:
      'Retorna datos estructurados de una orden consolidada para exportación a PDF/Excel.',
  })
  @ApiResponse({ status: 200, description: 'Datos estructurados de la orden consolidada' })
  @ApiNotFoundResponse({ description: 'Orden consolidada no encontrada' })
  exportConsolidatedOrder(@Param('id') id: string) {
    return this.exportService.exportConsolidatedOrder(id);
  }

  @Get('reports/product-sales')
  @Roles(Role.EMPLEADO)
  @Permissions(Permission.EXPORT_READ)
  @ApiOperation({
    summary: 'Exportar reporte de ventas por producto',
    description: 'Retorna reporte de ventas y stock por producto.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte de ventas por producto',
    schema: {
      example: {
        exportType: 'PRODUCT_SALES_REPORT',
        exportDate: '2026-02-17T10:30:00.000Z',
        data: {
          products: [
            {
              sku: 'ROSE-RED-001',
              name: 'Rosa Roja Premium',
              provider: 'Proveedor Flores SAS',
              basePrice: '2.50',
              currentStock: 50,
              totalQtySold: 450,
              totalRevenue: '1125.00',
            },
          ],
          summary: {
            totalProducts: 1,
            totalRevenue: '1125.00',
          },
        },
      },
    },
  })
  exportProductSalesReport() {
    return this.exportService.exportProductSalesReport();
  }
}
