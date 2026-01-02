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
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);
  const { loading: loadingOrgs } = useOrganizations();

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
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600',
    };

    const changeColors = {
      positive: 'text-green-600',
      negative: 'text-red-600',
      neutral: 'text-gray-600',
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{title}</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
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
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColors[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout title="Dashboard" subtitle="Resumen general de tu actividad financiera">
      <div className="space-y-8">
        {/* KPIs Grid - Jerarquía principal */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <KPICard
            title="Total Proyectos"
            value={stats?.total_projects.toString() || '0'}
            icon={FolderOpen}
            color="blue"
          />
          <KPICard
            title="Ingresos Totales"
            value={formatCurrency(stats?.total_sales || 0)}
            icon={DollarSign}
            color="green"
          />
          <KPICard
            title="Costos Totales"
            value={formatCurrency(stats?.total_costs || 0)}
            icon={Receipt}
            color="yellow"
          />
          <KPICard
            title="Margen Total"
            value={formatCurrency(stats?.total_margin || 0)}
            icon={TrendingUp}
            color="purple"
          />
        </div>

        {/* Sección de gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico: Proyectos por Estado */}
          <CollapsibleCard title="Estado de Proyectos" defaultExpanded={true}>
            <ProjectsStatusChart 
              activeProjects={stats?.active_projects || 0}
              completedProjects={stats?.completed_projects || 0}
            />
          </CollapsibleCard>

          {/* Gráfico: Ingresos vs Costos */}
          <CollapsibleCard title="Resumen Financiero" defaultExpanded={true}>
            <IncomeVsCostsChart 
              totalSales={stats?.total_sales || 0}
              totalCosts={stats?.total_costs || 0}
              totalMargin={stats?.total_margin || 0}
            />
          </CollapsibleCard>

          {/* Gráfico: Gastos por Categoría */}
          <CollapsibleCard title="Distribución de Gastos" defaultExpanded={true}>
            <ExpensesByCategoryChart />
          </CollapsibleCard>

          {/* Gráfico: Tendencia de Gastos */}
          <CollapsibleCard title="Tendencia de Gastos" defaultExpanded={true}>
            <MonthlyExpensesTrendChart />
          </CollapsibleCard>
        </div>

        {/* Sección de análisis detallado */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Rendimiento Financiero */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Rendimiento Financiero
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Margen Total:</span>
                  <span className={`font-semibold tabular-nums ${getMarginColor(stats?.margin_percentage || 0)}`}>
                    {formatPercentage(stats?.margin_percentage || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Proyectos En Proceso:</span>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {stats?.active_projects || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Proyectos Terminados:</span>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {stats?.completed_projects || 0}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progreso de finalización</span>
                    <span className="tabular-nums">
                      {stats?.total_projects ? Math.round((stats.completed_projects / stats.total_projects) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
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
                <h3 className="text-lg font-semibold text-gray-900">
                  Gastos Recientes
                </h3>
                <p className="text-sm text-gray-600 mt-1">
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
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {expense.description}
                              </p>
                              <p className="text-xs text-gray-500">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Acciones Rápidas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => window.location.hash = '/projects'}
                className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                    Nuevo Proyecto
                  </h4>
                  <p className="text-xs text-gray-500">
                    Crear y configurar un nuevo proyecto
                  </p>
                </div>
              </button>
              
              <button 
                onClick={() => window.location.hash = '/projects'}
                className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-green-200 transition-colors">
                  <Receipt className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-green-900">
                    Ver Proyectos
                  </h4>
                  <p className="text-xs text-gray-500">
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
