import { Controller, Get, Post, Body, Param, Delete, Patch, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddItemDto } from './dto/add-item.dto';
import { Roles } from '../common/rbac/roles.decorator';
import { Permissions } from '../common/rbac/permissions.decorator';
import { Role } from '../common/rbac/role.enum';
import { Permission } from '../common/rbac/permission.enum';

@ApiTags('orders')
@ApiBearerAuth('bearer')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @Roles(Role.EMPLEADO, Role.CLIENTE)
  @Permissions(Permission.ORDER_CREATE)
  @ApiOperation({
    summary: 'Crear orden en borrador',
    description: 'Crea una nueva orden en estado BORRADOR. Accesible por CLIENTE y EMPLEADO.',
  })
  @ApiResponse({ status: 201, description: 'Orden creada' })
  @ApiBadRequestResponse({ description: 'Cliente inválido' })
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @Get()
  @Roles(Role.EMPLEADO, Role.CLIENTE)
  @ApiOperation({
    summary: 'Listar órdenes',
    description: 'Retorna todas las órdenes (EMPLEADO) o solo las propias (CLIENTE).',
  })
  @ApiResponse({ status: 200, description: 'Lista de órdenes' })
  findAll(@Request() req: any) {
    const user = req.user;
    // Si es CLIENTE, filtrar solo sus órdenes
    const customerId = user.role === 'CLIENTE' ? user.sub : undefined;
    return this.orders.findAll(customerId);
  }

  @Get(':id')
  @Roles(Role.EMPLEADO, Role.CLIENTE)
  @ApiOperation({ summary: 'Obtener orden por ID' })
  @ApiResponse({ status: 200, description: 'Orden encontrada' })
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }

  @Post(':id/items')
  @Roles(Role.EMPLEADO, Role.CLIENTE)
  @Permissions(Permission.ORDER_CREATE)
  @ApiOperation({
    summary: 'Agregar item a orden',
    description: 'Agrega o actualiza un producto en la orden (solo en estado BORRADOR).',
  })
  @ApiResponse({ status: 200, description: 'Item agregado y totales recalculados' })
  @ApiBadRequestResponse({ description: 'Orden no está en borrador o producto inválido' })
  addItem(@Param('id') orderId: string, @Body() dto: AddItemDto) {
    return this.orders.addItem(orderId, dto);
  }

  @Delete(':id/items/:productId')
  @Roles(Role.EMPLEADO, Role.CLIENTE)
  @Permissions(Permission.ORDER_CREATE)
  @ApiOperation({
    summary: 'Eliminar item de orden',
    description: 'Elimina un producto de la orden (solo en estado BORRADOR).',
  })
  @ApiResponse({ status: 200, description: 'Item eliminado y totales recalculados' })
  @ApiBadRequestResponse({ description: 'Orden no está en borrador' })
  removeItem(@Param('id') orderId: string, @Param('productId') productId: string) {
    return this.orders.removeItem(orderId, productId);
  }

  @Patch(':id/submit')
  @Roles(Role.CLIENTE, Role.EMPLEADO)
  @Permissions(Permission.ORDER_SUBMIT)
  @ApiOperation({
    summary: 'Enviar orden para validación',
    description: 'Cambia el estado de BORRADOR a PENDIENTE_VALIDACION.',
  })
  @ApiResponse({ status: 200, description: 'Orden enviada para validación' })
  @ApiBadRequestResponse({ description: 'Orden no está en borrador o está vacía' })
  submit(@Param('id') orderId: string, @Request() req: any) {
    return this.orders.submit(orderId, req.user);
  }

  @Patch(':id/decline')
  @Roles(Role.EMPLEADO)
  @Permissions(Permission.ORDER_DECLINE)
  @ApiOperation({
    summary: 'Rechazar orden definitivamente',
    description: 'Cambia el estado de PENDIENTE_VALIDACION a RECHAZADO. Solo EMPLEADO.',
  })
  @ApiResponse({ status: 200, description: 'Orden rechazada definitivamente' })
  @ApiBadRequestResponse({ description: 'Orden no está pendiente de validación' })
  decline(@Param('id') orderId: string) {
    return this.orders.decline(orderId);
  }

  @Patch(':id/approve')
  @Roles(Role.EMPLEADO)
  @Permissions(Permission.ORDER_APPROVE)
  @ApiOperation({
    summary: 'Aprobar orden',
    description: 'Cambia el estado de PENDIENTE_VALIDACION a VALIDADO. Solo EMPLEADO.',
  })
  @ApiResponse({ status: 200, description: 'Orden aprobada' })
  @ApiBadRequestResponse({ description: 'Orden no está pendiente de validación' })
  approve(@Param('id') orderId: string) {
    return this.orders.approve(orderId);
  }

  @Patch(':id/reject')
  @Roles(Role.EMPLEADO)
  @Permissions(Permission.ORDER_APPROVE)
  @ApiOperation({
    summary: 'Rechazar orden',
    description: 'Cambia el estado de PENDIENTE_VALIDACION a BORRADOR. Solo EMPLEADO.',
  })
  @ApiResponse({ status: 200, description: 'Orden rechazada' })
  @ApiBadRequestResponse({ description: 'Orden no está pendiente de validación' })
  reject(@Param('id') orderId: string) {
    return this.orders.reject(orderId);
  }

  @Patch(':id/complete')
  @Roles(Role.EMPLEADO)
  @Permissions(Permission.ORDER_COMPLETE)
  @ApiOperation({
    summary: 'Completar orden',
    description:
      'Cambia el estado de VALIDADO a COMPLETADO y descuenta stock. Solo EMPLEADO.',
  })
  @ApiResponse({ status: 200, description: 'Orden completada y stock descontado' })
  @ApiBadRequestResponse({ description: 'Orden no validada o stock insuficiente' })
  complete(@Param('id') orderId: string) {
    return this.orders.complete(orderId);
  }

  @Delete(':id')
  @Roles(Role.EMPLEADO, Role.CLIENTE)
  @Permissions(Permission.ORDER_DELETE)
  @ApiOperation({
    summary: 'Eliminar orden',
    description: 'Elimina una orden existente por ID.',
  })
  @ApiResponse({ status: 200, description: 'Orden eliminada exitosamente' })
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  remove(@Param('id') id: string) {
    return this.orders.remove(id);
  }
}

