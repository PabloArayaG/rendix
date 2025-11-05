import { useState, useEffect } from 'react';
import { supabase, getCurrentUserId, uploadReceipt, deleteReceipt } from '../lib/supabase';
import { Expense, CreateExpenseDTO, UpdateExpenseDTO, ExpensesByCategory, ExpenseCategory } from '../types/database';

export const useExpenses = (projectId?: string) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
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
  };

  const createExpense = async (
    expenseData: CreateExpenseDTO, 
    receiptFile?: File
  ): Promise<Expense> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    // Log de debugging detallado
    const finalData = {
      ...expenseData,
      tags: expenseData.tags || [],
      metadata: {},
      user_id: userId,
    };

    console.log('🔍 GERARDO DEBUG - Datos enviados a Supabase:', {
      finalData,
      dataTypes: {
        net_amount: typeof finalData.net_amount,
        tax_amount: typeof finalData.tax_amount,
        amount: typeof finalData.amount,
        date: typeof finalData.date,
        project_id: typeof finalData.project_id,
        user_id: typeof finalData.user_id,
      }
    });

    // Crear el gasto primero
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert(finalData)
      .select()
      .single();

    if (error) {
      console.error('🔍 GERARDO DEBUG - Error de Supabase:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        sentData: finalData,
      });
      throw error;
    }

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
        
        await updateProjectCosts(expenseData.project_id);
        await fetchExpenses();
        return updatedExpense;
      } catch (receiptError) {
        // Si falla la subida del comprobante, eliminar el gasto creado
        await supabase.from('expenses').delete().eq('id', expense.id);
        throw receiptError;
      }
    }

    await updateProjectCosts(expenseData.project_id);
    await fetchExpenses();
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

    let updateData = { ...expenseData };

    // Manejar archivo de comprobante
    if (receiptFile) {
      // Eliminar comprobante anterior si existe
      if (currentExpense.receipt_url) {
        try {
          const oldPath = currentExpense.receipt_url.split('/').slice(-3).join('/');
          await deleteReceipt(oldPath);
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
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    await updateProjectCosts(currentExpense.project_id);
    await fetchExpenses();
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
        const filePath = expense.receipt_url.split('/').slice(-3).join('/');
        await deleteReceipt(filePath);
      } catch (deleteError) {
        console.warn('Error eliminando comprobante:', deleteError);
      }
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    
    await updateProjectCosts(expense.project_id);
    await fetchExpenses();
  };

  const getExpensesByCategory = async (projectId?: string): Promise<ExpensesByCategory[]> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    let query = supabase
      .from('expenses')
      .select('category, amount')
      .eq('user_id', userId);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Agrupar por categoría
    interface CategorySummary {
      category: string;
      amount: number;
    }
    
    const expenseData = data as CategorySummary[] || [];
    const grouped = expenseData.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = { total_amount: 0, expense_count: 0 };
      }
      acc[category].total_amount += expense.amount;
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

  // Función helper para actualizar costos del proyecto
  const updateProjectCosts = async (projectId: string) => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    // Calcular costo real (suma de gastos)
    const { data: expensesSum } = await supabase
      .from('expenses')
      .select('amount')
      .eq('project_id', projectId)
      .eq('user_id', userId);

    interface ExpenseSummary {
      amount: number;
    }
    const expenseSumData = expensesSum as ExpenseSummary[] || [];
    const realCost = expenseSumData.reduce((sum, expense) => sum + expense.amount, 0);

    // Obtener información del proyecto para calcular margen real
    const { data: project } = await supabase
      .from('projects')
      .select('sale_amount')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (project) {
      const realMargin = project.sale_amount - realCost;

      // Actualizar proyecto
      await supabase
        .from('projects')
        .update({
          real_cost: realCost,
          real_margin: realMargin,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('user_id', userId);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [projectId]);

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
          .eq('user_id', userId)
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
