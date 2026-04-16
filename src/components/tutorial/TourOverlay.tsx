import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, ChevronRight, ChevronLeft,
  GraduationCap, LayoutDashboard, FolderOpen,
  BarChart3, Filter, Receipt, Settings,
  PlusCircle, ClipboardList,
} from 'lucide-react';

export const TOUR_KEY = 'rendix_tour_completed_v1';

type StepPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

interface Step {
  id: string;
  title: string;
  description: string;
  target?: string;
  page?: string;
  position?: StepPosition;
  icon?: React.ComponentType<{ className?: string }>;
  /** Si es true, hace clic en el target para abrir un modal y entra en modo modal */
  openModal?: boolean;
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido a Rendix!',
    description: 'Te guiaremos por las funciones clave: dashboard financiero, gestión de proyectos, registro de gastos y configuración. Puedes saltar el tutorial en cualquier momento.',
    position: 'center',
    icon: GraduationCap,
  },
  {
    id: 'sidebar-nav',
    title: 'Navegación principal',
    description: 'El menú lateral está siempre visible. Dashboard muestra el resumen financiero global, Proyectos lista toda tu cartera, y Configuración gestiona tu organización y equipo.',
    target: 'sidebar-nav',
    page: '/dashboard',
    position: 'right',
    icon: LayoutDashboard,
  },
  {
    id: 'dashboard-filters',
    title: 'Filtros de período',
    description: 'Filtra toda la vista por año (2023, 2024, 2025…) o define un rango de fechas personalizado con el ícono de calendario. El selector de la derecha enfoca los datos en un solo proyecto.',
    target: 'dashboard-filters',
    page: '/dashboard',
    position: 'bottom',
    icon: Filter,
  },
  {
    id: 'dashboard-kpis',
    title: 'Indicadores financieros clave',
    description: 'Cuatro KPIs siempre visibles: Proyectos (activos y terminados), Ingresos (venta neta total), Costos (costo real acumulado) y Margen (con barra de porcentaje que cambia de color según la salud financiera).',
    target: 'dashboard-kpis',
    page: '/dashboard',
    position: 'bottom',
    icon: BarChart3,
  },
  {
    id: 'dashboard-expenses',
    title: 'Gastos recientes',
    description: 'Lista los últimos 10 gastos con descripción, categoría, proyecto asociado, fecha y monto neto. Pasa el cursor sobre una fila para editar el gasto o ver el comprobante adjunto.',
    target: 'dashboard-expenses',
    page: '/dashboard',
    position: 'top',
    icon: Receipt,
  },
  {
    id: 'projects-toolbar',
    title: 'Buscador y filtros de proyectos',
    description: 'Busca por nombre, cliente o ID. Filtra por estado (Todos / En Proceso / Terminados) con el conteo actualizado en tiempo real. El botón naranja abre el formulario de nuevo proyecto.',
    target: 'projects-toolbar',
    page: '/projects',
    position: 'bottom',
    icon: FolderOpen,
  },
  {
    id: 'new-project',
    title: 'Formulario de nuevo proyecto',
    description: 'Completa: Nombre, Cliente, ID personalizado (ej: OT-001), Venta Neta, Costo Proyectado, Fechas de inicio y término, y documentos (OC, HES, Factura de venta). El margen proyectado se calcula automáticamente.',
    target: 'new-project-btn',
    page: '/projects',
    position: 'bottom',
    icon: PlusCircle,
    openModal: true,
  },
  {
    id: 'projects-table',
    title: 'Tabla de proyectos',
    description: 'Cada fila muestra Venta Neta, Costo Real, Margen y % Margen. Haz clic en la fila para abrir el detalle completo. La flecha de la izquierda despliega un resumen rápido sin salir de la lista.',
    target: 'projects-table',
    page: '/projects',
    position: 'bottom',
    icon: FolderOpen,
  },
  {
    id: 'add-expense',
    title: 'Formulario de gasto',
    description: 'Registra: Descripción, Fecha, Monto neto (el IVA se calcula solo), Categoría (materiales, mano de obra, herramientas…), Proveedor, Tipo y N° de documento, y Estado de pago (Provisión, Pagado, Crédito o Anticipo). El margen del proyecto se actualiza al instante.',
    target: 'add-expense-btn',
    page: 'auto:first-project',
    position: 'bottom',
    icon: ClipboardList,
    openModal: true,
  },
  {
    id: 'settings',
    title: 'Configuración',
    description: 'Desde Configuración gestionas tu organización, invitas miembros al equipo y ajustas las preferencias de tu cuenta. Siempre accesible desde el menú lateral.',
    target: 'sidebar-settings',
    position: 'right',
    icon: Settings,
  },
  {
    id: 'done',
    title: '¡Listo para usar Rendix!',
    description: 'Ya conoces todo lo que necesitas. Crea tu primer proyecto, registra gastos y controla tu margen en tiempo real. Puedes volver a este tutorial cuando quieras desde el botón "Tutorial" del encabezado.',
    position: 'center',
    icon: GraduationCap,
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const CARD_H_ESTIMATE = 280;
const CARD_W = 360;
const GAP = 16;

interface SpotlightRect { top: number; left: number; width: number; height: number; }

/** Primer elemento visible en pantalla con el selector dado */
function findVisibleElement(selector: string): Element | null {
  for (const el of Array.from(document.querySelectorAll(selector))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0) return el;
  }
  return null;
}

