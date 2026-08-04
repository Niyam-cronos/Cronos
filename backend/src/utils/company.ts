import { getPagination } from '../utils/pagination';
import { AppError } from '../middleware/error-handler';
import type { AuthRequest } from '../middleware/auth';

export function getCompanyId(req: AuthRequest): string {
  const companyId = req.user?.companyId;
  if (!companyId) throw new AppError(403, 'Company context required');
  return companyId;
}

export function companyWhere(req: AuthRequest) {
  if (req.user?.roles.includes('super_admin') && req.query.companyId) {
    return { companyId: String(req.query.companyId) };
  }
  return { companyId: getCompanyId(req) };
}

export { getPagination };
