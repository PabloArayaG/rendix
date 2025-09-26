import { useState, useEffect } from 'react';
import { supabase, getCurrentUserId } from '../lib/supabase';
import { Project, CreateProjectDTO, UpdateProjectDTO, ProjectStats, ProjectStatus } from '../types/database';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: CreateProjectDTO): Promise<Project> => {
    console.log('useProjects.createProject - Iniciando...'); // Debug
    
    const userId = await getCurrentUserId();
    console.log('User ID obtenido:', userId); // Debug
    
    if (!userId) throw new Error('Usuario no autenticado');

    // Calcular margen proyectado
    const projected_margin = projectData.sale_amount - projectData.projected_cost;
    
    const insertData = {
      ...projectData,
      projected_margin,
      real_cost: 0,
      real_margin: projectData.sale_amount,
      status: 'in_progress' as ProjectStatus,
      tags: projectData.tags || [],
      metadata: {},
      user_id: userId,
    };
    
    console.log('Datos a insertar en Supabase:', insertData); // Debug

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    console.log('Respuesta de Supabase:', { data, error }); // Debug

    if (error) {
      console.error('Error de Supabase:', error); // Debug
      throw error;
    }
    
    console.log('Proyecto creado exitosamente, refrescando lista...'); // Debug
    await fetchProjects(); // Refrescar la lista
    return data;
  };

  const updateProject = async (id: string, projectData: UpdateProjectDTO): Promise<Project> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    // Si se actualizan los montos, recalcular margen proyectado
    let updateData = { ...projectData };
    if (projectData.sale_amount !== undefined || projectData.projected_cost !== undefined) {
      const current = projects.find(p => p.id === id);
      if (current) {
        const sale_amount = projectData.sale_amount ?? current.sale_amount;
        const projected_cost = projectData.projected_cost ?? current.projected_cost;
        updateData.projected_margin = sale_amount - projected_cost;
        updateData.real_margin = sale_amount - current.real_cost;
      }
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    await fetchProjects(); // Refrescar la lista
    return data;
  };

  const deleteProject = async (id: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    
    await fetchProjects(); // Refrescar la lista
  };

  const getProject = async (id: string): Promise<Project | null> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }
    
    return data;
  };

  const getProjectStats = async (): Promise<ProjectStats[]> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        custom_id,
        client,
        sale_amount,
        real_cost,
        real_margin,
        status,
        expenses:expenses(count)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    interface ProjectWithExpenseCount {
      id: string;
      name: string;
      custom_id: string;
      client: string;
      sale_amount: number;
      real_cost: number;
      real_margin: number;
      status: ProjectStatus;
      expenses?: [{ count: number }];
    }
    
    const projectsData = data as ProjectWithExpenseCount[] || [];
    return projectsData.map(project => ({
      ...project,
      margin_percentage: project.sale_amount > 0 
        ? (project.real_margin / project.sale_amount) * 100 
        : 0,
      expense_count: project.expenses?.[0]?.count || 0,
    }));
  };

  const canEditProject = (project: Project): boolean => {
    return project.status === 'in_progress';
  };

  const canDeleteProject = (project: Project): boolean => {
    return project.status === 'in_progress' && project.real_cost === 0;
  };

  const validateCustomId = async (customId: string, excludeProjectId?: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    let query = supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .eq('custom_id', customId);

    if (excludeProjectId) {
      query = query.neq('id', excludeProjectId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).length === 0;
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProject,
    getProjectStats,
    canEditProject,
    canDeleteProject,
    validateCustomId,
  };
};

export const useProject = (id: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Usuario no autenticado');

        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setProject(null);
            setError('Proyecto no encontrado');
          } else {
            throw error;
          }
        } else {
          setProject(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  return { project, loading, error };
};
