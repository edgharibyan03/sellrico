import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness check (public)' })
  check() {
    return {
      status: 'ok',
      service: 'shoppio-backend',
      environment: this.appConfig.nodeEnv,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check including database (public)' })
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ready',
      database: 'up',
    };
  }
}
