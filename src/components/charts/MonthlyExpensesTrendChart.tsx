import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboard } from '../../hooks/useDashboard';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../lib/utils';
import { TimeRangeSelector, TimeRange, getMonthsFromRange } from './TimeRangeSelector';

interface MonthlyData {
  month: string;
  total: number;
  expenses: number;
}

export function MonthlyExpensesTrendChart() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('6months');
  const { getMonthlyStats } = useDashboard();
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      if (!activeOrganizationId) return;
      
      try {
        setLoading(true);
        const months = getMonthsFromRange(timeRange);
        const monthlyData = await getMonthlyStats(Math.max(1, Math.ceil(months)));
        
        // Formatear datos para el gráfico
        const formattedData = monthlyData.map((item: any) => ({
          month: formatMonthLabel(item.month),
          total: item.total,
          expenses: item.expenses,
        }));

        setData(formattedData);
      } catch (err) {
        console.error('Error fetching monthly stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [activeOrganizationId, timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="space-y-4">
      <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
      
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>No hay datos de tendencia para mostrar en este período</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="month" 
          tick={{ fill: 'currentColor' }}
          className="text-gray-600 dark:text-gray-400"
        />
        <YAxis 
          tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
          tick={{ fill: 'currentColor' }}
          className="text-gray-600 dark:text-gray-400"
        />
        <Tooltip 
          formatter={(value) => formatCurrency(value as number)}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="total" 
          stroke="#3B82F6" 
          strokeWidth={2}
          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
          name="Gastos Totales"
        />
      </LineChart>
    </ResponsiveContainer>
      )}
    </div>
  );
}

