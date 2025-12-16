import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Shield, Users, Building2, AlertCircle } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, Button } from '../components/ui';
import { useOrganizationMembers } from '../hooks/useOrganizationMembers';
import { useAuthStore } from '../store/authStore';
import { useOrganizations } from '../hooks/useOrganizations';
import { OrganizationRole, ORGANIZATION_ROLES } from '../types/database';

export function Settings() {
  const { members, loading, error, fetchMembers, addMemberByEmail, updateMemberRole, removeMember } = useOrganizationMembers();
  const { user } = useAuthStore();
  const { organizations } = useOrganizations();
  const activeOrganizationId = useAuthStore(state => state.activeOrganizationId);
  
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<OrganizationRole>('member');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');

  const activeOrg = organizations.find(org => org.id === activeOrganizationId);
  const isOwner = activeOrg?.is_owner || false;
  const isAdmin = activeOrg?.user_role === 'admin' || isOwner;

  useEffect(() => {
    if (activeOrganizationId) {
      fetchMembers();
    }
  }, [activeOrganizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMemberError('');
    setAddingMember(true);

    try {
      await addMemberByEmail(newMemberEmail.trim(), newMemberRole);
      setNewMemberEmail('');
      setNewMemberRole('member');
      setShowAddMemberForm(false);
    } catch (err) {
      setAddMemberError(err instanceof Error ? err.message : 'Error al agregar miembro');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${memberEmail} de la organización?`)) {
      return;
    }

    try {
      await removeMember(memberId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar miembro');
    }
  };

  if (!activeOrganizationId) {
    return (
      <Layout title="Configuración" subtitle="Gestiona tu organización y preferencias">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Building2 className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  No estás añadido en ninguna organización
                </h3>
                <p className="text-sm text-yellow-800 max-w-md">
                  Para acceder a la configuración, necesitas ser agregado a una organización.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Configuración" subtitle="Gestiona tu organización y preferencias">
      <div className="space-y-6">
        {/* Información de la Organización */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Información de la Organización</h2>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Nombre:</span>
                <p className="font-medium text-gray-900">{activeOrg?.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Tu rol:</span>
                <p className="font-medium text-gray-900 capitalize">{activeOrg?.user_role}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total de miembros:</span>
                <p className="font-medium text-gray-900">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gestión de Miembros */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Miembros de la Organización</h2>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => setShowAddMemberForm(!showAddMemberForm)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Agregar Miembro
                </Button>
              )}
            </div>

            {!isAdmin && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Solo los administradores pueden gestionar miembros.
                  </p>
                </div>
              </div>
            )}

            {/* Formulario para agregar miembro */}
            {showAddMemberForm && isAdmin && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email del usuario
                      </label>
                      <input
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="usuario@ejemplo.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        El usuario debe estar registrado en Rendix
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rol
                      </label>
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as OrganizationRole)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ORGANIZATION_ROLES.filter(r => r.value !== 'owner').map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label} - {role.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {addMemberError && (
                      <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                        {addMemberError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={addingMember}
                        className="flex-1"
                      >
                        {addingMember ? 'Agregando...' : 'Agregar Miembro'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowAddMemberForm(false);
                          setNewMemberEmail('');
                          setAddMemberError('');
                        }}
                        variant="secondary"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Lista de miembros */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No hay miembros en esta organización</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.user_email || 'Email no disponible'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded capitalize">
                            {member.role}
                          </span>
                          {member.user_id === user?.id && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                              Tú
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAdmin && member.user_id !== user?.id && (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value as OrganizationRole)}
                          className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={member.role === 'owner'}
                        >
                          {ORGANIZATION_ROLES.map(role => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.id, member.user_email)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar miembro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

