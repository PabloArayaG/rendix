import { useEffect, useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  FolderOpen, 
  Receipt, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Edit,
  Building2
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatPercentage, formatShortDate, getMarginColor } from '../lib/utils';
import { Card, CardContent, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCellNumber, EmptyState, CollapsibleCard } from '../components/ui';
import { ExpenseModal } from '../components/expenses/ExpenseModal';
import { Expense } from '../types/database';
import { useAuthStore } from '../store/authStore';
import { useOrganizations } from '../hooks/useOrganizations';
import { useProjects } from '../hooks/useProjects';
import { 
  ProjectsStatusChart, 
  IncomeVsCostsChart, 
  ExpensesByCategoryChart, 
  MonthlyExpensesTrendChart 
} from '../components/charts';

export function Dashboard() {
  const { stats, loading, error, refetch } = useDashboard();
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);
  const { loading: loadingOrgs } = useOrganizations();
  const { projects } = useProjects();

  useEffect(() => {
    refetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowEditExpenseModal(true);
  };

  const handleCloseEditModal = () => {
    setSelectedExpense(undefined);
    setShowEditExpenseModal(false);
  };

  // Loading skeleton
  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="Resumen general de tu actividad financiera">
        <div className="space-y-6">
          {/* KPI Skeletons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Content Skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Mostrar mensaje si no hay organización activa
  if (!loading && !loadingOrgs && !activeOrganizationId) {
    return (
      <Layout title="Dashboard" subtitle="Resumen general de tu actividad financiera">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Building2 className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  No estás añadido en ninguna organización
                </h3>
                <p className="text-sm text-yellow-800 max-w-md">
                  Para comenzar a usar Rendix, necesitas ser agregado a una organización. 
                  Contacta al administrador de tu equipo para que te agregue a una organización existente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard" subtitle="Resumen general de tu actividad financiera">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">Error: {error}</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  // KPI Card component with new design system
  const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'blue',
    change,
    changeType = 'neutral'
  }: {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color?: 'blue' | 'green' | 'yellow' | 'purple';
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
  }) => {
    const iconColors = {
      blue: 'text-gray-400 dark:text-gray-500',
      green: 'text-gray-400 dark:text-gray-500',
      yellow: 'text-gray-400 dark:text-gray-500',
      purple: 'text-gray-400 dark:text-gray-500',
    };

    const changeColors = {
      positive: 'text-green-600 dark:text-green-400',
      negative: 'text-red-600 dark:text-red-400',
      neutral: 'text-gray-600 dark:text-gray-400',
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
              {change && (
                <div className="flex items-center mt-2">
                  {changeType === 'positive' ? (
                    <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                  ) : changeType === 'negative' ? (
                    <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                  ) : null}
                  <span className={`text-sm font-medium ${changeColors[changeType]}`}>
                    {change}
                  </span>
                </div>
              )}
            </div>
            <div className={`flex items-center justify-center ${iconColors[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Filtrar stats por proyecto si hay uno seleccionado
  const filteredStats = selectedProjectId === 'all' ? stats : (() => {
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project || !stats) return null;
    
    return {
      ...stats,
      total_projects: 1,
      active_projects: project.status === 'in_progress' ? 1 : 0,
      completed_projects: project.status === 'completed' ? 1 : 0,
      total_sales: project.sale_amount,
      total_costs: project.real_cost,
      total_margin: project.real_margin,
      margin_percentage: project.sale_amount > 0 ? (project.real_margin / project.sale_amount) * 100 : 0,
      recent_expenses: stats.recent_expenses.filter(e => (e as any).project_id === selectedProjectId),
    };
  })();

  return (
    <Layout title="Dashboard" subtitle="Resumen general de tu actividad financiera">
      <div className="space-y-8">
        {/* Selector de Proyecto */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtrar por proyecto:
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 hover:border-orange-400 cursor-pointer min-w-[280px]"
          >
            <option value="all" className="bg-white dark:bg-gray-900">📊 Todos los proyectos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id} className="bg-white dark:bg-gray-900">
                {project.custom_id} - {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* KPIs Grid - Jerarquía principal */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <KPICard
            title="Total Proyectos"
            value={filteredStats?.total_projects.toString() || '0'}
            icon={FolderOpen}
            color="blue"
          />
          <KPICard
            title="Ingresos Totales"
            value={formatCurrency(filteredStats?.total_sales || 0)}
            icon={DollarSign}
            color="green"
          />
          <KPICard
            title="Costos Totales"
            value={formatCurrency(filteredStats?.total_costs || 0)}
            icon={Receipt}
            color="yellow"
          />
          <KPICard
            title="Margen Total"
            value={formatCurrency(filteredStats?.total_margin || 0)}
            icon={TrendingUp}
            color="purple"
          />
        </div>

        {/* Sección de gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico: Proyectos por Estado */}
          <div key="projects-status-chart">
            <CollapsibleCard title="Estado de Proyectos" defaultExpanded={true}>
              <ProjectsStatusChart 
                activeProjects={filteredStats?.active_projects || 0}
                completedProjects={filteredStats?.completed_projects || 0}
              />
            </CollapsibleCard>
          </div>

          {/* Gráfico: Ingresos vs Costos */}
          <div key="income-costs-chart">
            <CollapsibleCard title="Resumen Financiero" defaultExpanded={true}>
              <IncomeVsCostsChart 
                totalSales={filteredStats?.total_sales || 0}
                totalCosts={filteredStats?.total_costs || 0}
                totalMargin={filteredStats?.total_margin || 0}
              />
            </CollapsibleCard>
          </div>

          {/* Gráfico: Gastos por Categoría */}
          <div key="expenses-category-chart">
            <CollapsibleCard title="Distribución de Gastos" defaultExpanded={true}>
              <ExpensesByCategoryChart projectId={selectedProjectId} />
            </CollapsibleCard>
          </div>

          {/* Gráfico: Tendencia de Gastos */}
          <div key="monthly-trend-chart">
            <CollapsibleCard title="Tendencia de Gastos" defaultExpanded={true}>
              <MonthlyExpensesTrendChart projectId={selectedProjectId} />
            </CollapsibleCard>
          </div>
        </div>

        {/* Sección de análisis detallado */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Rendimiento Financiero */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Rendimiento Financiero
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Margen Total:</span>
                  <span className={`font-semibold tabular-nums ${getMarginColor(stats?.margin_percentage || 0)}`}>
                    {formatPercentage(stats?.margin_percentage || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Proyectos En Proceso:</span>
                  <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                    {stats?.active_projects || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Proyectos Terminados:</span>
                  <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                    {stats?.completed_projects || 0}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Progreso de finalización</span>
                    <span className="tabular-nums">
                      {stats?.total_projects ? Math.round((stats.completed_projects / stats.total_projects) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${stats?.total_projects ? (stats.completed_projects / stats.total_projects) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gastos Recientes - Nueva tabla estructurada */}
          <Card className="xl:col-span-2">
            <CardContent className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Gastos Recientes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Listado completo de todos los gastos registrados
                </p>
              </div>
              
              {stats?.recent_expenses && stats.recent_expenses.length > 0 ? (
                <div className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="w-20 text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recent_expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="text-sm text-gray-500">
                            {formatShortDate(expense.date)}
                          </TableCell>
                          <TableCell>
                            {(expense as any).projects && (
                              <Badge variant="custom_id" size="sm">
                                {(expense as any).projects.custom_id}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {expense.description}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {expense.category}
                              </p>
                            </div>
                          </TableCell>
                          <TableCellNumber className="font-semibold">
                            {formatCurrency(expense.net_amount)}
                          </TableCellNumber>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleEditExpense(expense)}
                                className="text-blue-400 hover:text-blue-600 transition-colors"
                                title="Editar gasto"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {expense.receipt_url && (
                                <button 
                                  onClick={() => window.open(expense.receipt_url, '_blank')}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Ver comprobante"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  icon={Receipt}
                  title="No hay gastos recientes"
                  description="Los gastos aparecerán aquí una vez que empieces a registrarlos en tus proyectos."
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Acciones Rápidas - Rediseñadas */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Acciones Rápidas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => window.location.hash = '/projects'}
                className="flex items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mr-4 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                  <FolderOpen className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-orange-900 dark:group-hover:text-orange-300">
                    Nuevo Proyecto
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Crear y configurar un nuevo proyecto
                  </p>
                </div>
              </button>
              
              <button 
                onClick={() => window.location.hash = '/projects'}
                className="flex items-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-4 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                  <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-green-900 dark:group-hover:text-green-300">
                    Ver Proyectos
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Gestionar proyectos y gastos
                  </p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para editar gasto */}
      <ExpenseModal
        isOpen={showEditExpenseModal}
        onClose={handleCloseEditModal}
        expense={selectedExpense}
        onSuccess={() => {
          refetch();
          handleCloseEditModal();
        }}
      />
    </Layout>
  );
}
