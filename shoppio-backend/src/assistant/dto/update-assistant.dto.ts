import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const TONES = ['friendly', 'professional', 'concise', 'enthusiastic'] as const;
const LANGUAGES = ['en', 'ru', 'es', 'fr', 'de'] as const;
const INDUSTRIES = ['auto', 'generic', 'doors'] as const;

export class UpdateAssistantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  welcomeMessage?: string;

  @ApiPropertyOptional({ enum: LANGUAGES })
  @IsOptional()
  @IsIn(LANGUAGES)
  language?: (typeof LANGUAGES)[number];

  @ApiPropertyOptional({ enum: TONES })
  @IsOptional()
  @IsIn(TONES)
  tone?: (typeof TONES)[number];

  @ApiPropertyOptional({ example: '#0F766E' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6})$/)
  primaryColor?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  suggestedQuestions?: string[];

  @ApiPropertyOptional({ description: 'Launcher offset from the right edge in px' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  offsetRight?: number;

  @ApiPropertyOptional({ description: 'Launcher offset from the bottom edge in px' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  offsetBottom?: number;

  @ApiPropertyOptional({
    enum: INDUSTRIES,
    description:
      'Search/AI vertical. auto applies door heuristics only when the query is door-related; generic disables them; doors enables door-store rules.',
  })
  @IsOptional()
  @IsIn(INDUSTRIES)
  industry?: (typeof INDUSTRIES)[number];

  @ApiPropertyOptional({
    description: 'Optional merchant instructions appended to the AI system prompt',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customInstructions?: string;
}
