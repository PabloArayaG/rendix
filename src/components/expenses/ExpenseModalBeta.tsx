import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X, DollarSign, Calendar, FileText, Upload,
  Lock, AlertTriangle, CheckCircle2, Receipt, Tag, ChevronDown
} from 'lucide-react';
import { useExpenses } from '../../hooks/useExpenses';
import { useProjects } from '../../hooks/useProjects';
import {
  Expense, CreateExpenseDTO,
  EXPENSE_CATEGORIES, EXPENSE_STATUSES, DOCUMENT_TYPES
} from '../../types/database';
import { formatCurrency, formatDateForInput, normalizeExpenseData } from '../../lib/utils';
import { getCategoryColor } from '../../lib/categoryColors';
import { openStorageFile } from '../../lib/supabase';

/* ── Constantes ─────────────────────────────────────────────────────────── */
const MAX_AMOUNT = 9999999999999.99;
const MIN_AMOUNT = 0.01;

const expenseSchema = z.object({
  project_id:      z.string().min(1, 'El proyecto es requerido'),
  description:     z.string().min(1, 'La descripción es requerida'),
  net_amount:      z.number().min(MIN_AMOUNT, 'Debe ser mayor a $0').max(MAX_AMOUNT),
  tax_amount:      z.number().min(0).max(MAX_AMOUNT),
  amount:          z.number().min(MIN_AMOUNT).max(MAX_AMOUNT),
  category:        z.string().min(1, 'La categoría es requerida'),
  date:            z.string().min(1, 'La fecha es requerida'),
  credit_due_date: z.string().optional(),
  status:          z.enum(['provision', 'paid', 'credit', 'advance']),
  document_type:   z.enum(['boleta', 'factura']),
  document_number: z.string().optional(),
  supplier:        z.string().optional(),
  invoice_number:  z.string().optional(),
  notes:           z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status === 'credit' && !data.credit_due_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['credit_due_date'],
      message: 'La fecha de vencimiento es requerida para un crédito',
    });
  }

  if (data.status === 'credit' && data.credit_due_date && data.credit_due_date < data.date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['credit_due_date'],
      message: 'El vencimiento no puede ser anterior a la fecha del gasto',
    });
  }
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  provision: { label: 'Provisión', color: 'bg-yellow-50 border-yellow-400 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-400' },
  paid:      { label: 'Pagado',    color: 'bg-green-50 border-green-400 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400' },
  credit:    { label: 'Crédito',   color: 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400' },
  advance:   { label: 'Anticipo',  color: 'bg-purple-50 border-purple-400 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-400' },
};

const SECTIONS = [
  { id: 'sec-esencial',  label: 'Esencial'   },
  { id: 'sec-monto',     label: 'Monto'      },
  { id: 'sec-detalles',  label: 'Detalles'   },
  { id: 'sec-documento', label: 'Documento'  },
  { id: 'sec-notas',     label: 'Notas'      },
];

interface ExpenseModalBetaProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense;
  onSuccess?: () => void;
  defaultProjectId?: string;
}

const inputCls = (err?: boolean) =>
  `w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white
   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors
   ${err ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`;

const sectionTitle = (label: string) => (
  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">{label}</p>
);

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{msg}</p> : null;

