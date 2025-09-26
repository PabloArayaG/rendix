import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utilidades para formateo de números
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

export const formatPercentage = (percentage: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percentage / 100);
};

// Utilidades para fechas
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

export const formatShortDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

// Función para convertir Date a string en formato YYYY-MM-DD (para inputs date)
export const formatDateForInput = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  let d: Date;
  if (typeof date === 'string') {
    // Si viene del backend como "YYYY-MM-DD", tratarlo como fecha local
    d = new Date(date + 'T00:00:00');
  } else {
    d = date;
  }
  
  // Formatear como YYYY-MM-DD para input date
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Función para convertir input date string a formato correcto para envío
export const parseInputDate = (dateString: string): string => {
  if (!dateString) return '';
  // Ya viene en formato YYYY-MM-DD del input, no necesita conversión
  return dateString;
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

// Utilidad para obtener el color según el estado del proyecto
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'in_progress':
      return 'text-blue-600 bg-blue-100';
    case 'completed':
      return 'text-green-600 bg-green-100';
    // Mantener compatibilidad con estados anteriores
    case 'active':
      return 'text-blue-600 bg-blue-100';
    case 'on_hold':
      return 'text-yellow-600 bg-yellow-100';
    case 'cancelled':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

// Utilidad para obtener el color según el margen
export const getMarginColor = (marginPercentage: number): string => {
  if (marginPercentage >= 20) return 'text-green-600';
  if (marginPercentage >= 10) return 'text-yellow-600';
  if (marginPercentage >= 0) return 'text-orange-600';
  return 'text-red-600';
};

// Utilidad para obtener el color según el estado del gasto
export const getExpenseStatusColor = (status: string): string => {
  switch (status) {
    case 'provision':
      return 'text-yellow-600 bg-yellow-100';
    case 'paid':
      return 'text-green-600 bg-green-100';
    case 'credit':
      return 'text-blue-600 bg-blue-100';
    case 'advance':
      return 'text-purple-600 bg-purple-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

// Utilidad para validar archivos
export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const isValidFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

// Utilidad para generar colores para gráficos
export const generateColors = (count: number): string[] => {
  const baseColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  ];
  
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  
  return colors;
};

// Utilidad para debounce
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Utilidad para generar ID único
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};
