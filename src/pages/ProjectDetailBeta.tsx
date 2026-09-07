import { useState, useMemo } from 'react';
import { useRef, useEffect } from 'react';
import {
  ArrowLeft, Plus, Search, Edit, Trash2,
  ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  DollarSign, Receipt, Building2, ExternalLink, Tag, X, FileDown, CalendarClock
} from 'lucide-react';
import { generateProjectPdf } from '../lib/generateProjectPdf';
import { Layout } from '../components/layout/Layout';
import { ExpenseModalBeta } from '../components/expenses/ExpenseModalBeta';
import { ProjectModalBeta } from '../components/projects/ProjectModalBeta';
import { ConfirmDialog, CopyButton } from '../components/ui';
import { ExpensesByCategoryChart } from '../components/charts/ExpensesByCategoryChart';
import { MonthlyExpensesTrendChart } from '../components/charts/MonthlyExpensesTrendChart';
import { useProject } from '../hooks/useProjects';
import { useExpenses } from '../hooks/useExpenses';
import { Expense, EXPENSE_CATEGORIES } from '../types/database';
import { getCategoryColor } from '../lib/categoryColors';
import { getCreditAlertClasses, getCreditAlertStatus } from '../lib/creditAlerts';
import { openStorageFile } from '../lib/supabase';
import {
  formatCurrency, formatShortDate,
  getMarginColor, getStatusColor
} from '../lib/utils';

interface ProjectDetailBetaProps {
  projectId: string;
  onBack: () => void;
}

const STATUS_PAYMENT: Record<string, { label: string; dot: string }> = {
  provision: { label: 'Provisión', dot: 'bg-yellow-400' },
  paid:      { label: 'Pagado',    dot: 'bg-green-400'  },
  credit:    { label: 'Crédito',   dot: 'bg-blue-400'   },
  advance:   { label: 'Anticipo',  dot: 'bg-purple-400' },
};

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map(c => [c.value, c.label])
);

