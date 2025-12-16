import { useState, useEffect } from 'react';
import { supabase, getCurrentUserId } from '../lib/supabase';
import { DashboardStats, Expense } from '../types/database';
import { useAuthStore } from '../store/authStore';

// Tipos para las consultas de dashboard
interface ProjectSummary {
  status: string;
  sale_amount: number;
  real_cost: number;
  real_margin: number;
}

interface ExpenseWithProject extends Expense {
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      if (!activeOrganizationId) {
        setStats(null);
        return;
      }

      // Obtener estadísticas de proyectos
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('status, sale_amount, real_cost, real_margin')
        .eq('organization_id', activeOrganizationId);

      if (projectsError) throw projectsError;

      // Obtener gastos recientes
      const { data: recentExpenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          projects (name, custom_id)
        `)
        .eq('organization_id', activeOrganizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (expensesError) throw expensesError;

      // Calcular estadísticas
      const projectsData = projects as ProjectSummary[] || [];
      const totalProjects = projectsData.length;
      const activeProjects = projectsData.filter(p => p.status === 'in_progress' || p.status === 'active').length;
      const completedProjects = projectsData.filter(p => p.status === 'completed').length;
      
      const totalSales = projectsData.reduce((sum, p) => sum + p.sale_amount, 0);
      const totalCosts = projectsData.reduce((sum, p) => sum + p.real_cost, 0);
      const totalMargin = projectsData.reduce((sum, p) => sum + p.real_margin, 0);
      const marginPercentage = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0;

      setStats({
        total_projects: totalProjects,
        active_projects: activeProjects,
        completed_projects: completedProjects,
        total_sales: totalSales,
        total_costs: totalCosts,
        total_margin: totalMargin,
        margin_percentage: marginPercentage,
        recent_expenses: recentExpenses as ExpenseWithProject[] || [],
      });
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

    // Agrupar por mes
    const expensesData = expenses as MonthlyExpense[] || [];
    const monthlyData = expensesData.reduce((acc, expense) => {
      const month = expense.date.substring(0, 7); // YYYY-MM
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
      fetchDashboardStats();
    }
  }, [activeOrganizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    stats,
    loading,
    error,
    refetch: fetchDashboardStats,
    getMonthlyStats,
    getProjectsOverview,
  };
};
