import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase, getCurrentUserId } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../lib/utils';
import { TimeRangeSelector, TimeRange, getDaysFromRange } from './TimeRangeSelector';
import { EXPENSE_CATEGORIES } from '../../types/database';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

interface CategoryData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface ExpensesByCategoryChartProps {
  projectId?: string;
}

export function ExpensesByCategoryChart({ projectId }: ExpensesByCategoryChartProps = {}) {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        const userId = await getCurrentUserId();
        if (!userId || !activeOrganizationId) return;

        // Calcular fecha de inicio según el rango
        const daysAgo = getDaysFromRange(timeRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        let query = supabase
          .from('expenses')
          .select('category, net_amount, date')
          .eq('organization_id', activeOrganizationId)
          .gte('date', startDate.toISOString().split('T')[0]);

        if (projectId && projectId !== 'all') {
          query = query.eq('project_id', projectId);
        }

        const { data: expenses, error } = await query;

        if (error) throw error;

        // Agrupar por categoría y traducir a español
        const categoryMap = expenses?.reduce((acc, expense) => {
          const categoryValue = expense.category || 'general';
          // Buscar el label en español
          const categoryLabel = EXPENSE_CATEGORIES.find((c: any) => c.value === categoryValue)?.label || 'Sin categoría';
          
          if (!acc[categoryLabel]) {
            acc[categoryLabel] = 0;
          }
          acc[categoryLabel] += expense.net_amount;
          return acc;
        }, {} as Record<string, number>);

        const chartData = Object.entries(categoryMap || {}).map(([name, value]) => ({
          name,
          value,
        })).sort((a, b) => b.value - a.value);

        setData(chartData);
      } catch (err) {
        console.error('Error fetching category data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (activeOrganizationId) {
      fetchCategoryData();
    }
  }, [activeOrganizationId, timeRange, projectId]);

  return (
    <div className="space-y-4">
      <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
      
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>No hay gastos para mostrar en este período</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
        <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
          outerRadius={80}
          fill="none"
          dataKey="value"
        >
          {data.map((_entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.2}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value as number)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
      )}
    </div>
  );
}

