export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  upgradeRequired?: boolean;
  limit?: number;
  used?: number;
  plan?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
