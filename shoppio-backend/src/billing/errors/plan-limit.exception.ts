import { HttpException, HttpStatus } from '@nestjs/common';

export interface PlanLimitBody {
  code: string;
  message: string;
  upgradeRequired: boolean;
  limit: number;
  used: number;
  plan: string;
}

export class PlanLimitException extends HttpException {
  constructor(body: PlanLimitBody) {
    super(body, HttpStatus.FORBIDDEN);
  }
}
