import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCreditAlertStatus } from '../lib/creditAlerts';
import { useAuthStore } from '../store/authStore';
import { Expense } from '../types/database';

export interface CreditExpense extends Expense {
  projects?: {
    name: string;
    custom_id: string;
  } | null;
}

export const useCreditAlerts = () => {
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);
  const [credits, setCredits] = useState<CreditExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  const fetchCredits = useCallback(async () => {
    if (!activeOrganizationId) {
      setCredits([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('expenses')
        .select(`
          *,
          projects!expenses_project_organization_fkey (name, custom_id)
        `)
        .eq('organization_id', activeOrganizationId)
        .eq('status', 'credit')
        .order('credit_due_date', { ascending: true, nullsFirst: false });

      if (fetchError) throw fetchError;
      setCredits((data as CreditExpense[]) || []);
    } catch (err) {
      setCredits([]);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los créditos');
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId]);

  useEffect(() => {
    fetchCredits();

    const handleExpensesChanged = () => fetchCredits();
    window.addEventListener('rendix:expenses-changed', handleExpensesChanged);
    return () => window.removeEventListener('rendix:expenses-changed', handleExpensesChanged);
  }, [fetchCredits]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const summary = useMemo(() => {
    const today = new Date(clock);
    const actionable = credits.filter(credit => {
      const alert = getCreditAlertStatus(credit, today);
      return alert && alert.level !== 'later';
    });

    return {
      actionable,
      overdue: actionable.filter(credit => getCreditAlertStatus(credit, today)?.level === 'overdue'),
      urgent: actionable.filter(credit => getCreditAlertStatus(credit, today)?.level === 'urgent'),
      upcoming: actionable.filter(credit => getCreditAlertStatus(credit, today)?.level === 'upcoming'),
      missing: actionable.filter(credit => getCreditAlertStatus(credit, today)?.level === 'missing'),
      totalAmount: credits.reduce((total, credit) => total + (credit.amount || 0), 0),
    };
  }, [credits, clock]);

  return { credits, loading, error, refetch: fetchCredits, ...summary };
};
