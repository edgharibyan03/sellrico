import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteAuthGuard } from '../auth/guards/site-auth.guard';
import { CurrentSite } from '../common/decorators/current-site.decorator';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { ChatService, ChatResponseDto } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(SiteAuthGuard)
  @ApiBearerAuth('site-jwt')
  @ApiOperation({
    summary: 'Send a visitor chat message',
    description:
      'Plugin endpoint. Site identity comes from the site JWT. Persists conversation/messages and returns an AI reply with optional product hints.',
  })
  chat(
    @CurrentSite() site: AuthenticatedSite,
    @Body() dto: ChatMessageDto,
  ): Promise<ChatResponseDto> {
    return this.chatService.handleMessage(site, dto);
  }
}
