export type RepeatRule = 'none' | 'daily' | 'weekly';

export type ReportScope = 'today' | 'week' | 'month';

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatLocalDateUtil(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function addCalendarDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatLocalDateUtil(dt);
}

export function dateInReportScope(
  dateStr: string,
  scope: ReportScope,
  now: Date = new Date(),
): boolean {
  const end = formatLocalDateUtil(now);
  if (scope === 'today') {
    return dateStr === end;
  }
  if (scope === 'week') {
    const s = new Date(now);
    s.setDate(s.getDate() - 6);
    const start = formatLocalDateUtil(s);
    return dateStr >= start && dateStr <= end;
  }
  const y = now.getFullYear();
  const mo = now.getMonth();
  const first = formatLocalDateUtil(new Date(y, mo, 1));
  const last = formatLocalDateUtil(new Date(y, mo + 1, 0));
  return dateStr >= first && dateStr <= last;
}

export function parseRepeatRule(value: unknown): RepeatRule {
  if (value === 'daily' || value === 'weekly') {
    return value;
  }
  return 'none';
}
