import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUserId, uploadProjectDocument } from '../lib/supabase';
import { Project, CreateProjectDTO, UpdateProjectDTO, ProjectStats, ProjectStatus } from '../types/database';

export interface ProjectDocumentFiles {
  purchase_order?: File | null;
  hes?: File | null;
  sale_invoice?: File | null;
}
import { useAuthStore } from '../store/authStore';

type ProjectDocumentType = keyof ProjectDocumentFiles;

const assignProjectDocument = (
  target: UpdateProjectDTO,
  docType: ProjectDocumentType,
  result: { url: string; filename: string },
) => {
  if (docType === 'purchase_order') {
    target.purchase_order_url = result.url;
    target.purchase_order_filename = result.filename;
  } else if (docType === 'hes') {
    target.hes_url = result.url;
    target.hes_filename = result.filename;
  } else {
    target.sale_invoice_url = result.url;
    target.sale_invoice_filename = result.filename;
  }
};

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      if (!activeOrganizationId) {
        setProjects([]);
        setError('No hay organización activa');
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', activeOrganizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId]);

  const createProject = async (projectData: CreateProjectDTO, files?: ProjectDocumentFiles): Promise<Project> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');
    if (!activeOrganizationId) throw new Error('No hay organización activa');

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
      organization_id: activeOrganizationId,
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    // Subir documentos si existen
    if (files && Object.values(files).some(Boolean)) {
      const docUpdates: UpdateProjectDTO = {};
      const docTypes = ['purchase_order', 'hes', 'sale_invoice'] as const;
      for (const docType of docTypes) {
        const file = files[docType];
        if (file) {
          const result = await uploadProjectDocument(file, data.id, docType);
          assignProjectDocument(docUpdates, docType, result);
        }
      }
      if (Object.keys(docUpdates).length > 0) {
        await supabase.from('projects').update(docUpdates).eq('id', data.id);
      }
    }

    await fetchProjects();
    return data;
  };

  const updateProject = async (id: string, projectData: UpdateProjectDTO, files?: ProjectDocumentFiles): Promise<Project> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const updateData = { ...projectData };
    if (projectData.sale_amount !== undefined || projectData.projected_cost !== undefined) {
      const current = projects.find(p => p.id === id);
      if (current) {
        const sale_amount = projectData.sale_amount ?? current.sale_amount;
        const projected_cost = projectData.projected_cost ?? current.projected_cost;
        updateData.projected_margin = sale_amount - projected_cost;
        updateData.real_margin = sale_amount - current.real_cost;
      }
    }

    // Subir documentos nuevos si existen
    if (files) {
      const docTypes = ['purchase_order', 'hes', 'sale_invoice'] as const;
      for (const docType of docTypes) {
        const file = files[docType];
        if (file) {
          const result = await uploadProjectDocument(file, id, docType);
          assignProjectDocument(updateData, docType, result);
        }
      }
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchProjects();
    return data;
  };

  const deleteProject = async (id: string): Promise<void> => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

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

    if (!activeOrganizationId) {
      return [];
    }

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
      .eq('organization_id', activeOrganizationId);

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

    if (!activeOrganizationId) return false;

    let query = supabase
      .from('projects')
      .select('id')
      .eq('organization_id', activeOrganizationId)
      .eq('custom_id', customId);

    if (excludeProjectId) {
      query = query.neq('id', excludeProjectId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).length === 0;
  };

  useEffect(() => {
    if (activeOrganizationId) {
      fetchProjects();
    }
  }, [activeOrganizationId, fetchProjects]);

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

  const fetchProject = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
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

  useEffect(() => {
    fetchProject();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { project, loading, error, refetch: fetchProject };
};
