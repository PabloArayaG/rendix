import { useState, useEffect } from 'react';
import { supabase, getCurrentUserId } from '../lib/supabase';
import { OrganizationWithRole } from '../types/database';

export const useOrganizations = () => {
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = await getCurrentUserId();
      if (!userId) {
        console.log('No user ID found');
        throw new Error('Usuario no autenticado');
      }

      console.log('Fetching organizations for user:', userId);

      // Obtener organizaciones donde el usuario es miembro
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization_id,
          organizations (
            id,
            name,
            slug,
            owner_id,
            logo_url,
            settings,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (membershipsError) {
        console.error('Error fetching memberships:', membershipsError);
        throw membershipsError;
      }

      console.log('Memberships found:', memberships);

      if (!memberships || memberships.length === 0) {
        console.log('No organizations found for user');
        setOrganizations([]);
        return;
      }

      // Mapear las organizaciones con el rol del usuario
      const orgsWithRole = memberships
        .filter(m => m.organizations) // Filtrar null/undefined
        .map(m => {
          const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
          return {
            ...org,
            user_role: m.role,
            is_owner: org.owner_id === userId,
          } as OrganizationWithRole;
        });

      console.log('Organizations with roles:', orgsWithRole);
      setOrganizations(orgsWithRole);
    } catch (err) {
      console.error('Error in fetchOrganizations:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return {
    organizations,
    loading,
    error,
    refetch: fetchOrganizations,
  };
};

