import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Organization, OrganizationMember, OrganizationWithRole, OrganizationRole } from '../types/database';

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener organizaciones donde el usuario es miembro
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;
      if (!memberships || memberships.length === 0) {
        setOrganizations([]);
        return;
      }

      const orgIds = memberships.map(m => m.organization_id);

      // Obtener detalles de las organizaciones
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (orgsError) throw orgsError;

      // Combinar datos
      const orgsWithRoles: OrganizationWithRole[] = (orgsData || []).map(org => {
        const membership = memberships.find(m => m.organization_id === org.id);
        return {
          ...org,
          user_role: membership?.role as OrganizationRole || 'viewer',
          is_owner: org.owner_id === user.id
        };
      });

      setOrganizations(orgsWithRoles);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar organizaciones');
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (name: string, slug?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Generar slug si no se proporciona
      const finalSlug = slug || name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name,
          slug: finalSlug,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Refrescar lista
      await fetchOrganizations();

      return data as Organization;
    } catch (err) {
      console.error('Error creating organization:', err);
      throw err;
    }
  };

  const updateOrganization = async (id: string, updates: Partial<Organization>) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchOrganizations();
    } catch (err) {
      console.error('Error updating organization:', err);
      throw err;
    }
  };

  const deleteOrganization = async (id: string) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchOrganizations();
    } catch (err) {
      console.error('Error deleting organization:', err);
      throw err;
    }
  };

  return {
    organizations,
    loading,
    error,
    refresh: fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization
  };
}

export function useOrganizationMembers(organizationId: string | null) {
  const [members, setMembers] = useState<(OrganizationMember & { email?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchMembers();
    }
  }, [organizationId]);

  const fetchMembers = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      // Obtener emails de los usuarios
      if (data && data.length > 0) {
        // Si no podemos acceder a auth.users, solo retornamos los miembros sin email
        const membersWithEmail = data.map(member => ({
          ...member,
          email: undefined // TODO: obtener email de otra forma
        }));

        setMembers(membersWithEmail);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar miembros');
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (email: string, role: OrganizationRole = 'member') => {
    if (!organizationId) return;

    try {
      // Buscar usuario por email
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError) throw new Error('Usuario no encontrado');

      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: userData.id,
          role
        });

      if (error) throw error;

      await fetchMembers();
    } catch (err) {
      console.error('Error adding member:', err);
      throw err;
    }
  };

  const updateMemberRole = async (memberId: string, role: OrganizationRole) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
    } catch (err) {
      console.error('Error updating member role:', err);
      throw err;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
    } catch (err) {
      console.error('Error removing member:', err);
      throw err;
    }
  };

  return {
    members,
    loading,
    error,
    refresh: fetchMembers,
    addMember,
    updateMemberRole,
    removeMember
  };
}

