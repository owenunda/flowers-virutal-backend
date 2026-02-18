import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Public } from '../common/rbac/public.decorator';
import { Roles } from '../common/rbac/roles.decorator';
import { Permissions } from '../common/rbac/permissions.decorator';
import { Role } from '../common/rbac/role.enum';
import { Permission } from '../common/rbac/permission.enum';

@ApiTags('products')
@ApiBearerAuth('bearer')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @Roles(Role.EMPLEADO)
  @Permissions(Permission.PRODUCT_MANAGE)
  @ApiOperation({
    summary: 'Crear producto',
    description: 'Crea un nuevo producto. Requiere rol EMPLEADO y permiso PRODUCT_MANAGE.',
  })
  @ApiResponse({
    status: 201,
    description: 'Producto creado exitosamente',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'ROSE-RED-001',
        name: 'Rosa Roja Premium',
        basePrice: '2.50',
        stock: 100,
        providerId: '660e8400-e29b-41d4-a716-446655440000',
        provider: {
          id: '660e8400-e29b-41d4-a716-446655440000',
          name: 'Proveedor Flores SAS',
          email: 'proveedor@flores.com',
        },
        pricingRules: [],
        createdAt: '2026-02-17T10:30:00.000Z',
        updatedAt: '2026-02-17T10:30:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'SKU ya existe o proveedor inválido' })
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Listar productos',
    description: 'Retorna todos los productos. Endpoint público.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos',
    schema: {
      type: 'array',
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          sku: 'ROSE-RED-001',
          name: 'Rosa Roja Premium',
          basePrice: '2.50',
          stock: 100,
          providerId: '660e8400-e29b-41d4-a716-446655440000',
          provider: {
            id: '660e8400-e29b-41d4-a716-446655440000',
            name: 'Proveedor Flores SAS',
            email: 'proveedor@flores.com',
          },
          pricingRules: [
            {
              id: '770e8400-e29b-41d4-a716-446655440000',
              productId: '550e8400-e29b-41d4-a716-446655440000',
              minQty: 50,
              percentOff: 10,
              createdAt: '2026-02-17T10:30:00.000Z',
            },
          ],
          createdAt: '2026-02-17T10:30:00.000Z',
          updatedAt: '2026-02-17T10:30:00.000Z',
        },
      ],
    },
  })
  findAll() {
    return this.products.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Obtener producto por ID',
    description: 'Retorna un producto específico. Endpoint público.',
  })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.EMPLEADO)
  @Permissions(Permission.PRODUCT_MANAGE)
  @ApiOperation({
    summary: 'Actualizar producto',
    description: 'Actualiza un producto existente. Requiere rol EMPLEADO y permiso PRODUCT_MANAGE.',
  })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  @ApiBadRequestResponse({ description: 'SKU duplicado' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.EMPLEADO)
  @Permissions(Permission.PRODUCT_MANAGE)
  @ApiOperation({
    summary: 'Eliminar producto',
    description: 'Elimina un producto. Requiere rol EMPLEADO y permiso PRODUCT_MANAGE.',
  })
  @ApiResponse({ status: 200, description: 'Producto eliminado' })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  @ApiBadRequestResponse({ description: 'Producto tiene items en órdenes' })
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
