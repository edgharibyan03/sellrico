import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateOnboardingDto {
  @ApiProperty({ example: 3, description: 'Current onboarding step (0-based or absolute progress)' })
  @IsInt()
  @Min(0)
  @Max(20)
  step!: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Mark onboarding as completed when true',
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
