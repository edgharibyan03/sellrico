import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConnectSiteDto {
  @ApiProperty({ example: 'https://example.com', description: 'WordPress site home URL or domain' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  domain!: string;

  @ApiProperty({ example: 'Acme Store' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: '6.7.1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  wpVersion?: string;

  @ApiPropertyOptional({ example: '0.1.0' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  pluginVersion?: string;

  @ApiPropertyOptional({
    description: 'Dashboard-issued connect code (SP-XXXX-XXXX)',
    example: 'SP-A1B2-C3D4',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  connectCode?: string;
}
