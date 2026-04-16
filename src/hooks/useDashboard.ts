import { useState, useEffect } from 'react';
import { supabase, getCurrentUserId } from '../lib/supabase';
import { Expense } from '../types/database';
import { useAuthStore } from '../store/authStore';

export interface ProjectSummary {
  status: string;
  sale_amount: number;
  real_cost: number;
  real_margin: number;
  created_at: string;
}

export interface ExpenseWithProject extends Expense {
  projects?: { name: string; custom_id: string };
}

interface MonthlyExpense {
  amount: number;
  date: string;
  category: string;
}

interface ProjectWithExpenses {
  id: string;
  name: string;
  custom_id: string;
  client: string;
  status: string;
  sale_amount: number;
  real_cost: number;
  real_margin: number;
  expenses?: [{ count: number }];
}

export const useDashboard = () => {
  const [rawProjects, setRawProjects] = useState<ProjectSummary[]>([]);
  const [rawExpenses, setRawExpenses] = useState<ExpenseWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      if (!activeOrganizationId) {
        setRawProjects([]);
        setRawExpenses([]);
        return;
      }

      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('status, sale_amount, real_cost, real_margin, created_at')
        .eq('organization_id', activeOrganizationId);

      if (projectsError) throw projectsError;

      const { data: recentExpenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          projects (name, custom_id)
        `)
        .eq('organization_id', activeOrganizationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (expensesError) throw expensesError;

      setRawProjects(projects as ProjectSummary[] || []);
      setRawExpenses(recentExpenses as ExpenseWithProject[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyStats = async (months: number = 12) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    if (!activeOrganizationId) {
      return [];
    }

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount, date, category')
      .eq('organization_id', activeOrganizationId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date');

    if (error) throw error;

    const expensesData = expenses as MonthlyExpense[] || [];
    const monthlyData = expensesData.reduce((acc, expense) => {
      const month = expense.date.substring(0, 7);
      if (!acc[month]) {
        acc[month] = { total: 0, expenses: 0 };
      }
      acc[month].total += expense.amount;
      acc[month].expenses += 1;
      return acc;
    }, {} as Record<string, { total: number; expenses: number }>);

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      total: data.total,
      expenses: data.expenses,
    }));
  };

  const getProjectsOverview = async () => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    if (!activeOrganizationId) {
      return [];
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        custom_id,
        client,
        status,
        sale_amount,
        real_cost,
        real_margin,
        expenses (count)
      `)
      .eq('organization_id', activeOrganizationId)
      .order('created_at', { ascending: false});

    if (error) throw error;

    return (projects as ProjectWithExpenses[] || []).map(project => ({
      ...project,
      margin_percentage: project.sale_amount > 0 
        ? (project.real_margin / project.sale_amount) * 100 
        : 0,
      expense_count: project.expenses?.[0]?.count || 0,
      progress_percentage: project.sale_amount > 0 
        ? Math.min((project.real_cost / project.sale_amount) * 100, 100)
        : 0,
    }));
  };

  useEffect(() => {
    if (activeOrganizationId) {
      fetchDashboardData();
    }
  }, [activeOrganizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    rawProjects,
    rawExpenses,
    loading,
    error,
    refetch: fetchDashboardData,
    getMonthlyStats,
    getProjectsOverview,
  };
};
