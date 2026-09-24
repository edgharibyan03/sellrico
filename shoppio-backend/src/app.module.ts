import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigModule } from './config/config.module';
import { validationSchema } from './config/validation.schema';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SitesModule } from './sites/sites.module';
import { ProductsModule } from './products/products.module';
import { ConversationsModule } from './conversations/conversations.module';
import { UsageModule } from './usage/usage.module';
import { UsersModule } from './users/users.module';
import { AiModule } from './ai/ai.module';
import { ChatModule } from './chat/chat.module';
import { HealthModule } from './health/health.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema,
    }),
    AppConfigModule,
    CommonModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    SitesModule,
    ProductsModule,
    ConversationsModule,
    UsageModule,
    UsersModule,
    ChatModule,
    AiModule,
    DashboardModule,
  ],
})
export class AppModule {}
