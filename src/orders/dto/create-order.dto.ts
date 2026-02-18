import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del cliente (User con rol CLIENTE)',
  })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;
}
