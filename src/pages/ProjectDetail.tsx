import { useState } from 'react';
import { 
  ArrowLeft,
  Plus, 
  Receipt,
  DollarSign,
  Building2,
  TrendingUp,
  TrendingDown,
  Edit,
  Search,
  Trash2
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { ExpenseModal } from '../components/expenses/ExpenseModal';
import { ProjectModal } from '../components/projects/ProjectModal';
import { ConfirmDialog } from '../components/ui';
import { useProject } from '../hooks/useProjects';
import { useExpenses } from '../hooks/useExpenses';
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from '../types/database';
import { 
  formatCurrency, 
  formatShortDate, 
  getMarginColor,
  getStatusColor,
  getExpenseStatusColor
} from '../lib/utils';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const { project, loading: projectLoading, error: projectError, refetch: refetchProject } = useProject(projectId);
  const { expenses, loading: expensesLoading, refetch: refetchExpenses, deleteExpense } = useExpenses(projectId);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtrar gastos
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Cálculos financieros
  const marginPercentage = project?.sale_amount && project.sale_amount > 0 
    ? (project.real_margin / project.sale_amount) * 100 
    : 0;

  const progressPercentage = project?.sale_amount && project.sale_amount > 0
    ? Math.min((project.real_cost / project.sale_amount) * 100, 100)
    : 0;

  const getCategoryLabel = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const getStatusLabel = (status: string) => {
    const stat = EXPENSE_STATUSES.find(s => s.value === status);
    return stat?.label || status;
  };

  const handleEditExpense = (expense: any) => {
    setSelectedExpense(expense);
    setShowEditExpenseModal(true);
  };

  const handleCloseEditExpenseModal = () => {
    setSelectedExpense(undefined);
    setShowEditExpenseModal(false);
  };

  const handleDeleteClick = (expense: any) => {
    setExpenseToDelete(expense);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteExpense(expenseToDelete.id);
      setShowDeleteConfirm(false);
      setExpenseToDelete(null);
      // Refrescar tanto los gastos como el proyecto para actualizar el resumen
      await Promise.all([refetchExpenses(), refetchProject()]);
    } catch (error) {
      console.error('Error eliminando gasto:', error);
      alert('Error al eliminar el gasto');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setExpenseToDelete(null);
  };

  const CategoryBadge = ({ category }: { category: string }) => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      {getCategoryLabel(category)}
    </span>
  );

  const ExpenseStatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getExpenseStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  );

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status === 'in_progress' && 'En Proceso'}
      {status === 'completed' && 'Terminado'}
      {/* Mantener compatibilidad con estados anteriores */}
      {status === 'active' && 'En Proceso'}
      {status === 'on_hold' && 'En Pausa'}
      {status === 'cancelled' && 'Cancelado'}
    </span>
  );

  if (projectLoading || expensesLoading) {
    return (
      <Layout title="Cargando..." subtitle="Obteniendo información del proyecto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (projectError || !project) {
    return (
      <Layout title="Error" subtitle="No se pudo cargar el proyecto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            {projectError || 'Proyecto no encontrado'}
          </p>
          <button
            onClick={onBack}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Volver a Proyectos
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title={project.name} 
      subtitle={`${project.custom_id} - ${project.client}`}
    >
      <div className="space-y-6">
        {/* Header con botón volver */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Proyectos
          </button>
          
          <div className="flex items-center space-x-3">
            <StatusBadge status={project.status} />
            <button 
              onClick={() => setShowEditModal(true)}
              className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar Proyecto
            </button>
          </div>
        </div>

        {/* Información del proyecto */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{project.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{project.client}</p>
                </div>
              </div>
              
              {project.description && (
                <p className="text-gray-700 mb-4">{project.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {project.start_date && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Fecha de inicio:</span>
                    <span className="ml-2 font-medium">{formatShortDate(project.start_date)}</span>
                  </div>
                )}
                {project.end_date && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Fecha de fin:</span>
                    <span className="ml-2 font-medium">{formatShortDate(project.end_date)}</span>
                  </div>
                )}
                {project.purchase_order && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">OC:</span>
                    <span className="ml-2 font-medium">{project.purchase_order}</span>
                  </div>
                )}
                {project.hes && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">HES:</span>
                    <span className="ml-2 font-medium">{project.hes}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Progreso visual */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Progreso del Proyecto</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Gasto vs Venta</span>
                    <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        progressPercentage > 90 ? 'bg-red-500' : 
                        progressPercentage > 70 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getMarginColor(marginPercentage)}`}>
                    {marginPercentage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Margen Real</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen financiero */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Venta Neto</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(project.sale_amount)}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Costo Neto</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(project.real_cost)}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Margen Real</p>
                <p className={`text-2xl font-bold ${getMarginColor(marginPercentage)}`}>
                  {formatCurrency(project.real_margin)}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Gastos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{expenses.length}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Sección de gastos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gastos del Proyecto ({expenses.length})
              </h3>
              
              <button
                onClick={() => setShowExpenseModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Gasto
              </button>
            </div>
            
            {/* Filtros para gastos */}
            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar gastos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas las categorías</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de gastos */}
          <div className="p-6">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {expenses.length === 0 ? 'No hay gastos registrados' : 'No se encontraron gastos'}
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {expenses.length === 0 
                    ? 'Comienza agregando el primer gasto de este proyecto'
                    : 'Intenta cambiar los filtros de búsqueda'
                  }
                </p>
                {expenses.length === 0 && (
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primer Gasto
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <Receipt className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{expense.description}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{formatShortDate(expense.date)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {expense.status && <ExpenseStatusBadge status={expense.status} />}
                                <button
                                  onClick={() => handleEditExpense(expense)}
                                  className="text-blue-400 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-blue-50"
                                  title="Editar gasto"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(expense)}
                                  className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                                  title="Eliminar gasto"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monto</p>
                            {expense.net_amount && expense.tax_amount ? (
                              <div className="space-y-0.5">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(expense.net_amount)}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  IVA (19%): {formatCurrency(expense.tax_amount)}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Total: {formatCurrency(expense.amount)}
                                </p>
                              </div>
                            ) : (
                              <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(expense.amount)}</p>
                            )}
                          </div>
                          {expense.supplier && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Proveedor</p>
                              <p className="text-sm text-gray-900 dark:text-white">{expense.supplier}</p>
                            </div>
                          )}
                          {(expense.document_number || expense.invoice_number) && (
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {expense.document_type === 'factura' ? 'Factura' : 
                                 expense.document_type === 'boleta' ? 'Boleta' : 'Documento'}
                              </p>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {expense.document_number || expense.invoice_number}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Categoría</p>
                            <CategoryBadge category={expense.category} />
                          </div>
                        </div>
                        
                        {expense.notes && (
                          <div className="bg-gray-50 rounded-md p-3 mt-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{expense.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      {expense.receipt_url && (
                        <div className="flex items-center ml-4">
                          <button
                            onClick={() => window.open(expense.receipt_url, '_blank')}
                            className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded-md hover:bg-blue-50"
                            title="Ver comprobante"
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para agregar gasto */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        defaultProjectId={projectId}
        onSuccess={() => {
          refetchExpenses();
          refetchProject(); // Actualizar resumen del proyecto
        }}
      />

      {/* Modal para editar proyecto */}
      <ProjectModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        project={project}
        onSuccess={() => {
          setShowEditModal(false);
          // Refrescar la página para mostrar los cambios
          window.location.reload();
        }}
      />

      {/* Modal para editar gasto */}
      <ExpenseModal
        isOpen={showEditExpenseModal}
        onClose={handleCloseEditExpenseModal}
        expense={selectedExpense}
        defaultProjectId={projectId}
        onSuccess={() => {
          refetchExpenses();
          refetchProject(); // Actualizar resumen del proyecto
          handleCloseEditExpenseModal();
        }}
      />

      {/* Modal de confirmación para eliminar gasto */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Eliminar Gasto"
        message="¿Estás seguro de eliminar el siguiente gasto?"
        itemName={expenseToDelete?.description}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={isDeleting}
      />
    </Layout>
  );
}
