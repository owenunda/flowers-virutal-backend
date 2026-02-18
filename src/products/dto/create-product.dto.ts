import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, IsUUID } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'ROSE-RED-001', description: 'Código SKU único del producto' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Rosa Roja Premium', description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 2.5, description: 'Precio base unitario' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ example: 100, description: 'Stock inicial' })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del proveedor (User con rol PROVEEDOR)',
  })
  @IsUUID()
  providerId: string;
}
