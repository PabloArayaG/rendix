export type TimeRange = '7days' | '30days' | '3months' | '6months' | '12months' | 'custom';

export function getMonthsFromRange(range: TimeRange): number {
  const months: Partial<Record<TimeRange, number>> = {
    '7days': 0.25,
    '30days': 1,
    '3months': 3,
    '6months': 6,
    '12months': 12,
  };
  return months[range] ?? 6;
}

export function getDaysFromRange(range: TimeRange): number {
  const days: Partial<Record<TimeRange, number>> = {
    '7days': 7,
    '30days': 30,
    '3months': 90,
    '6months': 180,
    '12months': 365,
  };
  return days[range] ?? 180;
}
