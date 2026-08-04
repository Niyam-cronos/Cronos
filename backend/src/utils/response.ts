import type { Response } from 'express';
import type { ApiResponse } from '../types';

export function sendSuccess<T>(res: Response, data: T, message?: string, status = 200) {
  const body: ApiResponse<T> = { success: true, data, message };
  res.status(status).json(body);
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  pageSize: number
) {
  res.json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  });
}
