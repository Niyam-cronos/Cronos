import type { Request } from 'express';

export function paramId(req: Request, key = 'id'): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0]! : val!;
}
