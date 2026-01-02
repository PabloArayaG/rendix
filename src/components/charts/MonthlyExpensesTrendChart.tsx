import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboard } from '../../hooks/useDashboard';
import { formatCurrency } from '../../lib/utils';

interface MonthlyData {
  month: string;
  total: number;
  expenses: number;
}

export function MonthlyExpensesTrendChart() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const { getMonthlyStats } = useDashboard();

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        setLoading(true);
        const monthlyData = await getMonthlyStats(6); // Últimos 6 meses
        
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
  }, [getMonthlyStats]);

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No hay datos de tendencia para mostrar</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
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
  );
}

