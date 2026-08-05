export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type ApiError = {
  message: string;
  status?: number;
};
