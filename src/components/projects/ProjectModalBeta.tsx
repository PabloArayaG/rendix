import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X, AlertTriangle, Info, FileText, Calendar,
  DollarSign, Building2, CheckCircle2, TrendingUp, TrendingDown,
  Upload, ExternalLink
} from 'lucide-react';
import { useProjects, ProjectDocumentFiles } from '../../hooks/useProjects';
import { Project, CreateProjectDTO, PROJECT_STATUSES } from '../../types/database';
import { formatCurrency, formatDateForInput, parseInputDate, getMarginColor } from '../../lib/utils';

/* ─── Schema ────────────────────────────────────────────────────────────── */
const projectSchema = z.object({
  custom_id:      z.string().min(1, 'El ID es requerido').max(50).regex(/^[A-Za-z0-9\-_\.]+$/, 'Solo letras, números, guiones y puntos'),
  name:           z.string().min(1, 'El nombre es requerido'),
  description:    z.string().optional(),
  client:         z.string().min(1, 'El cliente es requerido'),
  sale_amount:    z.number().min(1, 'Debe ser mayor a 0'),
  projected_cost: z.number().min(0, 'Debe ser positivo'),
  start_date:     z.string().optional(),
  end_date:       z.string().optional(),
  purchase_order: z.string().optional(),
  hes:            z.string().optional(),
  sale_invoice:   z.string().optional(),
  status:         z.enum(['in_progress', 'completed']).optional(),
  notes:          z.string().optional(),
}).refine(data => {
  if (data.start_date && data.end_date)
    return new Date(data.start_date) <= new Date(data.end_date);
  return true;
}, { message: 'La fecha de fin debe ser posterior al inicio', path: ['end_date'] });

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectModalBetaProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  onSuccess?: () => void;
}

const SECTIONS = [
  { id: 'sec-esencial',   label: 'Esencial'    },
  { id: 'sec-financiero', label: 'Financiero'  },
  { id: 'sec-fechas',     label: 'Fechas'      },
  { id: 'sec-documentos', label: 'Documentos'  },
  { id: 'sec-notas',      label: 'Notas'       },
];

const inputCls = (err?: boolean, disabled?: boolean) =>
  `w-full px-3 py-2.5 rounded-xl border text-sm text-gray-900 dark:text-white placeholder-gray-400
   focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors
   ${disabled ? 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}
   ${err ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}`;

const sectionTitle = (label: string) => (
  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">{label}</p>
);

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{msg}</p> : null;

