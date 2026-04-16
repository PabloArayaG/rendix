import { useState } from 'react';
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
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { ProjectModalBeta } from '../components/projects/ProjectModalBeta';
import { ConfirmDialog } from '../components/ui';
import { useProjects } from '../hooks/useProjects';
import { Project } from '../types/database';
import { formatCurrency, formatShortDate, getStatusColor, getMarginColor } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { useOrganizations } from '../hooks/useOrganizations';
import { Card, CardContent } from '../components/ui';

export function ProjectsBeta() {
  const { projects, loading, error, refetch, deleteProject } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);
  const { loading: loadingOrgs } = useOrganizations();

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.custom_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
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
    window.location.hash = `/projects-beta/${projectId}`;
  };

  const getMarginPct = (p: Project) =>
    p.sale_amount > 0 ? (p.real_margin / p.sale_amount) * 100 : 0;

  // Totales de la fila filtrada
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
      <Layout title="Proyectos Beta" subtitle="Vista compacta de proyectos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!loading && !loadingOrgs && !activeOrganizationId) {
    return (
      <Layout title="Proyectos Beta" subtitle="Vista compacta de proyectos">
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
      <Layout title="Proyectos Beta" subtitle="Vista compacta de proyectos">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Proyectos Beta" subtitle="Vista compacta · haz clic en una fila para expandir detalles">
      <div className="space-y-4">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Búsqueda */}
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

          <div className="flex items-center gap-3">
            {/* Segmented control estado */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'in_progress', label: 'En Proceso' },
                { value: 'completed', label: 'Terminados' },
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

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {/* Header de la tabla */}
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
                  <div key={project.id}>
                    {/* Fila principal */}
                    <div
                      className="grid grid-cols-[24px_1fr_140px_130px_130px_110px_110px_90px] gap-x-4 px-4 py-3 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                      onClick={e => handleViewDetail(project.id, e)}
                    >
                      {/* Toggle chevron — solo este expande, no navega */}
                      <div
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        onClick={e => { e.stopPropagation(); toggleRow(project.id); }}
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                        }
                      </div>

                      {/* Nombre + ID + cliente */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
                            {project.custom_id}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                            {project.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{project.client}</p>
                      </div>

                      {/* Estado */}
                      <div>
                        <StatusBadge status={project.status} />
                      </div>

                      {/* Venta Neta */}
                      <div className="text-right text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(project.sale_amount)}
                      </div>

                      {/* Costo Real */}
                      <div className="text-right text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                        {formatCurrency(project.real_cost)}
                      </div>

                      {/* Margen */}
                      <div className={`text-right text-sm font-semibold tabular-nums flex items-center justify-end gap-1 opacity-30 group-hover:opacity-100 transition-opacity ${getMarginColor(marginPct)}`}>
                        {isPositive
                          ? <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                          : <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                        }
                        {formatCurrency(project.real_margin)}
                      </div>

                      {/* % Margen */}
                      <div className={`text-right text-sm font-bold tabular-nums opacity-30 group-hover:opacity-100 transition-opacity ${getMarginColor(marginPct)}`}>
                        {marginPct.toFixed(1)}%
                      </div>

                      {/* Acciones */}
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
                          {/* Financiero proyectado */}
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

                          {/* Documentos */}
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

                          {/* Fechas */}
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

                          {/* Acciones rápidas */}
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

                        {/* Notas */}
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

          {/* Footer con totales */}
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

      {/* Modal crear */}
      <ProjectModalBeta
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setSelectedProject(undefined); }}
        onSuccess={() => { refetch(); setShowCreateModal(false); }}
      />

      {/* Modal editar */}
      <ProjectModalBeta
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedProject(undefined); }}
        project={selectedProject}
        onSuccess={() => { refetch(); setShowEditModal(false); setSelectedProject(undefined); }}
      />

      {/* Confirm eliminar */}
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
