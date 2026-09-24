import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectResponseDto {
  @ApiProperty()
  siteId!: string;

  @ApiProperty()
  domain!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'Public credential identifier' })
  keyId!: string;

  @ApiProperty({
    description: 'Secret shown only once — store server-side in WordPress options',
  })
  secret!: string;
}

export class TokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ description: 'Lifetime until expiry' })
  expiresIn!: number;

  @ApiProperty()
  siteId!: string;
}

export class RevokeResponseDto {
  @ApiProperty()
  revoked!: boolean;

  @ApiPropertyOptional()
  keyId?: string;
}

export class RotateResponseDto {
  @ApiProperty()
  keyId!: string;

  @ApiProperty({ description: 'New secret shown only once' })
  secret!: string;

  @ApiProperty({ description: 'Previous key id that was revoked' })
  previousKeyId!: string;
}
