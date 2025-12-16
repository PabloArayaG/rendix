import { useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useAuthStore } from '../../store/authStore';

export function OrganizationSelector() {
  const { organizations, loading } = useOrganizations();
  const { activeOrganizationId, setActiveOrganization } = useAuthStore();

  // Establecer la primera organización como activa si no hay ninguna seleccionada
  useEffect(() => {
    if (!activeOrganizationId && organizations.length > 0) {
      setActiveOrganization(organizations[0].id);
    }
  }, [organizations, activeOrganizationId, setActiveOrganization]);

  const activeOrg = organizations.find(org => org.id === activeOrganizationId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <Building2 className="w-4 h-4 text-gray-400" />
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return null;
  }

  // Si solo hay una organización, mostrar sin dropdown
  if (organizations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
        <Building2 className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">{activeOrg?.name}</span>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
        <Building2 className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-900">
          {activeOrg?.name || 'Seleccionar organización'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {/* Dropdown */}
      <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase">Tus Organizaciones</p>
        </div>
        
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => setActiveOrganization(org.id)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-gray-400" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{org.name}</p>
                <p className="text-xs text-gray-500 capitalize">{org.user_role}</p>
              </div>
            </div>
            
            {org.id === activeOrganizationId && (
              <Check className="w-4 h-4 text-blue-600" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

