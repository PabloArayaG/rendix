import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  CalendarRange,
  ArrowUpDown,
  X,
  Check,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { ProjectModalBeta } from '../components/projects/ProjectModalBeta';
import { ConfirmDialog, CopyButton } from '../components/ui';
import { useProjects } from '../hooks/useProjects';
import { Project } from '../types/database';
import { formatCurrency, formatShortDate, getStatusColor, getMarginColor } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { useOrganizations } from '../hooks/useOrganizations';
import { Card, CardContent } from '../components/ui';

type SortField = 'date_desc' | 'date_asc' | 'margin_desc' | 'margin_asc' | 'name_asc';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'date_desc',   label: 'Más recientes primero'  },
  { value: 'date_asc',    label: 'Más antiguos primero'   },
  { value: 'margin_desc', label: 'Mayor margen primero'   },
  { value: 'margin_asc',  label: 'Menor margen primero'   },
  { value: 'name_asc',    label: 'Nombre A → Z'           },
];

export function Projects() {
  const { projects, loading, error, refetch, deleteProject } = useProjects();
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy]             = useState<SortField>('date_desc');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop, setShowSortDrop]     = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const sortDropRef   = useRef<HTMLDivElement>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);
  const { loading: loadingOrgs } = useOrganizations();

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node))
        setShowDatePicker(false);
    };
    if (showDatePicker) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [showDatePicker]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (sortDropRef.current && !sortDropRef.current.contains(e.target as Node))
        setShowSortDrop(false);
    };
    if (showSortDrop) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [showSortDrop]);

  const hasDateFilter = dateFrom || dateTo;

  const filteredProjects = projects
    .filter(project => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.custom_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const projectDate = (project.start_date || project.created_at || '').substring(0, 10);
      const matchesFrom = !dateFrom || projectDate >= dateFrom;
      const matchesTo   = !dateTo   || projectDate <= dateTo;
      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    })
    .sort((a, b) => {
      const getMarginPct = (p: Project) => p.sale_amount > 0 ? p.real_margin / p.sale_amount : 0;
      const dateA = (a.start_date || a.created_at || '');
      const dateB = (b.start_date || b.created_at || '');
      switch (sortBy) {
        case 'date_desc':   return dateB.localeCompare(dateA);
        case 'date_asc':    return dateA.localeCompare(dateB);
        case 'margin_desc': return getMarginPct(b) - getMarginPct(a);
        case 'margin_asc':  return getMarginPct(a) - getMarginPct(b);
        case 'name_asc':    return a.name.localeCompare(b.name);
        default:            return 0;
      }
    });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setShowEditModal(true);
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
      refetch();
    } catch {
      alert('Error al eliminar el proyecto');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewDetail = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.hash = `/projects/${projectId}`;
  };

  const getMarginPct = (p: Project) =>
    p.sale_amount > 0 ? (p.real_margin / p.sale_amount) * 100 : 0;

  const totalSales = filteredProjects.reduce((s, p) => s + p.sale_amount, 0);
  const totalCosts = filteredProjects.reduce((s, p) => s + p.real_cost, 0);
  const totalMargin = filteredProjects.reduce((s, p) => s + p.real_margin, 0);

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status === 'in_progress' ? 'En Proceso' : 'Terminado'}
    </span>
  );

  if (loading) {
    return (
      <Layout title="Proyectos" subtitle="Vista compacta de proyectos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!loading && !loadingOrgs && !activeOrganizationId) {
    return (
      <Layout title="Proyectos" subtitle="Vista compacta de proyectos">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Building2 className="h-10 w-10 text-yellow-600" />
              <p className="text-sm text-yellow-800">No estás añadido en ninguna organización.</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Proyectos" subtitle="Vista compacta de proyectos">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Proyectos" subtitle="Haz clic en una fila para expandir detalles">
      <div className="space-y-4">

        {/* Toolbar */}
        <div className="flex flex-col gap-3" data-tour="projects-toolbar">
          {/* Fila 1: búsqueda + botón nuevo */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, cliente o ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-colors text-sm font-medium shrink-0"
              data-tour="new-project-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </button>
          </div>

          {/* Fila 2: filtros + ordenamiento */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Estado */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {[
                { value: 'all',         label: 'Todos'      },
                { value: 'in_progress', label: 'En Proceso' },
                { value: 'completed',   label: 'Terminados' },
              ].map(opt => {
                const count = opt.value === 'all'
                  ? projects.length
                  : projects.filter(p => p.status === opt.value).length;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      statusFilter === opt.value
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                    <span className={`ml-1.5 text-xs tabular-nums ${statusFilter === opt.value ? 'text-orange-500' : 'text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filtro por fecha */}
            <div ref={datePickerRef} className="relative">
              <button
                onClick={() => setShowDatePicker(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  hasDateFilter
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                <CalendarRange className="h-4 w-4" />
                {hasDateFilter ? `${dateFrom || '…'} → ${dateTo || '…'}` : 'Por fecha'}
                {hasDateFilter && (
                  <span
                    onClick={e => { e.stopPropagation(); setDateFrom(''); setDateTo(''); }}
                    className="ml-1 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 w-64">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Filtrar por fecha de inicio</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Desde</label>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Hasta</label>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                    </div>
                    <button onClick={() => setShowDatePicker(false)}
                      className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors">
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ordenamiento */}
            <div ref={sortDropRef} className="relative ml-auto">
              <button
                onClick={() => setShowSortDrop(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gray-400 transition-colors"
              >
                <ArrowUpDown className="h-4 w-4" />
                {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
              </button>
              {showSortDrop && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden w-52">
                  <div className="py-1">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setShowSortDrop(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                          sortBy === opt.value
                            ? 'bg-orange-50 dark:bg-orange-900/20 text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="flex-1">{opt.label}</span>
                        {sortBy === opt.value && <Check className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chip de fecha activa */}
          {hasDateFilter && (
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              Mostrando proyectos con inicio entre {dateFrom || '…'} y {dateTo || '…'}
              {' '}· {filteredProjects.length} resultado{filteredProjects.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm" data-tour="projects-table">
          <div className="grid grid-cols-[24px_1fr_140px_130px_130px_110px_110px_90px] gap-x-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <div />
            <div>Proyecto</div>
            <div>Estado</div>
            <div className="text-right">Venta Neta</div>
            <div className="text-right">Costo Real</div>
            <div className="text-right">Margen</div>
            <div className="text-right">% Margen</div>
            <div className="text-center">Acciones</div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {projects.length === 0 ? 'No hay proyectos' : 'Sin resultados para esta búsqueda'}
              </p>
              {projects.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Proyecto
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredProjects.map(project => {
                const isExpanded = expandedRows.has(project.id);
                const marginPct = getMarginPct(project);
                const isPositive = project.real_margin >= 0;

                return (
                  <div key={project.id} data-project-id={project.id}>
                    <div
                      className="grid grid-cols-[24px_1fr_140px_130px_130px_110px_110px_90px] gap-x-4 px-4 py-3 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                      onClick={e => handleViewDetail(project.id, e)}
                    >
                      <div
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        onClick={e => { e.stopPropagation(); toggleRow(project.id); }}
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                        }
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CopyButton value={project.custom_id} variant="badge" />
                          <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {project.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{project.client}</p>
                      </div>

                      <div>
                        <StatusBadge status={project.status} />
                      </div>

                      <div className="text-right text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(project.sale_amount)}
                      </div>

                      <div className="text-right text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                        {formatCurrency(project.real_cost)}
                      </div>

                      <div className={`text-right text-sm font-semibold tabular-nums flex items-center justify-end gap-1 opacity-30 group-hover:opacity-100 transition-opacity ${getMarginColor(marginPct)}`}>
                        {isPositive
                          ? <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                          : <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                        }
                        {formatCurrency(project.real_margin)}
                      </div>

                      <div className={`text-right text-sm font-bold tabular-nums opacity-30 group-hover:opacity-100 transition-opacity ${getMarginColor(marginPct)}`}>
                        {marginPct.toFixed(1)}%
                      </div>

                      <div className="flex items-center justify-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => handleEdit(project, e)}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={e => handleDeleteClick(project, e)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Panel expandido */}
                    {isExpanded && (
                      <div className="bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700/50 px-12 py-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Proyectado</p>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Costo proyect.</span>
                                <span className="font-medium text-gray-900 dark:text-white tabular-nums">{formatCurrency(project.projected_cost)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Margen proyect.</span>
                                <span className="font-medium text-gray-900 dark:text-white tabular-nums">{formatCurrency(project.projected_margin)}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Documentos</p>
                            <div className="space-y-1.5">
                              {project.purchase_order && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">OC</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{project.purchase_order}</span>
                                </div>
                              )}
                              {project.hes && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">HES</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{project.hes}</span>
                                </div>
                              )}
                              {project.invoice && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">Factura</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{project.invoice}</span>
                                </div>
                              )}
                              {!project.purchase_order && !project.hes && !project.invoice && (
                                <p className="text-xs text-gray-400 italic">Sin documentos</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Fechas</p>
                            <div className="space-y-1.5">
                              {project.start_date && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">Inicio</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{formatShortDate(project.start_date)}</span>
                                </div>
                              )}
                              {project.end_date && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">Término</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{formatShortDate(project.end_date)}</span>
                                </div>
                              )}
                              {!project.start_date && !project.end_date && (
                                <p className="text-xs text-gray-400 italic">Sin fechas definidas</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Acciones</p>
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={e => handleViewDetail(project.id, e)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver detalle completo
                              </button>
                              <button
                                onClick={e => handleEdit(project, e)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Editar proyecto
                              </button>
                            </div>
                          </div>
                        </div>

                        {project.notes && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notas</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{project.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filteredProjects.length > 0 && (
            <div className="grid grid-cols-[24px_1fr_140px_130px_130px_110px_110px_90px] gap-x-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700">
              <div />
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {filteredProjects.length} proyecto{filteredProjects.length !== 1 ? 's' : ''}
              </div>
              <div />
              <div className="text-right text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                {formatCurrency(totalSales)}
              </div>
              <div className="text-right text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                {formatCurrency(totalCosts)}
              </div>
              <div className={`text-right text-sm font-bold tabular-nums flex items-center justify-end gap-1 ${getMarginColor(totalSales > 0 ? (totalMargin / totalSales) * 100 : 0)}`}>
                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                {formatCurrency(totalMargin)}
              </div>
              <div className={`text-right text-sm font-bold tabular-nums ${getMarginColor(totalSales > 0 ? (totalMargin / totalSales) * 100 : 0)}`}>
                {totalSales > 0 ? ((totalMargin / totalSales) * 100).toFixed(1) : '0.0'}%
              </div>
              <div />
            </div>
          )}
        </div>
      </div>

      <ProjectModalBeta
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setSelectedProject(undefined); }}
        onSuccess={() => { refetch(); setShowCreateModal(false); }}
      />

      <ProjectModalBeta
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedProject(undefined); }}
        project={selectedProject}
        onSuccess={() => { refetch(); setShowEditModal(false); setSelectedProject(undefined); }}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setProjectToDelete(null); }}
        onConfirm={handleConfirmDelete}
        title="Eliminar Proyecto"
        message="¿Estás seguro de eliminar este proyecto? Se eliminarán también todos sus gastos."
        itemName={projectToDelete?.name}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={isDeleting}
      />
    </Layout>
  );
}
