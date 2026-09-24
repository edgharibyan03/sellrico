import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ example: 'Do you have white interior doors?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Visitor session id (UUID). Created by the widget and reused.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Continue an existing conversation' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Visitor UI language preference from the chat widget (e.g. ru, en)',
    example: 'ru',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;
}
