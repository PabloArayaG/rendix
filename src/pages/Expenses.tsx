import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Receipt,
  Calendar,
  DollarSign,
  Tag
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { ExpenseModal } from '../components/expenses/ExpenseModal';
import { useExpenses } from '../hooks/useExpenses';
import { useProjects } from '../hooks/useProjects';
import { Expense } from '../types/database';
import { EXPENSE_CATEGORIES } from '../types/database';
import { 
  formatCurrency, 
  formatShortDate
} from '../lib/utils';

export function Expenses() {
  const { expenses, loading, error, refetch } = useExpenses();
  const { projects } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filtrar gastos
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesProject = projectFilter === 'all' || expense.project_id === projectFilter;
    
    return matchesSearch && matchesCategory && matchesProject;
  });

  const getCategoryLabel = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? `${project.custom_id} - ${project.name}` : 'Proyecto no encontrado';
  };

  const CategoryBadge = ({ category }: { category: string }) => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      {getCategoryLabel(category)}
    </span>
  );

  const ExpenseCard = ({ expense }: { expense: Expense }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Receipt className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{expense.description}</h3>
              <p className="text-sm text-gray-500">{getProjectName(expense.project_id)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Monto</p>
              {expense.net_amount && expense.tax_amount ? (
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(expense.net_amount)}
                  </p>
                  <p className="text-xs text-gray-600">
                    IVA (19%): {formatCurrency(expense.tax_amount)}
                  </p>
                  <p className="text-xs text-gray-600">
                    Total: {formatCurrency(expense.amount)}
                  </p>
                </div>
              ) : (
                <p className="text-xl font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha</p>
              <p className="font-semibold text-gray-900">{formatShortDate(expense.date)}</p>
            </div>
            {expense.supplier && (
              <div>
                <p className="text-sm text-gray-500">Proveedor</p>
                <p className="font-semibold text-gray-900">{expense.supplier}</p>
              </div>
            )}
            {expense.invoice_number && (
              <div>
                <p className="text-sm text-gray-500">Factura</p>
                <p className="font-semibold text-gray-900">{expense.invoice_number}</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <CategoryBadge category={expense.category} />
            {expense.receipt_url && (
              <div className="flex items-center text-sm text-blue-600">
                <Receipt className="h-4 w-4 mr-1" />
                Comprobante
              </div>
            )}
          </div>
          
          {expense.notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">{expense.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout title="Gastos" subtitle="Gestiona todos los gastos de tus proyectos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Gastos" subtitle="Gestiona todos los gastos de tus proyectos">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </Layout>
    );
  }

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyTotal = filteredExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      const currentDate = new Date();
      return expenseDate.getMonth() === currentDate.getMonth() && 
             expenseDate.getFullYear() === currentDate.getFullYear();
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <Layout title="Gastos" subtitle="Gestiona todos los gastos de tus proyectos">
      <div className="space-y-6">
        {/* Header con búsqueda y filtros */}
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar gastos, proveedores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Gasto
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-4">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.custom_id} - {project.name}
                </option>
              ))}
            </select>
            
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

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <Receipt className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Gastos</p>
                <p className="text-xl font-semibold text-gray-900">{expenses.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Monto Total</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Este Mes</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(monthlyTotal)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <Tag className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Categorías</p>
                <p className="text-xl font-semibold text-gray-900">
                  {new Set(expenses.map(e => e.category)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de gastos */}
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {expenses.length === 0 ? 'No hay gastos registrados' : 'No se encontraron gastos'}
            </h3>
            <p className="text-gray-500 mb-6">
              {expenses.length === 0 
                ? 'Comienza registrando tu primer gasto de proyecto'
                : 'Intenta cambiar los filtros de búsqueda'
              }
            </p>
            {expenses.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primer Gasto
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExpenses.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear/editar gasto */}
      <ExpenseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </Layout>
  );
}
