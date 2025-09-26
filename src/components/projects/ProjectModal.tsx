import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, DollarSign } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import { Project, CreateProjectDTO } from '../../types/database';

const projectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  client: z.string().min(1, 'El cliente es requerido'),
  sale_amount: z.number().min(1, 'El monto de venta debe ser mayor a 0'),
  projected_cost: z.number().min(0, 'El costo proyectado debe ser positivo'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  purchase_order: z.string().optional(),
  hes: z.string().optional(),
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
  const { createProject, updateProject } = useProjects();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      client: '',
      sale_amount: 0,
      projected_cost: 0,
      start_date: '',
      end_date: '',
      purchase_order: '',
      hes: '',
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
        name: project.name,
        description: project.description || '',
        client: project.client,
        sale_amount: project.sale_amount,
        projected_cost: project.projected_cost,
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        purchase_order: project.purchase_order || '',
        hes: project.hes || '',
        notes: project.notes || '',
      });
    } else {
      reset({
        name: '',
        description: '',
        client: '',
        sale_amount: 0,
        projected_cost: 0,
        start_date: '',
        end_date: '',
        purchase_order: '',
        hes: '',
        notes: '',
      });
    }
  }, [project, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setLoading(true);
      setError('');

      console.log('Datos del formulario:', data); // Debug

      const projectData: CreateProjectDTO = {
        name: data.name,
        description: data.description || undefined,
        client: data.client,
        sale_amount: data.sale_amount,
        projected_cost: data.projected_cost,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        purchase_order: data.purchase_order || undefined,
        hes: data.hes || undefined,
        notes: data.notes || undefined,
        tags: [],
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {project ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Información Básica</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Proyecto *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Construcción Edificio ABC"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <input
                  {...register('client')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Constructora XYZ S.A."
                />
                {errors.client && (
                  <p className="mt-1 text-sm text-red-600">{errors.client.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción detallada del proyecto..."
              />
            </div>
          </div>

          {/* Información financiera */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Información Financiera</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto de Venta (CLP) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('sale_amount', { valueAsNumber: true })}
                    type="number"
                    step="1"
                    min="0"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                {errors.sale_amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.sale_amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo Proyectado (CLP) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('projected_cost', { valueAsNumber: true })}
                    type="number"
                    step="1"
                    min="0"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                {errors.projected_cost && (
                  <p className="mt-1 text-sm text-red-600">{errors.projected_cost.message}</p>
                )}
              </div>
            </div>

            {/* Mostrar cálculo de margen en tiempo real */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Margen Proyectado</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Margen:</span>
                  <span className="font-semibold ml-2">
                    {new Intl.NumberFormat('es-CL', { 
                      style: 'currency', 
                      currency: 'CLP',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(projectedMargin)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Porcentaje:</span>
                  <span className="font-semibold ml-2">
                    {marginPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fechas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Fechas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Inicio
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('start_date')}
                    type="date"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Finalización
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('end_date')}
                    type="date"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {errors.end_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Documentos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orden de Compra
                </label>
                <input
                  {...register('purchase_order')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: OC-2024-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HES (Hoja de Entrada en Servicio)
                </label>
                <input
                  {...register('hes')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: HES-2024-001"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas Adicionales
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notas adicionales sobre el proyecto..."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {project ? 'Actualizando...' : 'Creando...'}
                </div>
              ) : (
                project ? 'Actualizar Proyecto' : 'Crear Proyecto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
