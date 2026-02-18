import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // Verificar que el proveedor existe y tiene rol PROVEEDOR
    const provider = await this.prisma.user.findUnique({
      where: { id: dto.providerId },
    });

    if (!provider || provider.role !== 'PROVEEDOR') {
      throw new BadRequestException('Provider not found or invalid role');
    }

    // Verificar SKU único
    const existing = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });

    if (existing) {
      throw new BadRequestException('SKU already exists');
    }

    return this.prisma.product.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        basePrice: dto.basePrice,
        stock: dto.stock,
        providerId: dto.providerId,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        pricingRules: {
          orderBy: { minQty: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        pricingRules: {
          orderBy: { minQty: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id); // Verificar existencia

    // Si se actualiza el SKU, verificar unicidad
    if (dto.sku) {
      const existing = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException('SKU already exists');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        pricingRules: {
          orderBy: { minQty: 'asc' },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Verificar si tiene items en órdenes
    const hasOrders = await this.prisma.orderItem.findFirst({
      where: { productId: id },
    });

    if (hasOrders) {
      throw new BadRequestException('Cannot delete product with existing order items');
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }
}
