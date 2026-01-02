import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { formatCurrency } from '../../lib/utils';

interface IncomeVsCostsChartProps {
  totalSales: number;
  totalCosts: number;
  totalMargin: number;
}

export function IncomeVsCostsChart({ totalSales, totalCosts, totalMargin }: IncomeVsCostsChartProps) {
  const data = [
    {
      category: 'Ingresos',
      value: totalSales,
      color: '#10B981',
      gradient: 'url(#colorIngresos)',
    },
    {
      category: 'Costos',
      value: totalCosts,
      color: '#EF4444',
      gradient: 'url(#colorCostos)',
    },
    {
      category: 'Margen',
      value: totalMargin,
      color: '#3B82F6',
      gradient: 'url(#colorMargen)',
    },
  ];

  const marginPercent = totalSales > 0 ? ((totalMargin / totalSales) * 100).toFixed(1) : '0';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-900 mb-2">{data.name}</p>
          <p className="text-lg font-bold" style={{ color: data.payload.color }}>
            {formatCurrency(data.value)}
          </p>
          {data.name === 'Margen' && (
            <p className="text-xs text-gray-600 mt-1">
              Margen: {marginPercent}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart 
        data={data} 
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        barSize={80}
      >
        <defs>
          <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.9}/>
            <stop offset="100%" stopColor="#10B981" stopOpacity={0.7}/>
          </linearGradient>
          <linearGradient id="colorCostos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9}/>
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0.7}/>
          </linearGradient>
          <linearGradient id="colorMargen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9}/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.7}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
        <XAxis 
          dataKey="category" 
          tick={{ fill: 'currentColor', fontSize: 14, fontWeight: 500 }}
          className="text-gray-600 dark:text-gray-400"
          axisLine={{ stroke: 'currentColor', strokeOpacity: 0.3 }}
        />
        <YAxis 
          tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
          tick={{ fill: 'currentColor', fontSize: 12 }}
          className="text-gray-600 dark:text-gray-400"
          axisLine={{ stroke: 'currentColor', strokeOpacity: 0.3 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.gradient} />
          ))}
          <LabelList 
            dataKey="value" 
            position="top" 
            formatter={(value) => `$${((value as number) / 1000000).toFixed(1)}M`}
            className="fill-gray-700 dark:fill-gray-300"
            style={{ fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

