import { Calendar } from 'lucide-react';
import { TimeRange } from '../../lib/timeRanges';

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
  const options: TimeRange[] = showCustom ? [...timeRangeOptions, 'custom'] : timeRangeOptions;

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
                  ? 'bg-orange-500 text-white shadow-sm hover:bg-orange-600 dark:hover:bg-orange-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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

