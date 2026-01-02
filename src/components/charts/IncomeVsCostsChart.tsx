import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../lib/utils';

interface IncomeVsCostsChartProps {
  totalSales: number;
  totalCosts: number;
  totalMargin: number;
}

export function IncomeVsCostsChart({ totalSales, totalCosts, totalMargin }: IncomeVsCostsChartProps) {
  const data = [
    {
      name: 'Resumen Financiero',
      'Ingresos': totalSales,
      'Costos': totalCosts,
      'Margen': totalMargin,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
        <Tooltip 
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
        />
        <Legend />
        <Bar dataKey="Ingresos" fill="#10B981" radius={[8, 8, 0, 0]} />
        <Bar dataKey="Costos" fill="#EF4444" radius={[8, 8, 0, 0]} />
        <Bar dataKey="Margen" fill="#3B82F6" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

