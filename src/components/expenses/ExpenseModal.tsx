import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, DollarSign, Upload, Tag, FileText } from 'lucide-react';
import { useExpenses } from '../../hooks/useExpenses';
import { useProjects } from '../../hooks/useProjects';
import { Expense, CreateExpenseDTO, EXPENSE_CATEGORIES } from '../../types/database';

const expenseSchema = z.object({
  project_id: z.string().min(1, 'El proyecto es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  net_amount: z.number().min(1, 'El monto neto debe ser mayor a 0'),
  tax_amount: z.number().min(0, 'El IVA no puede ser negativo'),
  amount: z.number().min(1, 'El monto total debe ser mayor a 0'),
  category: z.string().min(1, 'La categoría es requerida'),
  date: z.string().min(1, 'La fecha es requerida'),
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
      date: new Date().toISOString().split('T')[0],
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
        date: expense.date,
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
        date: new Date().toISOString().split('T')[0],
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

      const expenseData: CreateExpenseDTO = {
        project_id: data.project_id,
        description: data.description,
        net_amount: data.net_amount,
        tax_amount: data.tax_amount,
        amount: data.net_amount + data.tax_amount,
        category: data.category as any,
        date: data.date,
        supplier: data.supplier || undefined,
        invoice_number: data.invoice_number || undefined,
        notes: data.notes || undefined,
        tags: [],
      };

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
      setError(err instanceof Error ? err.message : 'Error desconocido');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {expense ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
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
            <h3 className="text-lg font-medium text-gray-900">Información del Gasto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proyecto *
                </label>
                <select
                  {...register('project_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar proyecto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.custom_id} - {project.name}
                    </option>
                  ))}
                </select>
                {errors.project_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.project_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  {...register('category')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <input
                {...register('description')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Compra de cemento para cimentación"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                {errors.net_amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.net_amount.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  {errors.tax_amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.tax_amount.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                      value={totalAmount}
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>
              </div>

              {/* Mostrar cálculo visual */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Cálculo de IVA</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Neto:</span>
                    <span className="font-semibold ml-2">{netAmount.toLocaleString('es-CL')}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">IVA (19%):</span>
                    <span className="font-semibold ml-2">{taxAmount.toLocaleString('es-CL')}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Total:</span>
                    <span className="font-semibold ml-2">{totalAmount.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    {...register('date')}
                    type="date"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Información Adicional</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor
                </label>
                <input
                  {...register('supplier')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Ferretería ABC S.L."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Factura
                </label>
                <input
                  {...register('invoice_number')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: FAC-2024-001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Notas adicionales sobre el gasto..."
              />
            </div>
          </div>

          {/* Comprobante */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Comprobante</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subir Comprobante (Opcional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
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
                  <p className="text-xs text-gray-500">
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
                  {expense ? 'Actualizando...' : 'Registrando...'}
                </div>
              ) : (
                expense ? 'Actualizar Gasto' : 'Registrar Gasto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
