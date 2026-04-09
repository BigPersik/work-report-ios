import { addCalendarDays, dateInReportScope, formatLocalDateUtil, parseRepeatRule } from './dayflow-utils';

describe('addCalendarDays', () => {
  it('adds one day', () => {
    expect(addCalendarDays('2026-04-09', 1)).toBe('2026-04-10');
  });
  it('handles month wrap', () => {
    expect(addCalendarDays('2026-03-31', 1)).toBe('2026-04-01');
  });
});

describe('dateInReportScope', () => {
  const now = new Date(2026, 3, 9);
  it('today', () => {
    expect(dateInReportScope('2026-04-09', 'today', now)).toBe(true);
    expect(dateInReportScope('2026-04-08', 'today', now)).toBe(false);
  });
  it('week is last 7 days inclusive', () => {
    expect(dateInReportScope('2026-04-03', 'week', now)).toBe(true);
    expect(dateInReportScope('2026-04-02', 'week', now)).toBe(false);
  });
  it('month', () => {
    expect(dateInReportScope('2026-04-01', 'month', now)).toBe(true);
    expect(dateInReportScope('2026-03-31', 'month', now)).toBe(false);
  });
});

describe('formatLocalDateUtil', () => {
  it('pads month and day', () => {
    expect(formatLocalDateUtil(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseRepeatRule', () => {
  it('accepts known rules', () => {
    expect(parseRepeatRule('daily')).toBe('daily');
    expect(parseRepeatRule('weekly')).toBe('weekly');
  });
  it('defaults to none', () => {
    expect(parseRepeatRule(undefined)).toBe('none');
    expect(parseRepeatRule('x')).toBe('none');
  });
});
