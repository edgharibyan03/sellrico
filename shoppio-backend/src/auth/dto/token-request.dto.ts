import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TokenRequestDto {
  @ApiProperty({ description: 'Public site credential key id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  keyId!: string;

  @ApiProperty({ description: 'Site credential secret (never log this value)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  secret!: string;
}
