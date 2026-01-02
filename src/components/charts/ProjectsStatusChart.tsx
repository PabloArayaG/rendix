import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProjectsStatusChartProps {
  activeProjects: number;
  completedProjects: number;
}

const COLORS = {
  'En Proceso': '#F97316', // orange-500
  'Terminados': '#10B981', // green-500
};

const GRADIENTS = {
  'En Proceso': 'url(#colorEnProceso)',
  'Terminados': 'url(#colorTerminados)',
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
    <div className="relative">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <defs>
            <linearGradient id="colorEnProceso" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F97316" stopOpacity={0.9}/>
              <stop offset="100%" stopColor="#FB923C" stopOpacity={0.8}/>
            </linearGradient>
            <linearGradient id="colorTerminados" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.9}/>
              <stop offset="100%" stopColor="#34D399" stopOpacity={0.8}/>
            </linearGradient>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={GRADIENTS[entry.name as keyof typeof GRADIENTS]}
                stroke="none"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Centro del donut con estadística */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-4xl font-bold text-gray-900 dark:text-white">{total}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Proyectos</p>
      </div>
      
      {/* Leyenda personalizada */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-orange-500 to-orange-400"></div>
          <div className="flex-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">En Proceso</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{activeProjects}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-green-400"></div>
          <div className="flex-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">Terminados</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{completedProjects}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

