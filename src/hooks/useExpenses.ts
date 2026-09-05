import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUserId, uploadReceipt, deleteReceipt } from '../lib/supabase';
import { Expense, CreateExpenseDTO, UpdateExpenseDTO, ExpensesByCategory, ExpenseCategory } from '../types/database';
import { useAuthStore } from '../store/authStore';

const notifyExpensesChanged = () => {
  window.dispatchEvent(new CustomEvent('rendix:expenses-changed'));
};

export const useExpenses = (projectId?: string) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      if (!activeOrganizationId) {
        setExpenses([]);
        return;
      }

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', activeOrganizationId)
        .order('date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId, projectId]);

  const createExpense = async (
    expenseData: CreateExpenseDTO, 
    receiptFile?: File
  ): Promise<Expense> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    if (!activeOrganizationId) throw new Error('No hay organización activa');

    const finalData = {
      ...expenseData,
      tags: expenseData.tags || [],
      metadata: {},
      user_id: userId,
      organization_id: activeOrganizationId,
    };

    // Crear el gasto primero
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert(finalData)
      .select()
      .single();

    if (error) throw error;

    // Subir comprobante si existe
    if (receiptFile) {
      try {
        const receipt = await uploadReceipt(receiptFile, expenseData.project_id, expense.id);
        
        // Actualizar el gasto con la información del comprobante
        const { data: updatedExpense, error: updateError } = await supabase
          .from('expenses')
          .update({
            receipt_url: receipt.url,
            receipt_filename: receipt.filename,
          })
          .eq('id', expense.id)
          .select()
          .single();

        if (updateError) throw updateError;
        
        // El trigger de Supabase actualiza automáticamente los costos
        await fetchExpenses();
        notifyExpensesChanged();
        return updatedExpense;
      } catch (receiptError) {
        // Si falla la subida del comprobante, eliminar el gasto creado
        await supabase.from('expenses').delete().eq('id', expense.id);
        throw receiptError;
      }
    }

    // El trigger de Supabase actualiza automáticamente los costos
    await fetchExpenses();
    notifyExpensesChanged();
    return expense;
  };

  const updateExpense = async (
    id: string, 
    expenseData: UpdateExpenseDTO,
    receiptFile?: File
  ): Promise<Expense> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const currentExpense = expenses.find(e => e.id === id);
    if (!currentExpense) throw new Error('Gasto no encontrado');

    const updateData = { ...expenseData };

    // Manejar archivo de comprobante
    if (receiptFile) {
      // Eliminar comprobante anterior si existe
      if (currentExpense.receipt_url) {
        try {
          await deleteReceipt(currentExpense.receipt_url);
        } catch (deleteError) {
          console.warn('Error eliminando comprobante anterior:', deleteError);
        }
      }

      // Subir nuevo comprobante
      const receipt = await uploadReceipt(receiptFile, currentExpense.project_id, id);
      updateData.receipt_url = receipt.url;
      updateData.receipt_filename = receipt.filename;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // El trigger de Supabase actualiza automáticamente los costos
    await fetchExpenses();
    notifyExpensesChanged();
    return data;
  };

  const deleteExpense = async (id: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const expense = expenses.find(e => e.id === id);
    if (!expense) throw new Error('Gasto no encontrado');

    // Eliminar comprobante si existe
    if (expense.receipt_url) {
      try {
        await deleteReceipt(expense.receipt_url);
      } catch (deleteError) {
        console.warn('Error eliminando comprobante:', deleteError);
      }
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // El trigger de Supabase ya actualiza automáticamente los costos del proyecto
    // No necesitamos llamar a updateProjectCosts manualmente
    await fetchExpenses();
    notifyExpensesChanged();
  };

  const getExpensesByCategory = async (projectId?: string): Promise<ExpensesByCategory[]> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    if (!activeOrganizationId) {
      return [];
    }

    let query = supabase
      .from('expenses')
      .select('category, net_amount')
      .eq('organization_id', activeOrganizationId);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Agrupar por categoría
    interface CategorySummary {
      category: string;
      net_amount: number;
    }
    
    const expenseData = data as CategorySummary[] || [];
    const grouped = expenseData.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = { total_amount: 0, expense_count: 0 };
      }
      acc[category].total_amount += expense.net_amount || 0;
      acc[category].expense_count += 1;
      return acc;
    }, {} as Record<string, { total_amount: number; expense_count: number }>);

    const total = Object.values(grouped).reduce((sum, categoryStats) => sum + categoryStats.total_amount, 0);

    return Object.entries(grouped).map(([category, stats]) => ({
      category: category as ExpenseCategory,
      total_amount: stats.total_amount,
      expense_count: stats.expense_count,
      percentage: total > 0 ? (stats.total_amount / total) * 100 : 0,
    }));
  };

  // Ya no necesitamos esta función porque el trigger de Supabase
  // actualiza automáticamente los costos del proyecto usando net_amount

  useEffect(() => {
    if (activeOrganizationId) {
      fetchExpenses();
    }
  }, [activeOrganizationId, fetchExpenses]);

  return {
    expenses,
    loading,
    error,
    refetch: fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpensesByCategory,
  };
};

export const useExpense = (id: string) => {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchExpense = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Usuario no autenticado');

        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setExpense(null);
            setError('Gasto no encontrado');
          } else {
            throw error;
          }
        } else {
          setExpense(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [id]);

  return { expense, loading, error };
};
