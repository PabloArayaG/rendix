import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Building2
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { ProjectModal } from '../components/projects/ProjectModal';
import { useProjects } from '../hooks/useProjects';
import { Project } from '../types/database';
import { 
  formatCurrency, 
  formatShortDate, 
  getStatusColor, 
  getMarginColor 
} from '../lib/utils';

export function Projects() {
  const { projects, loading, error, refetch } = useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();

  // Filtrar proyectos
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.custom_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  const handleProjectClick = (projectId: string) => {
    window.location.hash = `/projects/${projectId}`;
  };

  const ProjectCard = ({ project }: { project: Project }) => {
    const marginPercentage = project.sale_amount > 0 
      ? (project.real_margin / project.sale_amount) * 100 
      : 0;

    return (
      <div 
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleProjectClick(project.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                    {project.custom_id}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
              </div>
            </div>
            
            <p className="text-gray-600 mb-3">{project.client}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Venta</p>
                <p className="font-semibold text-gray-900">{formatCurrency(project.sale_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Costo Real</p>
                <p className="font-semibold text-gray-900">{formatCurrency(project.real_cost)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Margen Real</p>
                <p className={`font-semibold ${getMarginColor(marginPercentage)}`}>
                  {formatCurrency(project.real_margin)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">% Margen</p>
                <p className={`font-semibold ${getMarginColor(marginPercentage)}`}>
                  {marginPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <StatusBadge status={project.status} />
              <p className="text-sm text-gray-500">
                {project.start_date && formatShortDate(project.start_date)}
              </p>
            </div>
          </div>
          
          <div className="ml-4">
            <div className="relative">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </button>
              {/* TODO: Dropdown menu */}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout title="Proyectos" subtitle="Gestiona todos tus proyectos de construcción">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Proyectos" subtitle="Gestiona todos tus proyectos de construcción">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Proyectos" subtitle="Gestiona todos tus proyectos de construcción">
      <div className="space-y-6">
        {/* Header con búsqueda y filtros */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar proyectos, clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-3 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[140px]"
            >
              <option value="all">Todos los estados</option>
              <option value="in_progress">En Proceso</option>
              <option value="completed">Terminados</option>
            </select>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proyecto
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-xl font-semibold text-gray-900">{projects.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <Building2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">En Proceso</p>
                <p className="text-xl font-semibold text-gray-900">
                  {projects.filter(p => p.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <Building2 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Terminados</p>
                <p className="text-xl font-semibold text-gray-900">
                  {projects.filter(p => p.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <Building2 className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(projects.reduce((sum, p) => sum + p.sale_amount, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de proyectos */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {projects.length === 0 ? 'No hay proyectos' : 'No se encontraron proyectos'}
            </h3>
            <p className="text-gray-500 mb-6">
              {projects.length === 0 
                ? 'Comienza creando tu primer proyecto de construcción'
                : 'Intenta cambiar los filtros de búsqueda'
              }
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Proyecto
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear/editar proyecto */}
      <ProjectModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedProject(undefined);
        }}
        project={selectedProject}
        onSuccess={() => {
          console.log('onSuccess llamado desde Projects.tsx'); // Debug
          refetch();
          setShowCreateModal(false);
          setSelectedProject(undefined);
        }}
      />
    </Layout>
  );
}
