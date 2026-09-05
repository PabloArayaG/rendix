import { useEffect, useState, useMemo, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FolderOpen,
  Receipt,
  AlertCircle,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Edit,
  CalendarRange,
  X,
  ChevronRight,
  Minus
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useDashboard } from '../hooks/useDashboard';
import { useProjects } from '../hooks/useProjects';
import { useAuthStore } from '../store/authStore';
import { useOrganizations } from '../hooks/useOrganizations';
import { formatCurrency, formatPercentage, formatShortDate, getMarginColor } from '../lib/utils';
import { getCategoryColor } from '../lib/categoryColors';
import { ExpenseModal } from '../components/expenses/ExpenseModal';
import { Expense } from '../types/database';
import { IncomeVsCostsChart, MonthlyExpensesTrendChart, ExpensesByCategoryChart } from '../components/charts';
import { openStorageFile } from '../lib/supabase';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const CATEGORY_LABELS: Record<string, string> = {
  materials: 'Materiales', labor: 'Mano de obra', equipment: 'Equipos',
  transport: 'Transporte', services: 'Servicios', permits: 'Permisos',
  utilities: 'Servicios básicos', insurance: 'Seguros', supplies: 'Insumos',
  subcontractors: 'Subcontratistas', tools: 'Herramientas', safety: 'Seguridad',
  administration: 'Administración', salary: 'Sueldos', food: 'Alimentación',
  accommodation: 'Alojamiento', fuel: 'Combustible', other: 'Otros', general: 'General',
};

