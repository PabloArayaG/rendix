import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, DollarSign, Building2, FileText, AlertTriangle } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import { Project, CreateProjectDTO, PROJECT_STATUSES } from '../../types/database';
import { Button, Card, CardContent, Badge, Tooltip } from '../ui';
import { formatDateForInput, parseInputDate } from '../../lib/utils';

const projectSchema = z.object({
  custom_id: z.string()
    .min(1, 'El ID del proyecto es requerido')
    .max(50, 'El ID no puede exceder 50 caracteres')
    .regex(/^[A-Za-z0-9\-_\.]+$/, 'Solo se permiten letras, números, guiones y puntos'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  client: z.string().min(1, 'El cliente es requerido'),
  sale_amount: z.number().min(1, 'El monto de venta debe ser mayor a 0'),
  projected_cost: z.number().min(0, 'El costo proyectado debe ser positivo'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  purchase_order: z.string().optional(),
  hes: z.string().optional(),
  sale_invoice: z.string().optional(),
  status: z.enum(['in_progress', 'completed']).optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["end_date"],
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  onSuccess?: () => void;
}

export function ProjectModal({ isOpen, onClose, project, onSuccess }: ProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { createProject, updateProject, validateCustomId, canEditProject } = useProjects();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      custom_id: '',
      name: '',
      description: '',
      client: '',
      sale_amount: 0,
      projected_cost: 0,
      start_date: '',
      end_date: '',
      purchase_order: '',
      hes: '',
      sale_invoice: '',
      status: 'in_progress',
      notes: '',
    },
  });

  // Calcular margen proyectado en tiempo real
  const saleAmount = watch('sale_amount') || 0;
  const projectedCost = watch('projected_cost') || 0;
  const projectedMargin = saleAmount - projectedCost;
  const marginPercentage = saleAmount > 0 ? (projectedMargin / saleAmount) * 100 : 0;

  useEffect(() => {
    if (project) {
      reset({
        custom_id: project.custom_id,
        name: project.name,
        description: project.description || '',
        client: project.client,
        sale_amount: project.sale_amount,
        projected_cost: project.projected_cost,
        start_date: formatDateForInput(project.start_date),
        end_date: formatDateForInput(project.end_date),
        purchase_order: project.purchase_order || '',
        hes: project.hes || '',
        sale_invoice: project.sale_invoice || '',
        status: project.status,
        notes: project.notes || '',
      });
    } else {
      reset({
        custom_id: '',
        name: '',
        description: '',
        client: '',
        sale_amount: 0,
        projected_cost: 0,
        start_date: '',
        end_date: '',
        purchase_order: '',
        hes: '',
        sale_invoice: '',
        status: 'in_progress',
        notes: '',
      });
    }
  }, [project, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setLoading(true);
      setError('');

      // Validar que el custom_id sea único (solo para proyectos nuevos o si cambió)
      if (!project || data.custom_id !== project.custom_id) {
        const isUnique = await validateCustomId(data.custom_id, project?.id);
        if (!isUnique) {
          setError('Ya existe un proyecto con ese ID. Por favor, elige otro.');
          setLoading(false);
          return;
        }
      }

      console.log('Datos del formulario:', data); // Debug

      const projectData: CreateProjectDTO = {
        custom_id: data.custom_id,
        name: data.name,
        description: data.description || undefined,
        client: data.client,
        sale_amount: data.sale_amount,
        projected_cost: data.projected_cost,
        start_date: parseInputDate(data.start_date || '') || undefined,
        end_date: parseInputDate(data.end_date || '') || undefined,
        purchase_order: data.purchase_order || undefined,
        hes: data.hes || undefined,
        sale_invoice: data.sale_invoice || undefined,
        notes: data.notes || undefined,
        tags: [],
      };

      // Si es edición, incluir status
      if (project && data.status) {
        (projectData as any).status = data.status;
      };

      console.log('Datos a enviar:', projectData); // Debug

      if (project) {
        console.log('Actualizando proyecto existente...'); // Debug
        await updateProject(project.id, projectData);
      } else {
        console.log('Creando nuevo proyecto...'); // Debug
        const result = await createProject(projectData);
        console.log('Proyecto creado:', result); // Debug
      }

      console.log('Operación exitosa, ejecutando callbacks...'); // Debug
      onSuccess?.();
      // No llamar onClose() ni reset() aquí porque onSuccess ya lo maneja
    } catch (err) {
      console.error('Error en onSubmit:', err); // Debug
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    reset();
    setError('');
  };

  if (!isOpen) return null;

  const isEditing = !!project;
  const canEdit = !project || canEditProject(project);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isEditing ? 'Modifica la información del proyecto' : 'Completa los datos para crear un nuevo proyecto'}
              </p>
            </div>
          </div>
          <Tooltip content="Cerrar modal">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form id="project-form" onSubmit={handleSubmit(onSubmit)} className="p-6">
            {/* Alerts */}
            {error && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {isEditing && !canEdit && (
              <Card className="mb-6 border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <p className="text-yellow-800 text-sm">
                      Este proyecto está terminado. Solo se pueden editar documentos y notas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Basic Info */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información Básica</h3>
                  </div>

                  <div className="space-y-4">
                    {/* ID y Nombre en una fila */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          ID del Proyecto *
                        </label>
                        <input
                          {...register('custom_id')}
                          type="text"
                          disabled={isEditing && !canEdit}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Ej: 2024-001"
                        />
                        {errors.custom_id && (
                          <p className="mt-1 text-sm text-red-600">{errors.custom_id.message}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Solo letras, números, guiones y puntos
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Estado
                        </label>
                        {isEditing ? (
                          <select
                            {...register('status')}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {PROJECT_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="py-2">
                            <Badge variant="in_progress">En Proceso</Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nombre del Proyecto *
                      </label>
                      <input
                        {...register('name')}
                        type="text"
                        disabled={isEditing && !canEdit}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Ej: Construcción Edificio ABC"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cliente *
                      </label>
                      <input
                        {...register('client')}
                        type="text"
                        disabled={isEditing && !canEdit}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Ej: Constructora XYZ S.A."
                      />
                      {errors.client && (
                        <p className="mt-1 text-sm text-red-600">{errors.client.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Descripción
                      </label>
                      <textarea
                        {...register('description')}
                        rows={3}
                        disabled={isEditing && !canEdit}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                        placeholder="Descripción detallada del proyecto..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Financial & Additional Info */}
              <div className="space-y-6">
                {/* Financial Information */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información Financiera</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Monto de Venta (CLP) *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 dark:text-gray-400 text-sm">$</span>
                            </div>
                            <input
                              {...register('sale_amount', { valueAsNumber: true })}
                              type="number"
                              step="1"
                              min="0"
                              disabled={isEditing && !canEdit}
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed tabular-nums"
                              placeholder="0"
                            />
                          </div>
                          {errors.sale_amount && (
                            <p className="mt-1 text-sm text-red-600">{errors.sale_amount.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Costo Proyectado (CLP) *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 dark:text-gray-400 text-sm">$</span>
                            </div>
                            <input
                              {...register('projected_cost', { valueAsNumber: true })}
                              type="number"
                              step="1"
                              min="0"
                              disabled={isEditing && !canEdit}
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed tabular-nums"
                              placeholder="0"
                            />
                          </div>
                          {errors.projected_cost && (
                            <p className="mt-1 text-sm text-red-600">{errors.projected_cost.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Margin Preview */}
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <h4 className="text-sm font-medium text-blue-900 mb-3">Margen Proyectado</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-blue-700">Margen:</span>
                              <p className="font-semibold text-blue-900 tabular-nums">
                                {new Intl.NumberFormat('es-CL', { 
                                  style: 'currency', 
                                  currency: 'CLP',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(projectedMargin)}
                              </p>
                            </div>
                            <div>
                              <span className="text-blue-700">Porcentaje:</span>
                              <p className="font-semibold text-blue-900 tabular-nums">
                                {marginPercentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                {/* Dates & Documents */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fechas</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Fecha de Inicio
                        </label>
                        <input
                          {...register('start_date')}
                          type="date"
                          disabled={isEditing && !canEdit}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Fecha de Finalización
                        </label>
                        <input
                          {...register('end_date')}
                          type="date"
                          disabled={isEditing && !canEdit}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        {errors.end_date && (
                          <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Documentos</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Orden de Compra
                        </label>
                        <input
                          {...register('purchase_order')}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ej: OC-2024-001"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          HES (Hoja de Entrada en Servicio)
                        </label>
                        <input
                          {...register('hes')}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ej: HES-2024-001"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Factura de Venta
                        </label>
                        <input
                          {...register('sale_invoice')}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ej: FV-2024-001"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Full Width Notes Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notas Adicionales</h3>
                </div>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Notas adicionales sobre el proyecto..."
                />
              </CardContent>
            </Card>

          </form>
        </div>

        {/* Footer with Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isEditing && project?.status === 'completed' && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Proyecto terminado: edición limitada
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              loading={loading}
              disabled={loading}
              form="project-form"
            >
              {isEditing ? 'Actualizar Proyecto' : 'Crear Proyecto'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
