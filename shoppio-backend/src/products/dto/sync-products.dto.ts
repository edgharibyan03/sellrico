import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SyncProductItemDto {
  @ApiProperty({ example: '42' })
  @IsString()
  @MaxLength(64)
  externalProductId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 29.99 })
  @IsOptional()
  @IsNumber()
  price?: number | null;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 'in_stock' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  stockStatus?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  category?: string | null;

  @ApiPropertyOptional({ example: 'SKU-100' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sku?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Flat attribute map, e.g. { "Color": "White", "Size": ["M","L"] }',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | string[]>;
}

export class SyncProductsDto {
  @ApiProperty({ type: [SyncProductItemDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SyncProductItemDto)
  products!: SyncProductItemDto[];

  @ApiPropertyOptional({
    description:
      'When set, any products for this site whose externalProductId is not in this list are deleted',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10000)
  keepExternalIds?: string[];

  @ApiPropertyOptional({
    description:
      'When true and keepExternalIds is omitted, prune to only the products in this payload',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  replaceAll?: boolean;
}
