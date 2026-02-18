import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Exporta una orden individual con todos sus detalles
   */
  async exportOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            product: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      exportType: 'ORDER',
      exportDate: new Date().toISOString(),
      data: {
        orderId: order.id,
        orderNumber: order.id.substring(0, 8).toUpperCase(),
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        consolidatedAt: order.consolidatedAt,
        customer: {
          name: order.customer.name,
          email: order.customer.email,
          role: order.customer.role,
        },
        currency: order.currency,
        totals: {
          subtotal: order.subtotal.toString(),
          discount: order.discount.toString(),
          total: order.total.toString(),
        },
        items: order.items.map((item) => ({
          product: {
            sku: item.product.sku,
            name: item.product.name,
            provider: item.product.provider.name,
          },
          qty: item.qty,
          unitPrice: item.unitPrice.toString(),
          lineTotal: item.lineTotal.toString(),
        })),
      },
    };
  }

  /**
   * Exporta una orden consolidada para un proveedor
   */
  async exportConsolidatedOrder(consolidatedOrderId: string) {
    const consolidated = await this.prisma.consolidatedOrder.findUnique({
      where: { id: consolidatedOrderId },
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
          orderBy: {
            product: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!consolidated) {
      throw new NotFoundException('Consolidated order not found');
    }

    const grandTotal = consolidated.items.reduce(
      (sum, item) => sum + parseFloat(item.lineTotal.toString()),
      0,
    );

    return {
      exportType: 'CONSOLIDATED_ORDER',
      exportDate: new Date().toISOString(),
      data: {
        consolidatedOrderId: consolidated.id,
        orderNumber: consolidated.id.substring(0, 8).toUpperCase(),
        createdAt: consolidated.createdAt,
        provider: {
          name: consolidated.provider.name,
          email: consolidated.provider.email,
        },
        items: consolidated.items.map((item) => ({
          product: {
            sku: item.product.sku,
            name: item.product.name,
            basePrice: item.product.basePrice.toString(),
          },
          totalQty: item.totalQty,
          unitPrice: item.unitPrice.toString(),
          lineTotal: item.lineTotal.toString(),
        })),
        totals: {
          totalItems: consolidated.items.length,
          grandTotal: grandTotal.toFixed(2),
        },
      },
    };
  }

  /**
   * Exporta reporte de ventas por producto
   */
  async exportProductSalesReport() {
    const products = await this.prisma.product.findMany({
      include: {
        provider: {
          select: {
            name: true,
          },
        },
        orderItems: {
          include: {
            order: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    const report = products.map((product) => {
      const completedItems = product.orderItems.filter(
        (item) => item.order.status === 'COMPLETADO',
      );
      const totalQtySold = completedItems.reduce((sum, item) => sum + item.qty, 0);
      const totalRevenue = completedItems.reduce(
        (sum, item) => sum + parseFloat(item.lineTotal.toString()),
        0,
      );

      return {
        sku: product.sku,
        name: product.name,
        provider: product.provider.name,
        basePrice: product.basePrice.toString(),
        currentStock: product.stock,
        totalQtySold,
        totalRevenue: totalRevenue.toFixed(2),
      };
    });

    return {
      exportType: 'PRODUCT_SALES_REPORT',
      exportDate: new Date().toISOString(),
      data: {
        products: report,
        summary: {
          totalProducts: report.length,
          totalRevenue: report
            .reduce((sum, p) => sum + parseFloat(p.totalRevenue), 0)
            .toFixed(2),
        },
      },
    };
  }
}
