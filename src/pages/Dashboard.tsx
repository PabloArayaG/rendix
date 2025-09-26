import { useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  FolderOpen, 
  Receipt, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatPercentage, formatShortDate, getMarginColor } from '../lib/utils';

export function Dashboard() {
  const { stats, loading, error, refetch } = useDashboard();

  useEffect(() => {
    refetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="Resumen general de tu actividad financiera">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard" subtitle="Resumen general de tu actividad financiera">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'blue',
    change,
    changeType = 'positive'
  }: {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color?: 'blue' | 'green' | 'yellow' | 'purple';
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
    };

    const changeColors = {
      positive: 'text-green-600',
      negative: 'text-red-600',
      neutral: 'text-gray-600',
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
            {change && (
              <div className="flex items-center mt-2">
                {changeType === 'positive' ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                ) : changeType === 'negative' ? (
                  <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
                ) : null}
                <span className={`text-sm ${changeColors[changeType]}`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout title="Dashboard" subtitle="Resumen general de tu actividad financiera">
      <div className="space-y-6">
        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Proyectos"
            value={stats?.total_projects.toString() || '0'}
            icon={FolderOpen}
            color="blue"
          />
          <StatCard
            title="Ingresos Totales"
            value={formatCurrency(stats?.total_sales || 0)}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Costos Totales"
            value={formatCurrency(stats?.total_costs || 0)}
            icon={Receipt}
            color="yellow"
          />
          <StatCard
            title="Margen Total"
            value={formatCurrency(stats?.total_margin || 0)}
            icon={TrendingUp}
            color="purple"
          />
        </div>

        {/* Resumen financiero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Métricas de margen */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rendimiento Financiero
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Margen Total:</span>
                <span className={`font-semibold ${getMarginColor(stats?.margin_percentage || 0)}`}>
                  {formatPercentage(stats?.margin_percentage || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Proyectos Activos:</span>
                <span className="font-semibold text-gray-900">
                  {stats?.active_projects || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Proyectos Completados:</span>
                <span className="font-semibold text-gray-900">
                  {stats?.completed_projects || 0}
                </span>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${stats?.total_projects ? (stats.completed_projects / stats.total_projects) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Progreso de proyectos completados
                </p>
              </div>
            </div>
          </div>

          {/* Gastos recientes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Gastos Recientes
            </h3>
            <div className="space-y-3">
              {stats?.recent_expenses && stats.recent_expenses.length > 0 ? (
                stats.recent_expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {expense.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatShortDate(expense.date)} • {expense.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Receipt className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No hay gastos recientes</p>
                </div>
              )}
            </div>
            {stats?.recent_expenses && stats.recent_expenses.length > 5 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Ver todos los gastos →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Acciones Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group">
              <div className="text-center">
                <FolderOpen className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                  Nuevo Proyecto
                </span>
              </div>
            </button>
            
            <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors group">
              <div className="text-center">
                <Receipt className="h-8 w-8 text-gray-400 group-hover:text-green-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">
                  Registrar Gasto
                </span>
              </div>
            </button>
            
            <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors group">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 text-gray-400 group-hover:text-purple-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                  Ver Reportes
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
