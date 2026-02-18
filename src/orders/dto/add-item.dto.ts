import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min } from 'class-validator';

export class AddItemDto {
  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440000',
    description: 'ID del producto a agregar',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 50, description: 'Cantidad a ordenar' })
  @IsInt()
  @Min(1)
  qty: number;
}
