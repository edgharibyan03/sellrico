import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSiteDto {
  @ApiProperty({ example: 'https://mystore.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  domain!: string;

  @ApiPropertyOptional({ example: 'My Store' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
