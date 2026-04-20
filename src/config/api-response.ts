export type ApiSuccessResponse<T> = {
  message: string;
  data: T;
};

export type ApiErrorResponse = {
  statusCode: number;
  message: string;
  errors: string[];
  timestamp: string;
  path: string;
};
