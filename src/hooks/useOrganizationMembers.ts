import { useState } from 'react';
import { supabase, getCurrentUserId } from '../lib/supabase';
import { OrganizationRole } from '../types/database';
import { useAuthStore } from '../store/authStore';

export interface OrganizationMemberWithUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  joined_at: string;
  user_email: string;
}

export const useOrganizationMembers = () => {
  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);

  const fetchMembers = async () => {
    if (!activeOrganizationId) {
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      // Obtener miembros de la organización activa
      const { data, error: fetchError } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          joined_at
        `)
        .eq('organization_id', activeOrganizationId)
        .order('joined_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Usar función RPC para obtener miembros con emails
      const { data: membersWithEmails, error: rpcError } = await supabase
        .rpc('get_organization_members_with_emails', { org_id: activeOrganizationId });

      if (!rpcError && membersWithEmails) {
        const finalMembers = membersWithEmails.map((m: any) => ({
          id: m.id,
          organization_id: m.organization_id,
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at,
          user_email: m.user_email || 'Email no disponible',
        }));

        setMembers(finalMembers);
      } else {
        // Fallback: usar función RPC para obtener emails individualmente
        const memberIds = (data || []).map(m => m.user_id);
        
        if (memberIds.length > 0) {
          const { data: emailsData, error: emailsError } = await supabase
            .rpc('get_user_emails', { user_ids: memberIds });

          if (!emailsError && emailsData) {
            const emailMap = new Map(
              emailsData.map((e: any) => [e.user_id, e.email])
            );
            
            const finalMembers = (data || []).map(member => ({
              ...member,
              user_email: emailMap.get(member.user_id) || 'Email no disponible',
            }));

            setMembers(finalMembers);
          } else {
            // Último fallback: miembros sin email
            setMembers((data || []).map(member => ({
              ...member,
              user_email: 'Email no disponible',
            })));
          }
        } else {
          setMembers([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const addMemberByEmail = async (email: string, role: OrganizationRole = 'member') => {
    if (!activeOrganizationId) {
      throw new Error('No hay organización activa');
    }

    try {
      setLoading(true);
      setError(null);

      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Usuario no autenticado');

      // Buscar el user_id del email usando una función RPC
      const { data: userData, error: userError } = await supabase
        .rpc('get_user_id_by_email', { user_email: email });

      if (userError) {
        throw new Error('Error al buscar usuario: ' + userError.message);
      }

      if (!userData || userData.length === 0 || !userData[0]?.user_id) {
        throw new Error('Usuario no encontrado. Asegúrate de que el usuario ya esté registrado en Rendix.');
      }

      const targetUserId = userData[0].user_id;

      // Verificar que el usuario no esté ya en la organización
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', activeOrganizationId)
        .eq('user_id', targetUserId)
        .single();

      if (existingMember) {
        throw new Error('Este usuario ya es miembro de la organización');
      }

      // Agregar el miembro
      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: activeOrganizationId,
          user_id: targetUserId,
          role,
        });

      if (insertError) throw insertError;

      // Refrescar la lista
      await fetchMembers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al agregar miembro';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: OrganizationRole) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar rol');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar miembro');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    members,
    loading,
    error,
    fetchMembers,
    addMemberByEmail,
    updateMemberRole,
    removeMember,
  };
};