/** Resuelve 'auto:first-project' al hash del primer proyecto de la lista */
function resolvePageHash(page: string): string {
  if (page === 'auto:first-project') {
    const id = document.querySelector('[data-project-id]')?.getAttribute('data-project-id');
    return id ? `/projects/${id}` : '/projects';
  }
  return page;
}

/** Cierra cualquier modal abierto enviando Escape */
function closeOpenModals() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

async function wait(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

function scrollIntoCenter(target: string): Promise<void> {
  const el = findVisibleElement(`[data-tour="${target}"]`);
  if (!el) return Promise.resolve();
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  if (rect.top >= 0 && rect.bottom <= vh) return Promise.resolve();
  const scrollable = el.closest('.overflow-y-auto') ?? document.documentElement;
  const base = scrollable === document.documentElement ? window.scrollY : (scrollable as HTMLElement).scrollTop;
  scrollable.scrollTo({ top: base + rect.top - vh / 2 + rect.height / 2, behavior: 'smooth' });
  return wait(420);
}

function getTargetRect(target: string): SpotlightRect | null {
  const el = findVisibleElement(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 };
}

function getTooltipStyle(rect: SpotlightRect | null, preferred: StepPosition | undefined): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centered: React.CSSProperties = {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)', width: CARD_W, maxWidth: 'calc(100vw - 32px)',
  };
  if (!rect || !preferred || preferred === 'center') return centered;

  const below = vh - rect.top - rect.height;
  const above = rect.top;
  let pos: StepPosition = preferred;
  if (pos === 'bottom' && below < CARD_H_ESTIMATE + GAP) pos = above >= CARD_H_ESTIMATE + GAP ? 'top' : 'center';
  if (pos === 'top' && above < CARD_H_ESTIMATE + GAP) pos = below >= CARD_H_ESTIMATE + GAP ? 'bottom' : 'center';
  if (pos === 'center') return centered;

  const cx = rect.left + rect.width / 2;
  const left = Math.max(16, Math.min(cx - CARD_W / 2, vw - CARD_W - 16));

  if (pos === 'bottom') return { position: 'fixed', top: rect.top + rect.height + GAP, left, width: CARD_W, maxWidth: 'calc(100vw - 32px)' };
  if (pos === 'top')    return { position: 'fixed', top: Math.max(16, rect.top - CARD_H_ESTIMATE - GAP), left, width: CARD_W, maxWidth: 'calc(100vw - 32px)' };

  const midY = Math.max(16, Math.min(rect.top + rect.height / 2 - CARD_H_ESTIMATE / 2, vh - CARD_H_ESTIMATE - 16));
  if (pos === 'right') return { position: 'fixed', top: midY, left: Math.min(rect.left + rect.width + GAP, vw - CARD_W - 16), width: CARD_W, maxWidth: 'calc(100vw - 32px)' };
  if (pos === 'left')  return { position: 'fixed', top: midY, left: Math.max(16, rect.left - CARD_W - GAP), width: CARD_W, maxWidth: 'calc(100vw - 32px)' };

  return centered;
}

/** Posición fija en la esquina inferior derecha para el modo modal */
const MODAL_CARD_STYLE: React.CSSProperties = {
  position: 'fixed', bottom: 24, right: 24,
  width: CARD_W, maxWidth: 'calc(100vw - 32px)',
};

/* ─── Componente principal ───────────────────────────────────────────────── */

interface TourOverlayProps { onClose: () => void; }

