import { Calendar } from 'lucide-react';

export type TimeRange = '7days' | '30days' | '3months' | '6months' | '12months' | 'custom';

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
  showCustom?: boolean;
}

const timeRangeLabels: Record<TimeRange, string> = {
  '7days': 'Últimos 7 días',
  '30days': 'Últimos 30 días',
  '3months': 'Últimos 3 meses',
  '6months': 'Últimos 6 meses',
  '12months': 'Último año',
  'custom': 'Personalizado',
};

const timeRangeOptions: TimeRange[] = ['7days', '30days', '3months', '6months', '12months'];

export function TimeRangeSelector({ selected, onChange, showCustom = false }: TimeRangeSelectorProps) {
  const options: TimeRange[] = showCustom ? [...timeRangeOptions, 'custom' as TimeRange] : timeRangeOptions;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <Calendar className="h-4 w-4" />
        <span className="font-medium">Período:</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {options.map((range: TimeRange) => (
          <button
            key={range}
            onClick={() => onChange(range)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${
                selected === range
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {timeRangeLabels[range]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function getMonthsFromRange(range: TimeRange): number {
  switch (range) {
    case '7days':
      return 0.25; // ~1 semana
    case '30days':
      return 1;
    case '3months':
      return 3;
    case '6months':
      return 6;
    case '12months':
      return 12;
    default:
      return 6;
  }
}

export function getDaysFromRange(range: TimeRange): number {
  switch (range) {
    case '7days':
      return 7;
    case '30days':
      return 30;
    case '3months':
      return 90;
    case '6months':
      return 180;
    case '12months':
      return 365;
    default:
      return 180;
  }
}

