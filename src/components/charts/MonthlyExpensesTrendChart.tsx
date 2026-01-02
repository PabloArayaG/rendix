import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { supabase, getCurrentUserId } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { TimeRangeSelector, TimeRange, getMonthsFromRange } from './TimeRangeSelector';

interface MonthlyData {
  month: string;
  total: number;
  expenses: number;
}

interface MonthlyExpensesTrendChartProps {
  projectId?: string;
}

export function MonthlyExpensesTrendChart({ projectId }: MonthlyExpensesTrendChartProps = {}) {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('6months');
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      if (!activeOrganizationId) return;
      
      try {
        setLoading(true);
        const userId = await getCurrentUserId();
        if (!userId) return;

        const months = getMonthsFromRange(timeRange);
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - Math.max(1, Math.ceil(months)));

        let query = supabase
          .from('expenses')
          .select('amount, date')
          .eq('organization_id', activeOrganizationId)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date');

        if (projectId && projectId !== 'all') {
          query = query.eq('project_id', projectId);
        }

        const { data: expenses, error } = await query;
        if (error) throw error;

        // Agrupar por mes
        const monthlyMap = (expenses || []).reduce((acc: any, expense: any) => {
          const month = expense.date.substring(0, 7);
          if (!acc[month]) {
            acc[month] = { total: 0, expenses: 0 };
          }
          acc[month].total += expense.amount;
          acc[month].expenses += 1;
          return acc;
        }, {});

        const monthlyData = Object.entries(monthlyMap).map(([month, data]: [string, any]) => ({
          month,
          total: data.total,
          expenses: data.expenses,
        }));
        
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

