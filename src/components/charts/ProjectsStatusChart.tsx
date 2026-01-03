import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ProjectsStatusChartProps {
  activeProjects: number;
  completedProjects: number;
}

const COLORS = {
  'En Proceso': '#F97316', // orange-500
  'Terminados': '#10B981', // green-500
};

export function ProjectsStatusChart({ activeProjects, completedProjects }: ProjectsStatusChartProps) {
  const data = [
    { name: 'En Proceso', value: activeProjects, color: COLORS['En Proceso'] },
    { name: 'Terminados', value: completedProjects, color: COLORS['Terminados'] },
  ];

  const total = activeProjects + completedProjects;

  if (total === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
        <p>No hay proyectos para mostrar</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold mb-2" style={{ color: data.payload.color }}>
            {data.name}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.value}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {percent}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex items-center gap-8 h-[320px]">
      {/* Estadísticas a la izquierda */}
      <div className="flex-1 flex flex-col justify-center space-y-6">
        {/* Total */}
        <div>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">Total de Proyectos</p>
          <p className="text-6xl font-bold text-gray-900 dark:text-white">{total}</p>
        </div>
        
        {/* Leyendas */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-500 to-orange-400"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">En Proceso</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeProjects}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-500 to-green-400"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Terminados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedProjects}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Donut a la derecha */}
      <div className="w-64 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={5}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
            fill="none"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill="transparent"
                stroke={COLORS[entry.name as keyof typeof COLORS]}
                strokeWidth={8}
              />
            ))}
          </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

