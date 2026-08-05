export function formatPersonName(firstName: string, lastName?: string | null): string {
  const first = firstName.trim();
  const last = (lastName ?? '').trim();
  if (!last || last === '.') return first;
  return `${first} ${last}`;
}
