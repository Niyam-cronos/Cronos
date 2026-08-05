export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes ?? 0);
}

export function getLocalTimeParts(date: Date, timezone: string): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return {
    hours: Number(parts.find((p) => p.type === 'hour')?.value ?? '0'),
    minutes: Number(parts.find((p) => p.type === 'minute')?.value ?? '0'),
  };
}

export function getDateKeyInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getMinutesSinceMidnight(date: Date, timezone: string): number {
  const { hours, minutes } = getLocalTimeParts(date, timezone);
  return hours * 60 + minutes;
}

export function startOfDayInTimezone(date: Date, timezone: string): Date {
  const key = getDateKeyInTimezone(date, timezone);
  return new Date(`${key}T00:00:00`);
}

export interface PeriodRange {
  start: Date;
  end: Date;
}

export function getEvaluationPeriodRange(
  date: Date,
  period: string,
  timezone: string
): PeriodRange {
  const key = getDateKeyInTimezone(date, timezone);
  const [year, month, day] = key.split('-').map(Number);

  if (period === 'WEEKLY') {
    const d = new Date(`${key}T12:00:00`);
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(d);
    start.setDate(d.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'QUARTERLY') {
    const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
    const start = new Date(year, quarterStartMonth - 1, 1);
    const end = new Date(year, quarterStartMonth + 2, 0, 23, 59, 59, 999);
    return { start, end };
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}
