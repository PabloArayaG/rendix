import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProjectsStatusChartProps {
  activeProjects: number;
  completedProjects: number;
}

const COLORS = {
  'En Proceso': '#3B82F6', // blue-500
  'Terminados': '#10B981', // green-500
};

export function ProjectsStatusChart({ activeProjects, completedProjects }: ProjectsStatusChartProps) {
  const data = [
    { name: 'En Proceso', value: activeProjects },
    { name: 'Terminados', value: completedProjects },
  ];

  const total = activeProjects + completedProjects;

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No hay proyectos para mostrar</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `${value} proyecto${value !== 1 ? 's' : ''}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

