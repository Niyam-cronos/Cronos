export function getPagination(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const skip = (page - 1) * pageSize;
  return { page, pageSize, search, skip };
}
