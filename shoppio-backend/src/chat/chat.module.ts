import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AssistantModule } from '../assistant/assistant.module';
import { AuthModule } from '../auth/auth.module';
import { UsageModule } from '../usage/usage.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AuthModule, AiModule, UsageModule, AssistantModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