export function ProjectDetailBeta({ projectId, onBack }: ProjectDetailBetaProps) {
  const { project, loading: projLoading, error: projError, refetch: refetchProject } = useProject(projectId);
  const { expenses, loading: expLoading, refetch: refetchExpenses, deleteExpense } = useExpenses(projectId);

  const [searchTerm, setSearchTerm]           = useState('');
  const [categoryFilter, setCategoryFilter]   = useState('all');
  const [statusFilter, setStatusFilter]       = useState('all');
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const catDropdownRef                        = useRef<HTMLDivElement>(null);
  const [expandedRows, setExpandedRows]       = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showEditModal, setShowEditModal]     = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting]           = useState(false);
  const [expenseSummaryView, setExpenseSummaryView] = useState<'summary' | 'categories'>('summary');

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    const matchSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        e.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat    = categoryFilter === 'all' || e.category === categoryFilter;
    const creditAlert = getCreditAlertStatus(e);
    const matchSt = statusFilter === 'all'
      || e.status === statusFilter
      || (statusFilter === 'credit_due_soon' && ['urgent', 'upcoming'].includes(creditAlert?.level || ''))
      || (statusFilter === 'credit_overdue' && creditAlert?.level === 'overdue');
    return matchSearch && matchCat && matchSt;
  }), [expenses, searchTerm, categoryFilter, statusFilter]);

  const totalNet   = filteredExpenses.reduce((s, e) => s + (e.net_amount || 0), 0);
  const totalIva   = filteredExpenses.reduce((s, e) => s + (e.tax_amount || 0), 0);
  const totalBruto = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const projectTotals = useMemo(() => expenses.reduce((totals, expense) => ({
    net: totals.net + (expense.net_amount || 0),
    iva: totals.iva + (expense.tax_amount || 0),
    total: totals.total + (expense.amount || 0),
  }), { net: 0, iva: 0, total: 0 }), [expenses]);

  const marginPct = project && project.sale_amount > 0
    ? (project.real_margin / project.sale_amount) * 100 : 0;
  const progressPct = project && project.sale_amount > 0
    ? Math.min((project.real_cost / project.sale_amount) * 100, 100) : 0;

  const toggleRow = (id: string) =>
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleEdit = (expense: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedExpense(expense);
    setShowEditModal(true);
  };

  const handleDeleteClick = (expense: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
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
      await Promise.all([refetchExpenses(), refetchProject()]);
    } catch { alert('Error al eliminar el gasto'); }
    finally { setIsDeleting(false); }
  };

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node))
        setShowCatDropdown(false);
    };
    if (showCatDropdown) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [showCatDropdown]);

  const activeCatLabel = categoryFilter === 'all'
    ? null
    : EXPENSE_CATEGORIES.find(c => c.value === categoryFilter)?.label;

  /* ── estados carga ─────────────────────────────────────────────────── */
  if (projLoading || expLoading) {
    return (
      <Layout title="Cargando..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      </Layout>
    );
  }

  if (projError || !project) {
    return (
      <Layout title="Error" subtitle="">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6">
          <p className="text-red-700 mb-4">{projError || 'Proyecto no encontrado'}</p>
          <button onClick={onBack} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            Volver
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={project.name} subtitle={`${project.custom_id} · ${project.client}`}>
      <div className="space-y-5">

        {/* ── Breadcrumb + acciones ─────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Proyectos
          </button>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
              {project.status === 'in_progress' ? 'En Proceso' : 'Terminado'}
            </span>
            <button
              onClick={() => setShowEditProject(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar Proyecto
            </button>
            {project.status === 'completed' && (
              <button
                onClick={() => generateProjectPdf(project, expenses)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors shadow-sm"
              >
                <FileDown className="h-3.5 w-3.5" />
                Descargar PDF
              </button>
            )}
          </div>
        </div>

        {/* ── KPI financiero ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Venta Neta', value: formatCurrency(project.sale_amount), icon: DollarSign, valueColor: 'text-gray-900 dark:text-white' },
            { label: 'Costo Real', value: formatCurrency(project.real_cost),   icon: Receipt,    valueColor: 'text-gray-900 dark:text-white' },
            {
              label: 'Margen Real',
              value: formatCurrency(project.real_margin),
              icon: marginPct >= 0 ? TrendingUp : TrendingDown,
              valueColor: getMarginColor(marginPct),
            },
            { label: 'N° Gastos', value: String(expenses.length), icon: Receipt, valueColor: 'text-gray-900 dark:text-white' },
          ].map(({ label, value, icon: Icon, valueColor }) => (
            <div key={label} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
              </div>
              <p className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Progreso + docs ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Barra de progreso + margen */}
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ejecución Financiera</h3>
              <span className={`text-lg font-bold tabular-nums ${getMarginColor(marginPct)}`}>{marginPct.toFixed(1)}% margen</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Gasto vs Venta', pct: progressPct, color: progressPct > 90 ? 'bg-red-500' : progressPct > 70 ? 'bg-yellow-500' : 'bg-blue-500' },
                { label: 'Margen', pct: Math.max(0, Math.min(100, marginPct)), color: marginPct >= 20 ? 'bg-green-500' : marginPct >= 10 ? 'bg-yellow-500' : 'bg-red-500' },
              ].map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-200">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {project.description && (
              <p className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">{project.description}</p>
            )}
          </div>

          {/* Info del proyecto */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              Datos del Proyecto
            </h3>
            {[
              { label: 'ID',      val: project.custom_id },
              { label: 'Cliente', val: project.client },
              project.start_date ? { label: 'Inicio',  val: formatShortDate(project.start_date) } : null,
              project.end_date   ? { label: 'Término', val: formatShortDate(project.end_date)   } : null,
            ].filter((item): item is { label: string; val: string } => item !== null).map(({ label, val }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                {label === 'ID'
                  ? <CopyButton value={val} />
                  : <span className="font-medium text-gray-900 dark:text-white text-right">{val}</span>}
              </div>
            ))}

            {/* Documentos del proyecto */}
            {(project.purchase_order || project.hes || project.sale_invoice) && (
              <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Documentos</p>
                {([
                  { label: 'OC',            num: project.purchase_order, url: project.purchase_order_url },
                  { label: 'HES',           num: project.hes,            url: project.hes_url            },
                  { label: 'Factura venta', num: project.sale_invoice,   url: project.sale_invoice_url   },
                ] as const).filter(d => d.num || d.url).map(({ label, num, url }) => (
                  <div key={label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-400 shrink-0">{label}</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {num && <span className="font-medium text-gray-900 dark:text-white truncate">{num}</span>}
                      {url && (
                        <button
                          onClick={() => { void openStorageFile(url); }}
                          title={`Ver ${label}`}
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tabla de gastos + Analytics ──────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Tabla gastos (2 cols) */}
          <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">

            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Gastos · <span className="text-gray-400 font-normal">{filteredExpenses.length} registros</span>
                </h3>
                <button
                  onClick={() => setShowAddModal(true)}
                  data-tour="add-expense-btn"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar Gasto
                </button>
              </div>
              <div className="flex gap-3 flex-wrap">
                {/* Búsqueda */}
                <div className="relative flex-1 min-w-32">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {/* Filtro categoría — dropdown custom */}
                <div className="relative" ref={catDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowCatDropdown(v => !v)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      categoryFilter !== 'all'
                        ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    {activeCatLabel || 'Categoría'}
                    {categoryFilter !== 'all'
                      ? <X className="h-3 w-3 ml-0.5" onClick={e => { e.stopPropagation(); setCategoryFilter('all'); setShowCatDropdown(false); }} />
                      : <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCatDropdown ? 'rotate-180' : ''}`} />
                    }
                  </button>

                  {showCatDropdown && (
                    <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-30 overflow-hidden">
                      <div className="py-1 max-h-64 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setCategoryFilter('all'); setShowCatDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            categoryFilter === 'all'
                              ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          Todas las categorías
                        </button>
                        {EXPENSE_CATEGORIES.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => { setCategoryFilter(c.value); setShowCatDropdown(false); }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                              categoryFilter === c.value
                                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            {categoryFilter === c.value && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />}
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filtro estado — segmented control */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 max-w-full overflow-x-auto">
                  {[
                    { value: 'all',       label: 'Todos'     },
                    { value: 'provision', label: 'Provisión' },
                    { value: 'paid',      label: 'Pagado'    },
                    { value: 'credit',    label: 'Crédito'   },
                    { value: 'credit_due_soon', label: 'Por vencer' },
                    { value: 'credit_overdue', label: 'Vencido' },
                    { value: 'advance',   label: 'Anticipo'  },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatusFilter(opt.value)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                        statusFilter === opt.value
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {opt.label}
                      {opt.value !== 'all' && (
                        <span className={`ml-1 tabular-nums text-xs ${statusFilter === opt.value ? 'text-orange-500' : 'text-gray-400'}`}>
                          {expenses.filter(e => {
                            const alert = getCreditAlertStatus(e);
                            if (opt.value === 'credit_due_soon') return ['urgent', 'upcoming'].includes(alert?.level || '');
                            if (opt.value === 'credit_overdue') return alert?.level === 'overdue';
                            return e.status === opt.value;
                          }).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Header tabla */}
            <div className="grid grid-cols-[20px_1fr_90px_80px_90px_70px] gap-x-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
              <div />
              <div>Descripción</div>
              <div>Categoría</div>
              <div className="text-right">Neto</div>
              <div>Estado</div>
              <div className="text-center">Acc.</div>
            </div>

            {/* Filas */}
            {filteredExpenses.length === 0 ? (
              <div className="py-14 text-center">
                <Receipt className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-400">
                  {expenses.length === 0 ? 'Sin gastos registrados' : 'Sin resultados para estos filtros'}
                </p>
                {expenses.length === 0 && (
                  <button onClick={() => setShowAddModal(true)} className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium">
                    + Agregar el primer gasto
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {filteredExpenses.map(expense => {
                  const isOpen = expandedRows.has(expense.id);
                  const payStatus = STATUS_PAYMENT[expense.status] || { label: expense.status, dot: 'bg-gray-400' };
                  const creditAlert = getCreditAlertStatus(expense);
                  return (
                    <div key={expense.id}>
                      {/* Fila compacta */}
                      <div
                        className="grid grid-cols-[20px_1fr_90px_80px_90px_70px] gap-x-3 px-4 py-3 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                        onClick={() => toggleRow(expense.id)}
                      >
                        <div className="text-gray-300 dark:text-gray-600">
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </div>

                        {/* Descripción + fecha */}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{expense.description}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-xs text-gray-400">{formatShortDate(expense.date)}</p>
                            {creditAlert && (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${getCreditAlertClasses(creditAlert.level)}`}>
                                <CalendarClock className="h-2.5 w-2.5" />{creditAlert.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Categoría badge */}
                        <div>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getCategoryColor(expense.category)}`}>
                            {CATEGORY_LABELS[expense.category] || expense.category}
                          </span>
                        </div>

                        {/* Neto */}
                        <div className="text-right text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                          {formatCurrency(expense.net_amount || expense.amount)}
                        </div>

                        {/* Estado pago */}
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${payStatus.dot}`} />
                          <span className="text-xs text-gray-600 dark:text-gray-300">{payStatus.label}</span>
                        </div>

                        {/* Acciones hover */}
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => handleEdit(expense, e)}
                            className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={e => handleDeleteClick(expense, e)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Panel expandido */}
                      {isOpen && (
                        <div className="bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700/50 px-10 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {/* Montos */}
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Montos</p>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Neto</span>
                                  <span className="tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(expense.net_amount || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">IVA</span>
                                  <span className="tabular-nums font-medium text-gray-900 dark:text-white">{formatCurrency(expense.tax_amount || 0)}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1">
                                  <span className="text-gray-500 font-medium">Total</span>
                                  <span className="tabular-nums font-bold text-orange-600 dark:text-orange-400">{formatCurrency(expense.amount)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Documento */}
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Documento</p>
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Tipo</span>
                                  <span className="font-medium text-gray-900 dark:text-white capitalize">{expense.document_type || '—'}</span>
                                </div>
                                {(expense.document_number || expense.invoice_number) && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Número</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{expense.document_number || expense.invoice_number}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Proveedor */}
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Proveedor</p>
                              <p className="font-medium text-gray-900 dark:text-white">{expense.supplier || '—'}</p>
                              {expense.status === 'credit' && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-400">Vencimiento</p>
                                  <p className={`mt-1 inline-flex px-2 py-0.5 rounded border text-xs font-medium ${getCreditAlertClasses(creditAlert?.level || 'missing')}`}>
                                    {expense.credit_due_date ? formatShortDate(expense.credit_due_date) : 'Fecha pendiente'}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Acciones */}
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Acciones</p>
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={e => handleEdit(expense, e)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors"
                                >
                                  <Edit className="h-3 w-3" /> Editar
                                </button>
                                {expense.receipt_url && (
                                  <button
                                    onClick={e => { e.stopPropagation(); void openStorageFile(expense.receipt_url!); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                  >
                                    <ExternalLink className="h-3 w-3" /> Ver comprobante
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {expense.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-400 mb-1">Notas</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{expense.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer totales */}
            {filteredExpenses.length > 0 && (
              <div className="grid grid-cols-[20px_1fr_90px_80px_90px_70px] gap-x-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700">
                <div /><div />
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Tag className="h-3 w-3" />{filteredExpenses.length} reg.
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Neto</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(totalNet)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">IVA</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatCurrency(totalIva)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums">{formatCurrency(totalBruto)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Analytics */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Gastos del proyecto</h4>
                <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setExpenseSummaryView('summary')}
                    className={`rounded-md px-2.5 py-1.5 transition-colors ${expenseSummaryView === 'summary' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    Resumen
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseSummaryView('categories')}
                    className={`rounded-md px-2.5 py-1.5 transition-colors ${expenseSummaryView === 'categories' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    Categorías
                  </button>
                </div>
              </div>

              {expenseSummaryView === 'summary' ? (
                <div className="py-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Total neto</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(projectTotals.net)}
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div>
                      <p className="text-xs text-gray-400">IVA</p>
                      <p className="mt-1 text-base font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{formatCurrency(projectTotals.iva)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="mt-1 text-base font-semibold text-orange-600 dark:text-orange-400 tabular-nums">{formatCurrency(projectTotals.total)}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-xs text-gray-400">{expenses.length} {expenses.length === 1 ? 'gasto registrado' : 'gastos registrados'}</p>
                </div>
              ) : (
                <ExpensesByCategoryChart projectId={projectId} compact />
              )}
            </div>
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Tendencia Mensual</h4>
              <MonthlyExpensesTrendChart projectId={projectId} compact />
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <ExpenseModalBeta
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        defaultProjectId={projectId}
        onSuccess={() => { refetchExpenses(); refetchProject(); }}
      />
      <ExpenseModalBeta
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedExpense(undefined); }}
        expense={selectedExpense}
        defaultProjectId={projectId}
        onSuccess={() => { refetchExpenses(); refetchProject(); setShowEditModal(false); setSelectedExpense(undefined); }}
      />
      <ProjectModalBeta
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        project={project}
        onSuccess={() => { setShowEditProject(false); refetchProject(); }}
      />
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setExpenseToDelete(null); }}
        onConfirm={handleConfirmDelete}
        title="Eliminar Gasto"
        message="¿Eliminar este gasto? Esta acción no se puede deshacer."
        itemName={expenseToDelete?.description}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={isDeleting}
      />
    </Layout>
  );
}