/* ─── Component ─────────────────────────────────────────────────────────── */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ProjectModalBeta({ isOpen, onClose, project, onSuccess }: ProjectModalBetaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [docFiles, setDocFiles] = useState<ProjectDocumentFiles>({});
  const scrollRef             = useRef<HTMLFormElement>(null);
  const fileRefs = {
    purchase_order: useRef<HTMLInputElement>(null),
    hes:            useRef<HTMLInputElement>(null),
    sale_invoice:   useRef<HTMLInputElement>(null),
  };

  const handleDocFile = (docType: keyof ProjectDocumentFiles, file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) { setError('Solo JPG, PNG o PDF'); return; }
    if (file.size > MAX_SIZE) { setError('Máximo 5MB por archivo'); return; }
    setError('');
    setDocFiles(prev => ({ ...prev, [docType]: file }));
  };

  const { createProject, updateProject, validateCustomId, canEditProject } = useProjects();

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      custom_id: '', name: '', description: '', client: '',
      sale_amount: 0, projected_cost: 0,
      start_date: '', end_date: '',
      purchase_order: '', hes: '', sale_invoice: '',
      status: 'in_progress', notes: '',
    },
  });

  const watchAll        = watch();
  const saleAmount      = watchAll.sale_amount    || 0;
  const projectedCost   = watchAll.projected_cost || 0;
  const projectedMargin = saleAmount - projectedCost;
  const marginPct       = saleAmount > 0 ? (projectedMargin / saleAmount) * 100 : 0;
  const marginColor     = getMarginColor(marginPct);

  const projectName = watchAll.name   || (project?.name   ?? 'Nuevo Proyecto');
  const clientName  = watchAll.client || (project?.client ?? 'Cliente');
  const customId    = watchAll.custom_id || (project?.custom_id ?? '—');
  const statusValue = watchAll.status || 'in_progress';

  useEffect(() => {
    if (project) {
      reset({
        custom_id: project.custom_id, name: project.name,
        description: project.description || '', client: project.client,
        sale_amount: project.sale_amount, projected_cost: project.projected_cost,
        start_date: formatDateForInput(project.start_date),
        end_date: formatDateForInput(project.end_date),
        purchase_order: project.purchase_order || '', hes: project.hes || '',
        sale_invoice: project.sale_invoice || '', status: project.status,
        notes: project.notes || '',
      });
    } else {
      reset({
        custom_id: '', name: '', description: '', client: '',
        sale_amount: 0, projected_cost: 0, start_date: '', end_date: '',
        purchase_order: '', hes: '', sale_invoice: '',
        status: 'in_progress', notes: '',
      });
    }
    setError('');
    setDocFiles({});
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 50);
  }, [project, isOpen, reset]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setLoading(true); setError('');
      if (!project || data.custom_id !== project.custom_id) {
        const isUnique = await validateCustomId(data.custom_id, project?.id);
        if (!isUnique) { setError('Ya existe un proyecto con ese ID. Elige otro.'); setLoading(false); return; }
      }
      const projectData: CreateProjectDTO = {
        custom_id: data.custom_id, name: data.name,
        description: data.description || undefined, client: data.client,
        sale_amount: data.sale_amount, projected_cost: data.projected_cost,
        start_date: parseInputDate(data.start_date || '') || undefined,
        end_date: parseInputDate(data.end_date || '') || undefined,
        purchase_order: data.purchase_order || undefined, hes: data.hes || undefined,
        sale_invoice: data.sale_invoice || undefined, notes: data.notes || undefined, tags: [],
      };
      if (project && data.status) (projectData as any).status = data.status;
      if (project) await updateProject(project.id, projectData, docFiles);
      else await createProject(projectData, docFiles);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally { setLoading(false); }
  };

  const handleClose = () => { onClose(); reset(); setError(''); setDocFiles({}); };

  const scrollToSection = (id: string) => {
    scrollRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isOpen) return null;

  const isEditing = !!project;
  const canEdit   = !project || canEditProject(project);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEditing ? `Editando ${project?.custom_id}` : 'Completa la información del proyecto'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Panel izquierdo: preview en vivo */}
          <div className="w-64 shrink-0 border-r border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-5 flex flex-col gap-4 overflow-y-auto">

            {/* Card preview */}
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {customId}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  statusValue === 'completed'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {statusValue === 'completed' ? 'Terminado' : 'En Proceso'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{projectName}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{clientName}</p>
            </div>

            {/* Preview financiero */}
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Proyección</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Venta neta</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{formatCurrency(saleAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Costo proyect.</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{formatCurrency(projectedCost)}</span>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-700" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  {projectedMargin >= 0
                    ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  }
                  Margen
                </span>
                <span className={`font-bold tabular-nums ${marginColor}`}>{formatCurrency(projectedMargin)}</span>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Rentabilidad</span>
                  <span className={`font-bold ${marginColor}`}>{marginPct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      marginPct >= 20 ? 'bg-green-500' : marginPct >= 10 ? 'bg-yellow-500' : marginPct >= 0 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, marginPct))}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 font-medium ${marginColor}`}>
                  {marginPct >= 20 ? '✓ Excelente' : marginPct >= 10 ? '✓ Buena' : marginPct >= 0 ? '⚠ Baja' : '✗ Negativo'}
                </p>
              </div>
            </div>

            {/* Aviso proyecto terminado */}
            {isEditing && !canEdit && (
              <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Proyecto terminado: solo puedes editar documentos y notas.
              </div>
            )}

            {/* Navegación rápida */}
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
            id="project-form-beta"
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
              <div id="sec-esencial" className="scroll-mt-4 space-y-4">
                {sectionTitle('Esencial')}

                {/* Nombre — protagonista */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre del Proyecto *</label>
                  <input
                    {...register('name')}
                    type="text"
                    autoFocus
                    disabled={isEditing && !canEdit}
                    placeholder="Ej: Construcción Edificio Central"
                    className={`${inputCls(!!errors.name, isEditing && !canEdit)} text-base`}
                  />
                  <FieldError msg={errors.name?.message} />
                </div>

                {/* ID + Estado en fila */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ID del Proyecto *</label>
                    <input
                      {...register('custom_id')}
                      type="text"
                      disabled={isEditing && !canEdit}
                      placeholder="Ej: 2025-001"
                      className={inputCls(!!errors.custom_id, isEditing && !canEdit)}
                    />
                    <FieldError msg={errors.custom_id?.message} />
                    <p className="mt-1 text-xs text-gray-400">Letras, números, guiones, puntos</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Estado</label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        {PROJECT_STATUSES.map(s => (
                          <label key={s.value} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                            watchAll.status === s.value
                              ? s.value === 'completed'
                                ? 'bg-green-50 border-green-400 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400'
                                : 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400'
                          }`}>
                            <input {...register('status')} type="radio" value={s.value} className="sr-only" />
                            {watchAll.status === s.value && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                            {s.label}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="inline-flex items-center px-3 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium border border-blue-200 dark:border-blue-700">
                        En Proceso
                      </div>
                    )}
                  </div>
                </div>

                {/* Cliente */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cliente *</label>
                  <input
                    {...register('client')}
                    type="text"
                    disabled={isEditing && !canEdit}
                    placeholder="Ej: Empresa Constructora XYZ S.A."
                    className={inputCls(!!errors.client, isEditing && !canEdit)}
                  />
                  <FieldError msg={errors.client?.message} />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descripción</label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    disabled={isEditing && !canEdit}
                    placeholder="Descripción del alcance y objetivos del proyecto..."
                    className={`${inputCls(false, isEditing && !canEdit)} resize-none`}
                  />
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* ── SECCIÓN 2: Financiero ───────────────────────────── */}
              <div id="sec-financiero" className="scroll-mt-4 space-y-4">
                {sectionTitle('Financiero')}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      <DollarSign className="inline h-3.5 w-3.5 mr-1" />Monto de Venta (CLP) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                      <input
                        {...register('sale_amount', { valueAsNumber: true })}
                        type="number" step="1" min="0"
                        disabled={isEditing && !canEdit}
                        placeholder="0"
                        className={`${inputCls(!!errors.sale_amount, isEditing && !canEdit)} pl-7 tabular-nums text-lg font-semibold`}
                      />
                    </div>
                    <FieldError msg={errors.sale_amount?.message} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Costo Proyectado (CLP) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                      <input
                        {...register('projected_cost', { valueAsNumber: true })}
                        type="number" step="1" min="0"
                        disabled={isEditing && !canEdit}
                        placeholder="0"
                        className={`${inputCls(!!errors.projected_cost, isEditing && !canEdit)} pl-7 tabular-nums`}
                      />
                    </div>
                    <FieldError msg={errors.projected_cost?.message} />
                  </div>
                </div>

                {/* Panel margen en vivo */}
                <div className={`rounded-2xl p-4 border ${
                  marginPct >= 20 ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' :
                  marginPct >= 10 ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' :
                  marginPct >= 0  ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' :
                  'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Proyección de Margen</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      marginPct >= 20 ? 'bg-green-100 text-green-700' :
                      marginPct >= 10 ? 'bg-yellow-100 text-yellow-700' :
                      marginPct >= 0  ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {marginPct >= 20 ? 'Excelente' : marginPct >= 10 ? 'Bueno' : marginPct >= 0 ? 'Bajo' : 'Negativo'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                    {[
                      { label: 'Venta Neta', value: formatCurrency(saleAmount), cls: 'text-gray-900 dark:text-white' },
                      { label: 'Costo Proy.', value: formatCurrency(projectedCost), cls: 'text-gray-700 dark:text-gray-300' },
                      { label: 'Margen', value: formatCurrency(projectedMargin), cls: marginColor },
                    ].map(({ label, value, cls }) => (
                      <div key={label}>
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        <p className={`font-bold tabular-nums text-sm ${cls}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-white/60 dark:bg-gray-900/30 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        marginPct >= 20 ? 'bg-green-500' : marginPct >= 10 ? 'bg-yellow-500' : marginPct >= 0 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, marginPct))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1 text-gray-400">
                    <span>0%</span>
                    <span className={`font-bold ${marginColor}`}>{marginPct.toFixed(1)}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Costos reales si estamos editando */}
                {isEditing && project && (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Costos reales actuales</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Costo real:</span>
                        <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{formatCurrency(project.real_cost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Margen real:</span>
                        <span className={`font-semibold tabular-nums ${getMarginColor(project.sale_amount > 0 ? (project.real_margin / project.sale_amount) * 100 : 0)}`}>
                          {formatCurrency(project.real_margin)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Ejecución de presupuesto</span>
                        <span className="tabular-nums">{projectedCost > 0 ? ((project.real_cost / projectedCost) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="bg-orange-500 h-1.5 rounded-full"
                          style={{ width: `${projectedCost > 0 ? Math.min(100, (project.real_cost / projectedCost) * 100) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* ── SECCIÓN 3: Fechas ───────────────────────────────── */}
              <div id="sec-fechas" className="scroll-mt-4 space-y-4">
                {sectionTitle('Fechas')}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      <Calendar className="inline h-3.5 w-3.5 mr-1" />Fecha de Inicio
                    </label>
                    <input {...register('start_date')} type="date"
                      disabled={isEditing && !canEdit}
                      className={inputCls(false, isEditing && !canEdit)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      <Calendar className="inline h-3.5 w-3.5 mr-1" />Fecha de Término
                    </label>
                    <input {...register('end_date')} type="date"
                      disabled={isEditing && !canEdit}
                      className={inputCls(!!errors.end_date, isEditing && !canEdit)} />
                    <FieldError msg={errors.end_date?.message} />
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* ── SECCIÓN 4: Documentos ───────────────────────────── */}
              <div id="sec-documentos" className="scroll-mt-4 space-y-5">
                {sectionTitle('Documentos')}
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0" />
                  Los documentos pueden editarse aunque el proyecto esté terminado.
                </div>
                {([
                  { field: 'purchase_order' as const, label: 'Orden de Compra',  placeholder: 'Ej: OC-2025-001',  urlField: 'purchase_order_url' as const, fnField: 'purchase_order_filename' as const },
                  { field: 'hes'            as const, label: 'HES',              placeholder: 'Ej: HES-2025-001', urlField: 'hes_url'            as const, fnField: 'hes_filename'            as const },
                  { field: 'sale_invoice'   as const, label: 'Factura de Venta', placeholder: 'Ej: FV-2025-001',  urlField: 'sale_invoice_url'   as const, fnField: 'sale_invoice_filename'   as const },
                ] as const).map(({ field, label, placeholder, urlField, fnField }) => {
                  const existingUrl      = project?.[urlField];
                  const existingFilename = project?.[fnField];
                  const newFile          = docFiles[field];
                  return (
                    <div key={field} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                      </div>

                      {/* Número */}
                      <input
                        {...register(field)}
                        type="text"
                        placeholder={placeholder}
                        className={inputCls()}
                      />

                      {/* Archivo: nuevo seleccionado */}
                      {newFile ? (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 min-w-0">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="truncate font-medium">{newFile.name}</span>
                          </div>
                          <button type="button" onClick={() => setDocFiles(p => ({ ...p, [field]: null }))}
                            className="ml-2 text-green-500 hover:text-red-500 transition-colors shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : existingUrl ? (
                        /* Archivo ya guardado */
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 min-w-0">
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate">{existingFilename || 'Archivo adjunto'}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button type="button" onClick={() => window.open(existingUrl, '_blank')}
                              className="text-blue-500 hover:text-blue-700 transition-colors p-1" title="Ver archivo">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => fileRefs[field].current?.click()}
                              className="text-blue-400 hover:text-blue-600 transition-colors p-1 text-xs font-medium">
                              Reemplazar
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Zona de drag & drop */
                        <div
                          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleDocFile(field, f); }}
                          onDragOver={e => e.preventDefault()}
                          onClick={() => fileRefs[field].current?.click()}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-orange-400 dark:hover:border-orange-500 cursor-pointer transition-colors bg-white dark:bg-gray-800"
                        >
                          <Upload className="h-4 w-4 text-gray-300 dark:text-gray-500 shrink-0" />
                          <p className="text-xs text-gray-400">
                            Arrastra un archivo o <span className="text-orange-500 font-medium">haz clic</span>
                            <span className="text-gray-300 ml-1">· PDF, JPG, PNG · máx 5MB</span>
                          </p>
                        </div>
                      )}
                      <input
                        ref={fileRefs[field]}
                        type="file"
                        accept="image/*,.pdf"
                        className="sr-only"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleDocFile(field, f); e.target.value = ''; }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* ── SECCIÓN 5: Notas ─────────────────────────────────── */}
              <div id="sec-notas" className="scroll-mt-4 pb-4">
                {sectionTitle('Notas')}
                <textarea
                  {...register('notes')}
                  rows={5}
                  placeholder={`Agrega notas, observaciones o contexto del proyecto...\n\nPor ejemplo:\n- Condiciones especiales del contrato\n- Contactos clave\n- Hitos importantes`}
                  className={`${inputCls()} resize-none`}
                />
                <p className="mt-1 text-xs text-gray-400">Solo para referencia interna.</p>
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur shrink-0">
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            {isEditing && project?.status === 'completed' && (
              <><AlertTriangle className="h-3.5 w-3.5" /> Proyecto terminado · edición limitada</>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleClose} disabled={loading}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button type="submit" form="project-form-beta" disabled={loading}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Crear Proyecto'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
