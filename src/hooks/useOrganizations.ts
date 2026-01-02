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

      // Usar función RPC que sabemos que funciona
      const { data: orgsData, error: rpcError } = await supabase
        .rpc('get_user_organizations', { user_uuid: userId });

      if (rpcError) {
        console.error('Error calling get_user_organizations:', rpcError);
        throw rpcError;
      }

      console.log('Organizations from RPC:', orgsData);

      if (!orgsData || orgsData.length === 0) {
        console.log('No organizations found for user');
        setOrganizations([]);
        return;
      }

      // Mapear al formato esperado
      const orgsWithRole: OrganizationWithRole[] = orgsData.map((org: any) => ({
        id: org.org_id,
        name: org.org_name,
        slug: org.org_slug,
        owner_id: '', // No lo necesitamos desde RPC
        user_role: org.user_role,
        is_owner: org.is_owner,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        logo_url: null,
        settings: {}
      }));

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

