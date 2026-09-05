import { Expense } from '../types/database';

export const CREDIT_WARNING_DAYS = 30;
export const CREDIT_URGENT_DAYS = 7;

export type CreditAlertLevel = 'overdue' | 'urgent' | 'upcoming' | 'missing' | 'later';

export interface CreditAlertStatus {
  level: CreditAlertLevel;
  daysUntilDue: number | null;
  label: string;
}

const dateToUtcDay = (date: string | Date): number => {
  if (typeof date === 'string') {
    const [year, month, day] = date.substring(0, 10).split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }

  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getDaysUntilDue = (dueDate: string, today: Date = new Date()): number => {
  return Math.round((dateToUtcDay(dueDate) - dateToUtcDay(today)) / 86_400_000);
};

export const getCreditAlertStatus = (
  expense: Pick<Expense, 'status' | 'credit_due_date'>,
  today: Date = new Date(),
): CreditAlertStatus | null => {
  if (expense.status !== 'credit') return null;

  if (!expense.credit_due_date) {
    return { level: 'missing', daysUntilDue: null, label: 'Sin fecha de vencimiento' };
  }

  const daysUntilDue = getDaysUntilDue(expense.credit_due_date, today);

  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue);
    return {
      level: 'overdue',
      daysUntilDue,
      label: `Vencido hace ${overdueDays} ${overdueDays === 1 ? 'día' : 'días'}`,
    };
  }

  if (daysUntilDue === 0) {
    return { level: 'urgent', daysUntilDue, label: 'Vence hoy' };
  }

  if (daysUntilDue <= CREDIT_URGENT_DAYS) {
    return {
      level: 'urgent',
      daysUntilDue,
      label: `Vence en ${daysUntilDue} ${daysUntilDue === 1 ? 'día' : 'días'}`,
    };
  }

  if (daysUntilDue <= CREDIT_WARNING_DAYS) {
    return {
      level: 'upcoming',
      daysUntilDue,
      label: `Vence en ${daysUntilDue} días`,
    };
  }

  return { level: 'later', daysUntilDue, label: `Vence en ${daysUntilDue} días` };
};

export const isActionableCredit = (expense: Pick<Expense, 'status' | 'credit_due_date'>): boolean => {
  const alert = getCreditAlertStatus(expense);
  return !!alert && alert.level !== 'later';
};

export const getCreditAlertClasses = (level: CreditAlertLevel): string => {
  switch (level) {
    case 'overdue':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
    case 'urgent':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
    case 'upcoming':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
    case 'missing':
      return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
  }
};
