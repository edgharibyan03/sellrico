import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ enum: ['free', 'pro', 'business'] })
  @IsString()
  @IsIn(['free', 'pro', 'business'])
  planId!: 'free' | 'pro' | 'business';

  @ApiPropertyOptional({ enum: ['monthly', 'annual'] })
  @IsOptional()
  @IsIn(['monthly', 'annual'])
  interval?: 'monthly' | 'annual';
}
