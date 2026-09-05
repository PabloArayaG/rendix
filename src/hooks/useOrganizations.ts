import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUserId } from '../lib/supabase';
import { OrganizationRole, OrganizationWithRole } from '../types/database';

interface OrganizationRpcRow {
  org_id: string;
  org_name: string;
  org_slug: string;
  user_role: OrganizationRole;
  is_owner: boolean;
}

export const useOrganizations = () => {
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      // Usar función RPC que sabemos que funciona
      const { data: orgsData, error: rpcError } = await supabase
        .rpc('get_user_organizations', { user_uuid: userId });

      if (rpcError) {
        console.error('Error calling get_user_organizations:', rpcError);
        throw rpcError;
      }

      if (!orgsData || orgsData.length === 0) {
        setOrganizations([]);
        return;
      }

      // Mapear al formato esperado
      const orgsWithRole: OrganizationWithRole[] = (orgsData as OrganizationRpcRow[]).map(org => ({
        id: org.org_id,
        name: org.org_name,
        slug: org.org_slug,
        owner_id: '', // No lo necesitamos desde RPC
        user_role: org.user_role,
        is_owner: org.is_owner,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        logo_url: undefined,
        settings: {}
      }));

      setOrganizations(orgsWithRole);
    } catch (err) {
      console.error('Error in fetchOrganizations:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return {
    organizations,
    loading,
    error,
    refetch: fetchOrganizations,
  };
};

