import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ConsolidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consolida todas las órdenes VALIDADAS que aún no han sido consolidadas
   * Agrupa por proveedor y crea ConsolidatedOrder para cada uno
   */
  async consolidateValidatedOrders() {
    // Buscar órdenes VALIDADAS sin consolidar
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'VALIDADO',
        consolidatedAt: null,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                providerId: true,
              },
            },
          },
        },
      },
    });

    if (orders.length === 0) {
      throw new BadRequestException('No validated orders to consolidate');
    }

    // Agrupar items por proveedor
    const itemsByProvider = new Map<
      string,
      Array<{
        productId: string;
        qty: number;
        unitPrice: Decimal;
      }>
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const providerId = item.product.providerId;

        if (!itemsByProvider.has(providerId)) {
          itemsByProvider.set(providerId, []);
        }

        const providerItems = itemsByProvider.get(providerId)!;
        const existing = providerItems.find((i) => i.productId === item.productId);

        if (existing) {
          existing.qty += item.qty;
        } else {
          providerItems.push({
            productId: item.productId,
            qty: item.qty,
            unitPrice: new Decimal(item.unitPrice),
          });
        }
      }
    }

    // Crear ConsolidatedOrder para cada proveedor en transacción
    const consolidatedOrders = await this.prisma.$transaction(async (tx) => {
      const results: Awaited<ReturnType<typeof tx.consolidatedOrder.create>>[] = [];

      for (const [providerId, items] of itemsByProvider) {
        const consolidatedOrder = await tx.consolidatedOrder.create({
          data: {
            providerId,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                totalQty: item.qty,
                unitPrice: item.unitPrice,
                lineTotal: item.unitPrice.mul(item.qty),
              })),
            },
          },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        results.push(consolidatedOrder);
      }

      // Marcar órdenes como consolidadas y completadas (despacho al proveedor = completado)
      await tx.order.updateMany({
        where: {
          id: {
            in: orders.map((o) => o.id),
          },
        },
        data: {
          consolidatedAt: new Date(),
          status: 'COMPLETADO',
        },
      });

      return results;
    });

    return {
      consolidatedOrders,
      ordersProcessed: orders.length,
    };
  }

  async findAll(providerId?: string) {
    return this.prisma.consolidatedOrder.findMany({
      where: providerId ? { providerId } : undefined,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const consolidated = await this.prisma.consolidatedOrder.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                basePrice: true,
              },
            },
          },
        },
      },
    });

    if (!consolidated) {
      throw new BadRequestException('Consolidated order not found');
    }

    return consolidated;
  }
}