/* ── Component ────────────────────────────────────────────────────────────── */
export function ExpenseModalBeta({ isOpen, onClose, expense, onSuccess, defaultProjectId }: ExpenseModalBetaProps) {
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [catOpen, setCatOpen]         = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const scrollRef                     = useRef<HTMLFormElement>(null);
  const catRef                        = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!catOpen) return;
    const fn = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [catOpen]);

  const { createExpense, updateExpense } = useExpenses();
  const { projects }                     = useProjects();

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } =
    useForm<ExpenseFormData>({
      resolver: zodResolver(expenseSchema),
      defaultValues: {
        project_id: defaultProjectId || '',
        description: '', net_amount: 0, tax_amount: 0, amount: 0,
        category: 'general', date: formatDateForInput(new Date()),
        credit_due_date: '',
        status: 'provision', document_type: 'boleta',
        document_number: '', supplier: '', invoice_number: '', notes: '',
      },
    });

  const watchAll   = watch();
  const netAmount  = watchAll.net_amount || 0;
  const taxAmount  = watchAll.tax_amount || 0;
  const totalAmount = watchAll.amount || 0;
  const docType    = watchAll.document_type;
  const status     = watchAll.status;
  const category   = watchAll.category;

  const IVA_RATE = 0.19;
  const calcTax   = (net: number) => Math.round(net * IVA_RATE);
  const calcNet   = (total: number) => Math.round(total / (1 + IVA_RATE));

  const onNetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const net = parseFloat(e.target.value) || 0;
    const tax = calcTax(net);
    setValue('tax_amount', tax);
    setValue('amount', net + tax);
  };

  const onTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tax = parseFloat(e.target.value) || 0;
    setValue('amount', netAmount + tax);
  };

  const onTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const total = parseFloat(e.target.value) || 0;
    const net = calcNet(total);
    const tax = total - net;
    setValue('net_amount', net);
    setValue('tax_amount', tax);
  };

  useEffect(() => {
    if (expense) {
      const net = expense.net_amount || Math.round(expense.amount / 1.19);
      const tax = expense.tax_amount || (expense.amount - net);
      reset({
        project_id: expense.project_id, description: expense.description,
        net_amount: net, tax_amount: tax, amount: expense.amount,
        category: expense.category, date: formatDateForInput(expense.date),
        credit_due_date: expense.credit_due_date ? formatDateForInput(expense.credit_due_date) : '',
        status: expense.status || 'provision', document_type: expense.document_type || 'boleta',
        document_number: expense.document_number || '', supplier: expense.supplier || '',
        invoice_number: expense.invoice_number || '', notes: expense.notes || '',
      });
    } else {
      reset({
        project_id: defaultProjectId || '', description: '',
        net_amount: 0, tax_amount: 0, amount: 0, category: 'general',
        date: formatDateForInput(new Date()), credit_due_date: '', status: 'provision',
        document_type: 'boleta', document_number: '', supplier: '',
        invoice_number: '', notes: '',
      });
    }
    setError('');
    setReceiptFile(null);
    // Scroll al inicio al abrir
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 50);
  }, [expense, defaultProjectId, isOpen, reset]);

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      setLoading(true); setError('');
      const raw: CreateExpenseDTO = {
        project_id: data.project_id, description: data.description,
        net_amount: data.net_amount, tax_amount: data.tax_amount,
        amount: data.amount,
        category: data.category as CreateExpenseDTO['category'], date: data.date,
        credit_due_date: data.status === 'credit' ? data.credit_due_date : null,
        status: data.status, document_type: data.document_type,
        document_number: data.document_number || undefined,
        supplier: data.supplier || undefined,
        invoice_number: data.invoice_number || undefined,
        notes: data.notes || undefined, tags: [],
      };
      const expData = normalizeExpenseData(raw) as CreateExpenseDTO;
      if (expense) await updateExpense(expense.id, expData, receiptFile || undefined);
      else await createExpense(expData, receiptFile || undefined);
      onSuccess?.(); onClose(); reset(); setReceiptFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally { setLoading(false); }
  };

  const handleClose = () => { onClose(); reset(); setError(''); setReceiptFile(null); };

  const validateAndSetFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) { setError('Solo JPG, PNG o PDF'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5MB'); return; }
    setReceiptFile(file); setError('');
  };

  const scrollToSection = (id: string) => {
    const el = scrollRef.current?.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isOpen) return null;

  const isEditing      = !!expense;
  const currentProject = projects.find(p => p.id === (defaultProjectId || watchAll.project_id));
  const categoryLabel  = EXPENSE_CATEGORIES.find(c => c.value === category)?.label || category;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h2>
              <p className="text-xs text-gray-400">
                {currentProject ? `${currentProject.custom_id} · ${currentProject.name}` : 'Selecciona un proyecto'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Panel izquierdo: preview + navegación rápida */}
          <div className="w-60 shrink-0 border-r border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-5 flex flex-col gap-4 overflow-y-auto">

            {/* Monto total */}
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-center shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total gasto</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                {formatCurrency(totalAmount)}
              </p>
              {netAmount > 0 && (
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Neto</span>
                    <span className="tabular-nums font-medium text-gray-700 dark:text-gray-300">{formatCurrency(netAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>IVA 19%</span>
                    <span className="tabular-nums font-medium text-gray-700 dark:text-gray-300">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                  <div className="flex justify-between font-semibold text-orange-600 dark:text-orange-400">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Categoría, estado, documento */}
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Categoría</p>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(category)}`}>
                  <Tag className="h-3 w-3" />{categoryLabel}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Estado</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${STATUS_CONFIG[status]?.color || ''}`}>
                  {STATUS_CONFIG[status]?.label || status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Documento</p>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  <FileText className="h-3 w-3" />
                  {docType === 'factura' ? 'Factura' : 'Boleta'}
                </span>
              </div>
            </div>

            {/* Comprobante */}
            {(receiptFile || expense?.receipt_url) && (
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium truncate">
                    {receiptFile ? receiptFile.name : expense?.receipt_filename || 'Comprobante adjunto'}
                  </p>
                </div>
              </div>
            )}

            {/* Navegación rápida por secciones */}
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <p className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Ir a sección</p>
              {SECTIONS.map((sec, i) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors font-medium
                    ${i < SECTIONS.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>

          {/* Panel derecho: formulario continuo con scroll */}
          <form
            id="expense-form-beta"
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto"
            ref={scrollRef}
          >
            <div className="p-6 space-y-8">

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}

              {/* ── SECCIÓN 1: Esencial ─────────────────────────────── */}
              <div id="sec-esencial" className="scroll-mt-4">
                {sectionTitle('Esencial')}
                <div className="space-y-4">

                  {/* Proyecto */}
                  {defaultProjectId ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300">
                      <Lock className="h-4 w-4 text-gray-400 shrink-0" />
                      {currentProject ? `${currentProject.custom_id} - ${currentProject.name}` : 'Proyecto actual'}
                      <input {...register('project_id')} type="hidden" value={defaultProjectId} />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Proyecto *</label>
                      <select {...register('project_id')} className={inputCls(!!errors.project_id)}>
                        <option value="">Seleccionar proyecto</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.custom_id} - {p.name}</option>)}
                      </select>
                      <FieldError msg={errors.project_id?.message} />
                    </div>
                  )}

                  {/* Descripción — protagonista */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descripción *</label>
                    <input
                      {...register('description')}
                      type="text"
                      autoFocus
                      placeholder="Ej: Compra de cemento para cimentación"
                      className={`${inputCls(!!errors.description)} text-base`}
                    />
                    <FieldError msg={errors.description?.message} />
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      <Calendar className="inline h-3.5 w-3.5 mr-1" />
                      Fecha *
                    </label>
                    <input {...register('date')} type="date" className={inputCls(!!errors.date)} />
                    <FieldError msg={errors.date?.message} />
                  </div>
                </div>
              </div>

              {/* Divisor */}
              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* ── SECCIÓN 2: Monto ────────────────────────────────── */}
              <div id="sec-monto" className="scroll-mt-4">
                {sectionTitle('Monto')}
                <div className="space-y-4">
                  {/* Neto */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      <DollarSign className="inline h-3.5 w-3.5 mr-1" />
                      Monto Neto (CLP) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">$</span>
                      <input
                        {...register('net_amount', {
                          valueAsNumber: true,
                          onChange: onNetChange,
                        })}
                        type="number" step="1" min="0" placeholder="0"
                        className={`${inputCls(!!errors.net_amount)} pl-7 tabular-nums text-lg font-semibold`}
                      />
                    </div>
                    <FieldError msg={errors.net_amount?.message} />
                  </div>

                  {/* IVA + Total */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">IVA 19%</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          {...register('tax_amount', {
                            valueAsNumber: true,
                            onChange: onTaxChange,
                          })}
                          type="number" step="1" min="0" placeholder="0"
                          className={`${inputCls(!!errors.tax_amount)} pl-7 tabular-nums`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Total</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 text-sm font-bold">$</span>
                        <input
                          {...register('amount', {
                            valueAsNumber: true,
                            onChange: onTotalChange,
                          })}
                          type="number" step="1" min="0" placeholder="0"
                          className={`${inputCls(!!errors.amount)} pl-7 tabular-nums font-bold text-orange-600 dark:text-orange-400`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Desglose */}
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      {[
                        { label: 'Neto',  value: netAmount,   cls: 'text-gray-900 dark:text-white' },
                        { label: 'IVA',   value: taxAmount,   cls: 'text-gray-600 dark:text-gray-300' },
                        { label: 'Total', value: totalAmount, cls: 'text-orange-600 dark:text-orange-400 font-bold text-base' },
                      ].map(({ label, value, cls }) => (
                        <div key={label}>
                          <p className="text-xs text-gray-400 mb-1">{label}</p>
                          <p className={`tabular-nums font-semibold ${cls}`}>{formatCurrency(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* ── SECCIÓN 3: Detalles ─────────────────────────────── */}
              <div id="sec-detalles" className="scroll-mt-4">
                {sectionTitle('Detalles')}
                <div className="space-y-5">
                  {/* Categoría */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Categoría *</label>
                    <input {...register('category')} type="hidden" />
                    <div ref={catRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setCatOpen(o => !o)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                          ${catOpen ? 'ring-2 ring-orange-500 border-transparent' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}
                          ${errors.category ? 'border-red-400' : ''}`}
                      >
                        <span className={`flex items-center gap-2 ${!category ? 'text-gray-400' : ''}`}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getCategoryColor(category)}`}>
                            {categoryLabel}
                          </span>
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {catOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                          <div className="max-h-56 overflow-y-auto py-1">
                            {EXPENSE_CATEGORIES.map(cat => (
                              <button
                                key={cat.value}
                                type="button"
                                onClick={() => { setValue('category', cat.value); setCatOpen(false); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                                  ${category === cat.value
                                    ? 'bg-orange-50 dark:bg-orange-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                              >
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getCategoryColor(cat.value)}`}>
                                  {cat.label}
                                </span>
                                {category === cat.value && <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 ml-auto shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <FieldError msg={errors.category?.message} />
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Estado *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {EXPENSE_STATUSES.map(st => (
                        <label
                          key={st.value}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                            watchAll.status === st.value
                              ? STATUS_CONFIG[st.value]?.color
                              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 bg-white dark:bg-gray-800'
                          }`}
                        >
                          <input {...register('status')} type="radio" value={st.value} className="sr-only" />
                          {watchAll.status === st.value && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                          {st.label}
                        </label>
                      ))}
                    </div>
                    <FieldError msg={errors.status?.message} />
                  </div>

                  {status === 'credit' && (
                    <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-900/10 p-3">
                      <label className="block text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide mb-1.5">
                        <Calendar className="inline h-3.5 w-3.5 mr-1" />
                        Vencimiento del crédito *
                      </label>
                      <input
                        {...register('credit_due_date')}
                        type="date"
                        min={watchAll.date}
                        className={inputCls(!!errors.credit_due_date)}
                      />
                      <FieldError msg={errors.credit_due_date?.message} />
                      <p className="mt-1.5 text-xs text-orange-600 dark:text-orange-400">Se avisará desde 30 días antes del vencimiento.</p>
                    </div>
                  )}

                  {/* Proveedor */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Proveedor</label>
                    <input
                      {...register('supplier')}
                      type="text"
                      placeholder="Ej: Ferretería Central S.A."
                      className={inputCls()}
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* ── SECCIÓN 4: Documento ────────────────────────────── */}
              <div id="sec-documento" className="scroll-mt-4">
                {sectionTitle('Documento')}
                <div className="space-y-4">
                  {/* Tipo boleta/factura */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo de Documento *</label>
                    <div className="flex gap-3">
                      {DOCUMENT_TYPES.map(dt => (
                        <label
                          key={dt.value}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                            watchAll.document_type === dt.value
                              ? 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400'
                              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 bg-white dark:bg-gray-800'
                          }`}
                        >
                          <input {...register('document_type')} type="radio" value={dt.value} className="sr-only" />
                          <FileText className="h-4 w-4" />
                          {dt.label}
                          {watchAll.document_type === dt.value && <CheckCircle2 className="h-4 w-4" />}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Número */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Número de {docType === 'factura' ? 'Factura' : 'Boleta'}
                    </label>
                    <input
                      {...register('document_number')}
                      type="text"
                      placeholder={docType === 'factura' ? 'Ej: FAC-2025-001' : 'Ej: BOL-2025-001'}
                      className={inputCls()}
                    />
                  </div>

                  {/* Comprobante drag & drop */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Comprobante (opcional)</label>
                    <div
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) validateAndSetFile(f); }}
                      onDragOver={e => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-orange-400 p-5 text-center cursor-pointer transition-colors bg-white dark:bg-gray-800"
                    >
                      <Upload className="h-7 w-7 text-gray-300 dark:text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Arrastra un archivo o <span className="text-orange-500 font-medium">haz clic</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG o PDF · máx 5MB</p>
                      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="sr-only"
                        onChange={e => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f); }} />
                    </div>
                    {receiptFile && (
                      <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span className="truncate font-medium">{receiptFile.name}</span>
                        </div>
                        <button type="button" onClick={() => setReceiptFile(null)} className="text-green-500 hover:text-red-500 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {expense?.receipt_url && !receiptFile && (
                      <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">Actual: {expense.receipt_filename}</span>
                        </div>
                        <button type="button" onClick={() => { void openStorageFile(expense.receipt_url!); }} className="text-blue-500 text-xs underline">Ver</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* ── SECCIÓN 5: Notas ─────────────────────────────────── */}
              <div id="sec-notas" className="scroll-mt-4 pb-4">
                {sectionTitle('Notas')}
                <textarea
                  {...register('notes')}
                  rows={5}
                  placeholder="Observaciones, detalles adicionales o contexto del gasto..."
                  className={`${inputCls()} resize-none`}
                />
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur shrink-0">
          <button type="button" onClick={handleClose} disabled={loading}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button type="submit" form="expense-form-beta" disabled={loading}
            className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {isEditing ? 'Guardar cambios' : 'Registrar Gasto'}
          </button>
        </div>
      </div>
    </div>
  );
}
