// Colores para categorías de gastos
// Diseño minimalista con dark mode

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    // Construcción
    'materials': 'bg-amber-900/30 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-700/50 dark:border-amber-600/30',
    'labor': 'bg-blue-900/30 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-700/50 dark:border-blue-600/30',
    'equipment': 'bg-purple-900/30 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-700/50 dark:border-purple-600/30',
    
    // Transporte y logística
    'transport': 'bg-cyan-900/30 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-700/50 dark:border-cyan-600/30',
    'fuel': 'bg-red-900/30 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-700/50 dark:border-red-600/30',
    
    // Servicios
    'services': 'bg-indigo-900/30 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-700/50 dark:border-indigo-600/30',
    'subcontractors': 'bg-violet-900/30 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-700/50 dark:border-violet-600/30',
    
    // Administrativo
    'permits': 'bg-slate-900/30 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 border-slate-700/50 dark:border-slate-600/30',
    'administration': 'bg-gray-900/30 dark:bg-gray-950/40 text-gray-700 dark:text-gray-300 border-gray-700/50 dark:border-gray-600/30',
    'insurance': 'bg-emerald-900/30 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-700/50 dark:border-emerald-600/30',
    
    // Operacional
    'utilities': 'bg-yellow-900/30 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border-yellow-700/50 dark:border-yellow-600/30',
    'supplies': 'bg-orange-900/30 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-700/50 dark:border-orange-600/30',
    'tools': 'bg-zinc-900/30 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 border-zinc-700/50 dark:border-zinc-600/30',
    'safety': 'bg-rose-900/30 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-700/50 dark:border-rose-600/30',
    
    // Personal
    'salary': 'bg-green-900/30 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-700/50 dark:border-green-600/30',
    'food': 'bg-pink-900/30 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-700/50 dark:border-pink-600/30',
    'accommodation': 'bg-fuchsia-900/30 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-700/50 dark:border-fuchsia-600/30',
    
    // General
    'other': 'bg-neutral-900/30 dark:bg-neutral-950/40 text-neutral-700 dark:text-neutral-300 border-neutral-700/50 dark:border-neutral-600/30',
    'general': 'bg-stone-900/30 dark:bg-stone-950/40 text-stone-700 dark:text-stone-300 border-stone-700/50 dark:border-stone-600/30',
  };

  return colors[category] || colors['general'];
};

