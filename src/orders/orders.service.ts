import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddItemDto } from './dto/add-item.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateOrderDto) {
    // Verificar que el cliente existe y tiene rol CLIENTE
    const customer = await this.prisma.user.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer || customer.role !== 'CLIENTE') {
      throw new BadRequestException('Customer not found or invalid role');
    }

    return this.prisma.order.create({
      data: {
        customerId: dto.customerId,
        status: OrderStatus.BORRADOR,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAll(customerId?: string) {
    return this.prisma.order.findMany({
      where: customerId ? { customerId } : undefined,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              include: {
                provider: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              include: {
                provider: {
                  select: { id: true, name: true },
                },
                pricingRules: {
                  orderBy: { minQty: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async addItem(orderId: string, dto: AddItemDto) {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.BORRADOR) {
      throw new BadRequestException('Can only add items to draft orders');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        pricingRules: {
          orderBy: { minQty: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Calcular precio unitario con descuento por volumen
    const unitPrice = this.calculateUnitPrice(product.basePrice, dto.qty, product.pricingRules);
    const lineTotal = new Decimal(unitPrice).mul(dto.qty);

    // Upsert: Si ya existe el producto, actualizar cantidad
    const existing = order.items.find((item) => item.productId === dto.productId);

    if (existing) {
      await this.prisma.orderItem.update({
        where: { id: existing.id },
        data: {
          qty: dto.qty,
          unitPrice,
          lineTotal,
        },
      });
    } else {
      await this.prisma.orderItem.create({
        data: {
          orderId,
          productId: dto.productId,
          qty: dto.qty,
          unitPrice,
          lineTotal,
        },
      });
    }

    return this.recalculateTotals(orderId);
  }

  async removeItem(orderId: string, productId: string) {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.BORRADOR) {
      throw new BadRequestException('Can only remove items from draft orders');
    }

    const item = order.items.find((i) => i.productId === productId);
    if (!item) {
      throw new NotFoundException('Item not found in order');
    }

    await this.prisma.orderItem.delete({
      where: { id: item.id },
    });

    return this.recalculateTotals(orderId);
  }

  async submit(orderId: string, user: { sub: string, role: string }) {
    const order = await this.findOne(orderId);

    if (user.role !== 'EMPLEADO' && order.customerId !== user.sub) {
      throw new ForbiddenException('Can only submit own orders');
    }

    if (order.status !== OrderStatus.BORRADOR) {
      throw new BadRequestException('Order is not in draft status');
    }

    if (order.items.length === 0) {
      throw new BadRequestException('Cannot submit empty order');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PENDIENTE_VALIDACION },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async decline(orderId: string) {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.PENDIENTE_VALIDACION && order.status !== OrderStatus.BORRADOR) {
      throw new BadRequestException('Order cannot be declined from its current status');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.RECHAZADO },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
      },
    });
  }

  async approve(orderId: string) {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.PENDIENTE_VALIDACION) {
      throw new BadRequestException('Order is not pending validation');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.VALIDADO },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async reject(orderId: string) {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.PENDIENTE_VALIDACION && order.status !== OrderStatus.VALIDADO) {
      throw new BadRequestException('Order must be in PENDIENTE_VALIDACION or VALIDADO to be rejected');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.BORRADOR },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async complete(orderId: string) {
    const order = await this.findOne(orderId);

    if (order.status !== OrderStatus.VALIDADO) {
      throw new BadRequestException('Order is not validated');
    }

    // Verificar stock disponible para todos los items
    for (const item of order.items) {
      if (item.product.stock < item.qty) {
        throw new BadRequestException(
          `Insufficient stock for product ${item.product.name}. Available: ${item.product.stock}, Required: ${item.qty}`,
        );
      }
    }

    // Usar transacción para descontar stock y actualizar orden
    return this.prisma.$transaction(async (tx) => {
      // Descontar stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.qty,
            },
          },
        });
      }

      // Actualizar orden a COMPLETADO
      return tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COMPLETADO },
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  async remove(id: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      return await this.prisma.order.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }
      throw error;
    }
  }

  private calculateUnitPrice(
    basePrice: Decimal,
    qty: number,
    pricingRules: Array<{ minQty: number; percentOff: number }>,
  ): Decimal {
    // Encontrar la regla de descuento aplicable (mayor minQty que no exceda qty)
    const applicableRule = pricingRules
      .filter((rule) => rule.minQty <= qty)
      .sort((a, b) => b.minQty - a.minQty)[0];

    if (!applicableRule) {
      return basePrice;
    }

    const discount = new Decimal(applicableRule.percentOff).div(100);
    return basePrice.mul(new Decimal(1).sub(discount));
  }

  private async recalculateTotals(orderId: string) {
    const order = await this.findOne(orderId);

    const subtotal = order.items.reduce(
      (sum, item) => sum.add(new Decimal(item.lineTotal)),
      new Decimal(0),
    );

    const discount = new Decimal(0); // Por ahora sin descuentos adicionales
    const total = subtotal.sub(discount);

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        discount,
        total,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              include: {
                provider: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });
  }
}
