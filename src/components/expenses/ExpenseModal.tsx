import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, DollarSign, Upload, FileText, Lock } from 'lucide-react';
import { useExpenses } from '../../hooks/useExpenses';
import { useProjects } from '../../hooks/useProjects';
import { Expense, CreateExpenseDTO, EXPENSE_CATEGORIES, EXPENSE_STATUSES, DOCUMENT_TYPES } from '../../types/database';
import { Button } from '../ui';
import { formatDateForInput, normalizeExpenseData } from '../../lib/utils';

// Límites actualizados para DECIMAL(15,2)
const MAX_AMOUNT = 9999999999999.99; // 9.9 billones
const MIN_AMOUNT = 0.01; // 1 centavo

const expenseSchema = z.object({
  project_id: z.string().min(1, 'El proyecto es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  net_amount: z.number()
    .min(MIN_AMOUNT, 'El monto neto debe ser mayor a $0')
    .max(MAX_AMOUNT, 'El monto neto no puede exceder $9.999.999.999.999'),
  tax_amount: z.number()
    .min(0, 'El IVA no puede ser negativo')
    .max(MAX_AMOUNT, 'El IVA no puede exceder $9.999.999.999.999'),
  amount: z.number()
    .min(MIN_AMOUNT, 'El monto total debe ser mayor a $0')
    .max(MAX_AMOUNT, 'El monto total no puede exceder $9.999.999.999.999'),
  category: z.string().min(1, 'La categoría es requerida'),
  date: z.string().min(1, 'La fecha es requerida'),
  status: z.enum(['provision', 'paid', 'credit', 'advance'], {
    required_error: 'El estado es requerido',
  }),
  document_type: z.enum(['boleta', 'factura'], {
    required_error: 'El tipo de documento es requerido',
  }),
  document_number: z.string().optional(),
  supplier: z.string().optional(),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense;
  onSuccess?: () => void;
  defaultProjectId?: string;
}

export function ExpenseModal({ isOpen, onClose, expense, onSuccess, defaultProjectId }: ExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const { createExpense, updateExpense } = useExpenses();
  const { projects } = useProjects();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      project_id: defaultProjectId || '',
      description: '',
      net_amount: 0,
      tax_amount: 0,
      amount: 0,
      category: 'general',
      date: formatDateForInput(new Date()),
      status: 'provision',
      document_type: 'boleta',
      document_number: '',
      supplier: '',
      invoice_number: '',
      notes: '',
    },
  });

  // Observar cambios en net_amount para calcular IVA automáticamente
  const netAmount = watch('net_amount') || 0;
  const taxAmount = watch('tax_amount') || 0;
  const totalAmount = netAmount + taxAmount;

  // Función para calcular IVA del 19%
  const calculateTax = (netAmount: number) => {
    return Math.round(netAmount * 0.19);
  };

  // Función para calcular neto desde total
  const calculateNet = (totalAmount: number) => {
    return Math.round(totalAmount / 1.19);
  };

  useEffect(() => {
    if (expense) {
      reset({
        project_id: expense.project_id,
        description: expense.description,
        net_amount: expense.net_amount || calculateNet(expense.amount),
        tax_amount: expense.tax_amount || (expense.amount - calculateNet(expense.amount)),
        amount: expense.amount,
        category: expense.category,
        date: formatDateForInput(expense.date),
        status: expense.status || 'provision',
        document_type: expense.document_type || 'boleta',
        document_number: expense.document_number || '',
        supplier: expense.supplier || '',
        invoice_number: expense.invoice_number || '',
        notes: expense.notes || '',
      });
    } else {
      reset({
        project_id: defaultProjectId || '',
        description: '',
        net_amount: 0,
        tax_amount: 0,
        amount: 0,
        category: 'general',
        date: formatDateForInput(new Date()),
        supplier: '',
        invoice_number: '',
        notes: '',
      });
    }
  }, [expense, defaultProjectId, reset]);

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      setLoading(true);
      setError('');

      // Log de debugging para identificar problemas
      console.log('🔍 GERARDO DEBUG - Browser Info:', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.NumberFormat().resolvedOptions().locale,
      });

      const rawExpenseData: CreateExpenseDTO = {
        project_id: data.project_id,
        description: data.description,
        net_amount: data.net_amount,
        tax_amount: data.tax_amount,
        amount: data.net_amount + data.tax_amount,
        category: data.category as any,
        date: data.date,
        status: data.status as any,
        document_type: data.document_type as any,
        document_number: data.document_number || undefined,
        supplier: data.supplier || undefined,
        invoice_number: data.invoice_number || undefined,
        notes: data.notes || undefined,
        tags: [],
      };

      // Normalizar datos antes de enviar para evitar problemas regionales
      const expenseData = normalizeExpenseData(rawExpenseData) as CreateExpenseDTO;

      if (expense) {
        await updateExpense(expense.id, expenseData, receiptFile || undefined);
      } else {
        await createExpense(expenseData, receiptFile || undefined);
      }

      onSuccess?.();
      onClose();
      reset();
      setReceiptFile(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('🔍 GERARDO DEBUG - Error completo:', {
        error: err,
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    reset();
    setError('');
    setReceiptFile(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Solo se permiten archivos JPG, PNG o PDF');
        return;
      }
      
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo no puede ser mayor a 5MB');
        return;
      }
      
      setReceiptFile(file);
      setError('');
    }
  };

  if (!isOpen) return null;

  const isEditing = !!expense;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700/50 w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Minimalista */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-700/50">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Editar Gasto' : 'Nuevo Gasto'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isEditing ? 'Actualiza la información del gasto' : 'Completa los campos a continuación'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form id="expense-form" onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Información básica */}
          <div className="space-y-5">
            <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Información del Gasto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Proyecto *
                </label>
                {defaultProjectId ? (
                  // Si hay un proyecto preseleccionado, mostrarlo como readonly
                  <div className="relative">
                    <div className="w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md bg-gray-50 text-gray-700 dark:text-gray-300 flex items-center">
                      <Lock className="absolute left-3 h-4 w-4 text-gray-400" />
                      {(() => {
                        const project = projects.find(p => p.id === defaultProjectId);
                        return project ? `${project.custom_id} - ${project.name}` : 'Proyecto no encontrado';
                      })()}
                    </div>
                    <input
                      {...register('project_id')}
                      type="hidden"
                      value={defaultProjectId}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Gasto asociado al proyecto actual
                    </p>
                  </div>
                ) : (
                  // Si no hay proyecto preseleccionado, mostrar selector
                  <select
                    {...register('project_id')}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-transparent dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500 transition-all"
                  >
                    <option value="">Seleccionar proyecto</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.custom_id} - {project.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.project_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.project_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría *
                </label>
                <select
                  {...register('category')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado *
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {EXPENSE_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción *
              </label>
              <input
                {...register('description')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Compra de cemento para cimentación"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto Neto (CLP) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('net_amount', { 
                      valueAsNumber: true,
                      onChange: (e) => {
                        const net = parseFloat(e.target.value) || 0;
                        const tax = calculateTax(net);
                        setValue('tax_amount', tax);
                        setValue('amount', net + tax);
                      }
                    })}
                    type="number"
                    step="1"
                    min="0"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                {errors.net_amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.net_amount.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    IVA 19% (CLP) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      {...register('tax_amount', { 
                        valueAsNumber: true,
                        onChange: (e) => {
                          const tax = parseFloat(e.target.value) || 0;
                          setValue('amount', netAmount + tax);
                        }
                      })}
                      type="number"
                      step="1"
                      min="0"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  {errors.tax_amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.tax_amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total (CLP)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      {...register('amount', { valueAsNumber: true })}
                      type="number"
                      step="1"
                      min="0"
                      readOnly
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md bg-gray-50 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                      value={totalAmount}
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>
              </div>

              {/* Mostrar cálculo visual */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-5">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Resumen de Montos</h4>
                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">Neto:</span>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">${netAmount.toLocaleString('es-CL')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">IVA (19%):</span>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">${taxAmount.toLocaleString('es-CL')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">Total:</span>
                    <p className="font-bold text-orange-600 dark:text-orange-400 mt-1">${totalAmount.toLocaleString('es-CL')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('date')}
                    type="date"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="space-y-5">
            <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Información Adicional</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Documento *
                </label>
                <select
                  {...register('document_type')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.document_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.document_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {watch('document_type') === 'factura' ? 'Número de Factura' : 'Número de Boleta'}
                </label>
                <input
                  {...register('document_number')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={watch('document_type') === 'factura' ? 'Ej: FAC-2024-001' : 'Ej: BOL-2024-001'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Proveedor
                </label>
                <input
                  {...register('supplier')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Ferretería ABC S.L."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notas adicionales sobre el gasto..."
              />
            </div>
          </div>

          {/* Comprobante */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Comprobante</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subir Comprobante (Opcional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 dark:border-gray-600 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label
                      htmlFor="receipt-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Subir archivo</span>
                      <input
                        id="receipt-upload"
                        name="receipt-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">o arrastra y suelta</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, PDF hasta 5MB
                  </p>
                  
                  {receiptFile && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm text-blue-800 font-medium">
                          {receiptFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReceiptFile(null)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {expense?.receipt_url && !receiptFile && (
                    <div className="mt-3 p-3 bg-green-50 rounded-md">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm text-green-800 font-medium">
                          Comprobante actual: {expense.receipt_filename}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          </form>
        </div>

        {/* Footer with Actions */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
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
              form="expense-form"
            >
              {isEditing ? 'Actualizar Gasto' : 'Registrar Gasto'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
