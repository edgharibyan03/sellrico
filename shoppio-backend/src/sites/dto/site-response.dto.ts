import { ApiProperty } from '@nestjs/swagger';

export class DashboardSiteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  domain!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'DISCONNECTED'] })
  status!: string;

  @ApiProperty()
  productCount!: number;

  @ApiProperty({ nullable: true })
  lastSyncedAt!: string | null;

  @ApiProperty({ enum: ['idle', 'connecting', 'connected', 'error'] })
  connectionStatus!: 'idle' | 'connecting' | 'connected' | 'error';

  @ApiProperty({ example: 'free' })
  planId!: 'free' | 'pro' | 'business';

  @ApiProperty()
  createdAt!: string;
}

export class ConnectCodeResponseDto {
  @ApiProperty({ example: 'SP-ABCD-EFGH' })
  code!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ type: [String] })
  instructions!: string[];
}

export class SyncProgressDto {
  @ApiProperty({ enum: ['idle', 'syncing', 'completed', 'error'] })
  status!: 'idle' | 'syncing' | 'completed' | 'error';

  @ApiProperty()
  productsSynced!: number;

  @ApiProperty()
  productsTotal!: number;

  @ApiProperty()
  message!: string;

  @ApiProperty({ nullable: true, required: false })
  error?: string | null;
}
