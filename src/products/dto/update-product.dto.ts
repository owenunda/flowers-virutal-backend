import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'ROSE-RED-002' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 'Rosa Roja Premium Plus' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 2.75 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;
}
