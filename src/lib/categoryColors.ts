// Colores para categorías de gastos
// Diseño minimalista con dark mode

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    // Construcción
    'materials': 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/50',
    'labor': 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/50',
    'equipment': 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700/50',
    
    // Transporte y logística
    'transport': 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/50',
    'fuel': 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700/50',
    
    // Servicios
    'services': 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/50',
    'subcontractors': 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700/50',
    
    // Administrativo
    'permits': 'bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/50',
    'administration': 'bg-gray-50 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700/50',
    'insurance': 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50',
    
    // Operacional
    'utilities': 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700/50',
    'supplies': 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700/50',
    'tools': 'bg-zinc-50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700/50',
    'safety': 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700/50',
    
    // Personal
    'salary': 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700/50',
    'food': 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700/50',
    'accommodation': 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-700/50',
    
    // General
    'other': 'bg-neutral-50 dark:bg-neutral-950/40 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700/50',
    'general': 'bg-stone-50 dark:bg-stone-950/40 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700/50',
  };

  return colors[category] || colors['general'];
};