export function TourOverlay({ onClose }: TourOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  /* Ref para cancelar efectos anteriores sin race conditions */
  const runIdRef = useRef(0);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const updateSpotlight = useCallback(() => {
    if (step.target) setSpotlightRect(getTargetRect(step.target));
    else setSpotlightRect(null);
  }, [step.target]);

  /* Efecto principal: navegar + scroll + abrir modal */
  useEffect(() => {
    const myId = ++runIdRef.current;
    const stale = () => runIdRef.current !== myId;

    const run = async () => {
      setNavigating(true);
      setModalOpen(false);

      /* 1. Cerrar cualquier modal que pudiera estar abierto del paso anterior */
      closeOpenModals();
      await wait(180);
      if (stale()) return;

      /* 2. Navegación de página */
      if (step.page) {
        if (step.page === 'auto:first-project') {
          /* Primero ir a /projects para que se rendericen las filas */
          const cur = window.location.hash.replace('#', '');
          if (!cur.startsWith('/projects/') && cur !== '/projects') {
            window.location.hash = '/projects';
            await wait(450);
            if (stale()) return;
          }
          const resolved = resolvePageHash(step.page);
          if (window.location.hash.replace('#', '') !== resolved) {
            window.location.hash = resolved;
            await wait(520);
            if (stale()) return;
          }
        } else {
          const cur = window.location.hash.replace('#', '');
          if (cur !== step.page) {
            window.location.hash = step.page;
            await wait(400);
            if (stale()) return;
          }
        }
      }

      /* 3. Scroll al elemento */
      if (step.target) {
        await scrollIntoCenter(step.target);
        if (stale()) return;
      }

      setNavigating(false);
      updateSpotlight();

      /* 4. Abrir modal si el paso lo requiere */
      if (step.openModal && step.target) {
        await wait(250);
        if (stale()) return;
        const btn = findVisibleElement(`[data-tour="${step.target}"]`);
        if (btn) (btn as HTMLElement).click();
        await wait(300);
        if (stale()) return;
        setModalOpen(true);
      }
    };

    run();
    /* Al desmontar (cambio de paso) cerramos el modal que pudiera estar abierto */
    return () => { closeOpenModals(); };
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Actualizar spotlight en resize */
  useEffect(() => {
    if (modalOpen) return; // en modo modal no hay spotlight que actualizar
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [updateSpotlight, modalOpen]);

  const handleNext = () => isLast ? handleClose() : setStepIndex(i => i + 1);
  const handlePrev = () => { if (!isFirst) setStepIndex(i => i - 1); };
  const handleClose = () => { localStorage.setItem(TOUR_KEY, 'true'); closeOpenModals(); onClose(); };

  const Icon = step.icon ?? GraduationCap;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  /* En modo modal: tarjeta flotante sin backdrop ni spotlight */
  const isModalMode = modalOpen;
  const tooltipStyle = isModalMode ? MODAL_CARD_STYLE : getTooltipStyle(spotlightRect, step.position);

  return (
    <div className="fixed inset-0 z-[9990]" style={{ pointerEvents: 'none' }}>

      {/* ── Backdrop ── */}
      {!isModalMode && (
        spotlightRect ? (
          <>
            <div className="absolute bg-black/60" style={{ top: 0, left: 0, right: 0, height: Math.max(0, spotlightRect.top), pointerEvents: 'auto' }} />
            <div className="absolute bg-black/60" style={{ top: spotlightRect.top + spotlightRect.height, left: 0, right: 0, bottom: 0, pointerEvents: 'auto' }} />
            <div className="absolute bg-black/60" style={{ top: spotlightRect.top, left: 0, width: Math.max(0, spotlightRect.left), height: spotlightRect.height, pointerEvents: 'auto' }} />
            <div className="absolute bg-black/60" style={{ top: spotlightRect.top, left: spotlightRect.left + spotlightRect.width, right: 0, height: spotlightRect.height, pointerEvents: 'auto' }} />
            <div className="absolute rounded-xl ring-2 ring-orange-400/90 pointer-events-none"
              style={{ top: spotlightRect.top, left: spotlightRect.left, width: spotlightRect.width, height: spotlightRect.height }} />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/60" style={{ pointerEvents: 'auto' }} />
        )
      )}

      {/* ── Tooltip / tarjeta ── */}
      {!navigating && (
        <div
          className="z-[9999] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          style={{ ...tooltipStyle, pointerEvents: 'auto' }}
        >
          {/* Barra de progreso */}
          <div className="h-1 bg-gray-100 dark:bg-gray-800">
            <div className="h-1 bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="p-5">
            {/* Encabezado */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-orange-500 dark:text-orange-400 uppercase tracking-wide">
                    Paso {stepIndex + 1} de {STEPS.length}
                  </p>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{step.title}</h3>
                </div>
              </div>
              <button onClick={handleClose}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Descripción */}
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{step.description}</p>

            {/* Nota cuando el modal está abierto */}
            {isModalMode && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 flex items-center gap-2">
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Explora el formulario y presiona Siguiente cuando termines.
                </span>
              </div>
            )}

            {/* Puntos de progreso */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => setStepIndex(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === stepIndex ? 'w-5 h-2 bg-orange-500'
                    : i < stepIndex ? 'w-2 h-2 bg-orange-300 dark:bg-orange-700'
                    : 'w-2 h-2 bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button onClick={handlePrev}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
              )}
              <button onClick={handleClose}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-2 transition-colors ml-auto">
                Saltar
              </button>
              <button onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                {isLast ? '¡Entendido!' : 'Siguiente'}
                {!isLast && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