/* ─── Component ────────────────────────────────────────────────────────────── */
export function DashboardBeta() {
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const { rawProjects, rawExpenses, loading, error, refetch } = useDashboard();
  const { projects } = useProjects();
  const activeOrganizationId = useAuthStore(s => s.activeOrganizationId);
  const { loading: loadingOrgs } = useOrganizations();

  const availableYears = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 4 }, (_, i) => cur - i);
  }, []);

  /* ── stats derivados (filtrado local instantáneo) ── */
  const stats = useMemo(() => {
    if (rawProjects.length === 0 && rawExpenses.length === 0) return null;

    let proj = rawProjects;
    let exp = rawExpenses;

    if (dateRange) {
      proj = rawProjects.filter(p => {
        const d = p.created_at.substring(0, 10);
        return d >= dateRange.from && d <= dateRange.to;
      });
      exp = rawExpenses.filter(e => e.date >= dateRange.from && e.date <= dateRange.to);
    } else if (selectedYear) {
      proj = rawProjects.filter(p => new Date(p.created_at).getFullYear() === selectedYear);
      exp = rawExpenses.filter(e => new Date(e.date).getFullYear() === selectedYear);
    }

    const totalProjects = proj.length;
    const activeProjects = proj.filter(p => p.status === 'in_progress' || p.status === 'active').length;
    const completedProjects = proj.filter(p => p.status === 'completed').length;
    const totalSales = proj.reduce((s, p) => s + p.sale_amount, 0);
    const totalCosts = proj.reduce((s, p) => s + p.real_cost, 0);
    const totalMargin = proj.reduce((s, p) => s + p.real_margin, 0);
    const marginPercentage = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0;

    // Top gastos por categoría
    const byCat: Record<string, number> = {};
    exp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const topCategories = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amount]) => ({ cat, amount, pct: totalCosts > 0 ? (amount / totalCosts) * 100 : 0 }));

    return {
      total_projects: totalProjects,
      active_projects: activeProjects,
      completed_projects: completedProjects,
      total_sales: totalSales,
      total_costs: totalCosts,
      total_margin: totalMargin,
      margin_percentage: marginPercentage,
      recent_expenses: exp.slice(0, 10),
      topCategories,
    };
  }, [rawProjects, rawExpenses, selectedYear, dateRange]);

  /* ── filtro por proyecto ── */
  const filteredStats = useMemo(() => {
    if (selectedProjectId === 'all') return stats;
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
      recent_expenses: stats.recent_expenses.filter(e => e.project_id === selectedProjectId),
      topCategories: stats.topCategories,
    };
  }, [stats, selectedProjectId, projects]);

  /* ── top proyectos por margen ── */
  const topProjects = useMemo(() => {
    return [...projects]
      .filter(p => p.sale_amount > 0)
      .map(p => ({ ...p, marginPct: (p.real_margin / p.sale_amount) * 100 }))
      .sort((a, b) => b.marginPct - a.marginPct)
      .slice(0, 5);
  }, [projects]);

  useEffect(() => { refetch(); }, []); // eslint-disable-line

  /* cerrar date picker al hacer clic afuera */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node))
        setShowDatePicker(false);
    };
    if (showDatePicker) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [showDatePicker]);

  const handleEditExpense = (expense: Expense) => { setSelectedExpense(expense); setShowEditExpenseModal(true); };
  const handleCloseEdit = () => { setSelectedExpense(undefined); setShowEditExpenseModal(false); };

  /* ─── estados de carga/error ─────────────────────────────────────── */
  if (loading) {
    return (
      <Layout title="Dashboard Beta" subtitle="Vista mejorada · cargando datos...">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </Layout>
    );
  }

  if (!loading && !loadingOrgs && !activeOrganizationId) {
    return (
      <Layout title="Dashboard Beta" subtitle="">
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 p-10 text-center">
          <Building2 className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
          <p className="text-yellow-800 dark:text-yellow-300 font-medium">No estás añadido en ninguna organización.</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard Beta" subtitle="">
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </Layout>
    );
  }

  const marginPct = filteredStats?.margin_percentage ?? 0;
  const completionPct = filteredStats?.total_projects
    ? Math.round((filteredStats.completed_projects / filteredStats.total_projects) * 100)
    : 0;

  /* ─── render ─────────────────────────────────────────────────────── */
  return (
    <Layout title="Dashboard Beta" subtitle="Resumen financiero de tu operación">
      <div className="space-y-6">

        {/* ── Filtros ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Años */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => { setSelectedYear(undefined); setDateRange(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !selectedYear && !dateRange
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            {availableYears.map(y => (
              <button
                key={y}
                onClick={() => { setSelectedYear(y); setDateRange(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedYear === y && !dateRange
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Calendario */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`p-2 rounded-xl transition-all ${
                dateRange
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <CalendarRange className="h-5 w-5" />
            </button>
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 z-50 w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Rango de fechas</span>
                  {dateRange && (
                    <button onClick={() => { setDateRange(null); setShowDatePicker(false); }} className="text-xs text-red-500 flex items-center gap-1">
                      <X className="h-3 w-3" /> Limpiar
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {(['from', 'to'] as const).map(key => (
                    <div key={key}>
                      <label className="block text-xs text-gray-400 mb-1">{key === 'from' ? 'Desde' : 'Hasta'}</label>
                      <input
                        type="date"
                        value={dateRange?.[key] || ''}
                        onChange={e => setDateRange(prev => ({
                          from: prev?.from || e.target.value,
                          to: prev?.to || e.target.value,
                          [key]: e.target.value,
                        }))}
                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => { setSelectedYear(undefined); setShowDatePicker(false); }}
                    disabled={!dateRange?.from || !dateRange?.to}
                    className="w-full py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {dateRange && (
            <span className="text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1.5 rounded-lg">
              {dateRange.from} → {dateRange.to}
            </span>
          )}

          {/* Selector proyecto */}
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="ml-auto px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer min-w-[220px]"
          >
            <option value="all">Todos los proyectos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.custom_id} – {p.name}</option>
            ))}
          </select>
        </div>

        {/* ── KPI cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Proyectos */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-md">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -right-1 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />
            <FolderOpen className="h-6 w-6 opacity-80 mb-3" />
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">Proyectos</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">{filteredStats?.total_projects ?? 0}</p>
            <div className="flex items-center gap-3 mt-2 text-xs opacity-80">
              <span>{filteredStats?.active_projects ?? 0} activos</span>
              <span>·</span>
              <span>{filteredStats?.completed_projects ?? 0} terminados</span>
            </div>
          </div>

          {/* Ingresos */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-md">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -right-1 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />
            <DollarSign className="h-6 w-6 opacity-80 mb-3" />
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">Ingresos</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{formatCurrency(filteredStats?.total_sales ?? 0)}</p>
            <p className="mt-2 text-xs opacity-80">Venta neta total</p>
          </div>

          {/* Costos */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-md">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -right-1 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />
            <Receipt className="h-6 w-6 opacity-80 mb-3" />
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">Costos</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{formatCurrency(filteredStats?.total_costs ?? 0)}</p>
            <p className="mt-2 text-xs opacity-80">Costo real acumulado</p>
          </div>

          {/* Margen */}
          <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-md ${
            marginPct >= 20
              ? 'bg-gradient-to-br from-violet-500 to-violet-600'
              : marginPct >= 10
              ? 'bg-gradient-to-br from-orange-500 to-orange-600'
              : 'bg-gradient-to-br from-red-500 to-red-600'
          }`}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -right-1 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />
            {marginPct >= 10
              ? <TrendingUp className="h-6 w-6 opacity-80 mb-3" />
              : <TrendingDown className="h-6 w-6 opacity-80 mb-3" />
            }
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">Margen</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{formatCurrency(filteredStats?.total_margin ?? 0)}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-white/20 rounded-full h-1.5">
                <div
                  className="bg-white h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, marginPct))}%` }}
                />
              </div>
              <span className="text-xs font-bold opacity-90 tabular-nums">{formatPercentage(marginPct)}</span>
            </div>
          </div>
        </div>

        {/* ── Fila principal ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Resumen financiero (ocupa 2 cols) */}
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Resumen Financiero</h3>
            <IncomeVsCostsChart
              totalSales={filteredStats?.total_sales ?? 0}
              totalCosts={filteredStats?.total_costs ?? 0}
              totalMargin={filteredStats?.total_margin ?? 0}
            />
          </div>

          {/* Panel lateral: salud + progreso */}
          <div className="space-y-4">
            {/* Salud financiera */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Salud Financiera</h3>
              <div className="space-y-3">
                {[
                  { label: 'Margen neto', value: formatPercentage(marginPct), color: getMarginColor(marginPct), pct: Math.max(0, Math.min(100, marginPct)) },
                  { label: 'Ejecución presupuesto', value: `${completionPct}%`, color: 'text-blue-600', pct: completionPct },
                  {
                    label: 'Proyectos activos',
                    value: `${filteredStats?.active_projects ?? 0} / ${filteredStats?.total_projects ?? 0}`,
                    color: 'text-gray-700 dark:text-gray-300',
                    pct: filteredStats?.total_projects ? Math.round(((filteredStats.active_projects) / filteredStats.total_projects) * 100) : 0
                  },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                      <span className={`font-semibold tabular-nums ${row.color}`}>{row.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top proyectos */}
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Top proyectos por margen</h3>
              <div className="space-y-2">
                {topProjects.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Sin datos</p>
                )}
                {topProjects.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => { window.location.hash = `/projects/${p.id}`; }}
                    className="w-full flex items-center gap-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 py-1.5 transition-colors group"
                  >
                    <span className="text-xs font-bold text-gray-400 w-4 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">{p.client}</p>
                    </div>
                    <span className={`text-xs font-bold tabular-nums shrink-0 ${getMarginColor(p.marginPct)}`}>
                      {p.marginPct.toFixed(1)}%
                    </span>
                    <ChevronRight className="h-3 w-3 text-gray-300 shrink-0 group-hover:text-gray-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Segunda fila ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Tendencia */}
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tendencia de Gastos</h3>
            <MonthlyExpensesTrendChart projectId={selectedProjectId} />
          </div>

          {/* Top categorías */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Top categorías de gasto</h3>
            {!stats?.topCategories?.length ? (
              <p className="text-xs text-gray-400 italic">Sin gastos registrados</p>
            ) : (
              <div className="space-y-3">
                {stats.topCategories.map(({ cat, amount, pct }) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getCategoryColor(cat)}`}>
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(amount)}</span>
                        <span className="text-xs text-gray-400 ml-1 tabular-nums">({pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                      <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <ExpensesByCategoryChart projectId={selectedProjectId} compact />
            </div>
          </div>
        </div>

        {/* ── Gastos recientes ─────────────────────────────────────── */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Gastos Recientes</h3>
              <p className="text-xs text-gray-400 mt-0.5">Últimos {filteredStats?.recent_expenses.length ?? 0} registros</p>
            </div>
          </div>

          {!filteredStats?.recent_expenses.length ? (
            <div className="py-12 text-center">
              <Receipt className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No hay gastos en este período</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {/* Header */}
              <div className="grid grid-cols-[1fr_120px_100px_90px_60px] gap-x-4 px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/50">
                <div>Descripción</div>
                <div>Proyecto</div>
                <div>Fecha</div>
                <div className="text-right">Monto</div>
                <div className="text-center">Acción</div>
              </div>
              {filteredStats.recent_expenses.map(expense => (
                <div
                  key={expense.id}
                  className="grid grid-cols-[1fr_120px_100px_90px_60px] gap-x-4 px-5 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{expense.description}</p>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border mt-0.5 ${getCategoryColor(expense.category)}`}>
                      {CATEGORY_LABELS[expense.category] || expense.category}
                    </span>
                  </div>
                  <div>
                    {expense.projects ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {expense.projects.custom_id}
                      </span>
                    ) : <Minus className="h-3 w-3 text-gray-300" />}
                  </div>
                  <div className="text-xs text-gray-500">{formatShortDate(expense.date)}</div>
                  <div className="text-right text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                    {formatCurrency(expense.net_amount)}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleEditExpense(expense)}
                      className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Editar"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    {expense.receipt_url && (
                      <button
                        onClick={() => { void openStorageFile(expense.receipt_url!); }}
                        className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Ver comprobante"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Indicadores de tendencia ──────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Rentabilidad',
              value: formatPercentage(marginPct),
              icon: marginPct >= 10 ? ArrowUpRight : ArrowDownRight,
              positive: marginPct >= 10,
              sub: marginPct >= 20 ? 'Excelente' : marginPct >= 10 ? 'Buena' : 'Mejorable',
            },
            {
              label: 'Proyectos activos',
              value: `${filteredStats?.active_projects ?? 0}`,
              icon: FolderOpen,
              positive: true,
              sub: `de ${filteredStats?.total_projects ?? 0} totales`,
            },
            {
              label: 'Gasto promedio',
              value: filteredStats?.recent_expenses.length
                ? formatCurrency(filteredStats.recent_expenses.reduce((s, e) => s + e.amount, 0) / filteredStats.recent_expenses.length)
                : '$0',
              icon: Receipt,
              positive: true,
              sub: 'por registro reciente',
            },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  card.positive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <Icon className={`h-5 w-5 ${card.positive ? 'text-green-600' : 'text-red-500'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{card.label}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{card.value}</p>
                  <p className="text-xs text-gray-400">{card.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      <ExpenseModal
        isOpen={showEditExpenseModal}
        onClose={handleCloseEdit}
        expense={selectedExpense}
        onSuccess={() => { refetch(); handleCloseEdit(); }}
      />
    </Layout>
  );
}
