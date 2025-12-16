-- ========================================
-- MIGRACIÓN: SISTEMA DE ORGANIZACIONES
-- Ejecutar en: SQL Editor de Supabase Staging
-- Descripción: Agrega sistema completo de workspaces/organizaciones
-- ========================================

-- PARTE 1: Crear tablas de organizaciones
-- ========================================

-- Tabla principal de organizaciones
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly name
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata opcional
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Índices para organizaciones
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Tabla de miembros de organizaciones
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar duplicados: un usuario solo puede estar una vez en una organización
  UNIQUE(organization_id, user_id)
);

-- Índices para miembros
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

-- PARTE 2: Agregar organization_id a tablas existentes
-- ========================================

-- Agregar a proyectos
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Agregar a gastos
ALTER TABLE expenses 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization ON expenses(organization_id);

-- PARTE 3: Funciones helper
-- ========================================

-- Función para obtener las organizaciones de un usuario
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE (
  org_id UUID,
  org_name VARCHAR(255),
  org_slug VARCHAR(100),
  user_role VARCHAR(50),
  is_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    om.role,
    (o.owner_id = user_uuid) as is_owner
  FROM organizations o
  INNER JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = user_uuid
  ORDER BY om.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario pertenece a una organización
CREATE OR REPLACE FUNCTION user_belongs_to_organization(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PARTE 4: Actualizar políticas RLS
-- ========================================

-- Habilitar RLS en las nuevas tablas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA ORGANIZATIONS

-- Ver organizaciones: solo las que perteneces
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" 
  ON organizations FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members WHERE organization_id = id
    )
  );

-- Crear organizaciones: cualquier usuario autenticado
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations" 
  ON organizations FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

-- Actualizar organizaciones: solo owner y admins
DROP POLICY IF EXISTS "Organization owners and admins can update" ON organizations;
CREATE POLICY "Organization owners and admins can update" 
  ON organizations FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = id 
      AND role IN ('owner', 'admin')
    )
  );

-- Eliminar organizaciones: solo owner
DROP POLICY IF EXISTS "Only owners can delete organizations" ON organizations;
CREATE POLICY "Only owners can delete organizations" 
  ON organizations FOR DELETE 
  USING (auth.uid() = owner_id);

-- POLÍTICAS PARA ORGANIZATION_MEMBERS

-- Ver miembros: solo de organizaciones donde perteneces
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations" 
  ON organization_members FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members om2 
      WHERE om2.organization_id = organization_id
    )
  );

-- Agregar miembros: solo owner y admins
DROP POLICY IF EXISTS "Owners and admins can add members" ON organization_members;
CREATE POLICY "Owners and admins can add members" 
  ON organization_members FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = organization_members.organization_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Actualizar miembros: solo owner y admins
DROP POLICY IF EXISTS "Owners and admins can update members" ON organization_members;
CREATE POLICY "Owners and admins can update members" 
  ON organization_members FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members om 
      WHERE om.organization_id = organization_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Eliminar miembros: owner, admins, o el propio usuario
DROP POLICY IF EXISTS "Owners, admins, or self can remove members" ON organization_members;
CREATE POLICY "Owners, admins, or self can remove members" 
  ON organization_members FOR DELETE 
  USING (
    auth.uid() = user_id OR -- El usuario puede salirse
    auth.uid() IN (
      SELECT user_id FROM organization_members om 
      WHERE om.organization_id = organization_id 
      AND role IN ('owner', 'admin')
    )
  );

-- POLÍTICAS ACTUALIZADAS PARA PROJECTS

-- Eliminar políticas antiguas basadas en user_id
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Nuevas políticas basadas en organization_id
DROP POLICY IF EXISTS "Users can view organization projects" ON projects;
CREATE POLICY "Users can view organization projects" 
  ON projects FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = projects.organization_id
    )
  );

DROP POLICY IF EXISTS "Organization members can create projects" ON projects;
CREATE POLICY "Organization members can create projects" 
  ON projects FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = projects.organization_id
      AND role IN ('owner', 'admin', 'member') -- viewers no pueden crear
    )
  );

DROP POLICY IF EXISTS "Organization members can update projects" ON projects;
CREATE POLICY "Organization members can update projects" 
  ON projects FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = projects.organization_id
      AND role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Organization admins can delete projects" ON projects;
CREATE POLICY "Organization admins can delete projects" 
  ON projects FOR DELETE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = projects.organization_id
      AND role IN ('owner', 'admin')
    )
  );

-- POLÍTICAS ACTUALIZADAS PARA EXPENSES

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;

-- Nuevas políticas basadas en organization_id
DROP POLICY IF EXISTS "Users can view organization expenses" ON expenses;
CREATE POLICY "Users can view organization expenses" 
  ON expenses FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = expenses.organization_id
    )
  );

DROP POLICY IF EXISTS "Organization members can create expenses" ON expenses;
CREATE POLICY "Organization members can create expenses" 
  ON expenses FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = expenses.organization_id
      AND role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Organization members can update expenses" ON expenses;
CREATE POLICY "Organization members can update expenses" 
  ON expenses FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = expenses.organization_id
      AND role IN ('owner', 'admin', 'member')
    )
  );

DROP POLICY IF EXISTS "Organization admins can delete expenses" ON expenses;
CREATE POLICY "Organization admins can delete expenses" 
  ON expenses FOR DELETE 
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members 
      WHERE organization_id = expenses.organization_id
      AND role IN ('owner', 'admin')
    )
  );

-- PARTE 5: Migración de datos existentes
-- ========================================

-- Esta parte se ejecutará después de confirmar los user_id correctos
-- Por ahora solo crearemos la estructura

-- Comentario: Después ejecutaremos manualmente:
-- 1. Crear organización para el equipo
-- 2. Agregar ambos usuarios como miembros
-- 3. Actualizar projects y expenses con el organization_id

-- PARTE 6: Triggers y funciones adicionales
-- ========================================

-- Trigger para actualizar updated_at en organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_organizations_updated_at ON organizations;
CREATE TRIGGER trigger_update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- Trigger para agregar automáticamente al owner como miembro cuando se crea una org
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_add_owner_as_member ON organizations;
CREATE TRIGGER trigger_add_owner_as_member
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();

-- PARTE 7: Verificación
-- ========================================

-- Ver todas las organizaciones creadas
SELECT 
  o.id,
  o.name,
  o.slug,
  o.owner_id,
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as members_count,
  o.created_at
FROM organizations o
ORDER BY o.created_at DESC;

-- Ver todos los miembros de organizaciones
SELECT 
  o.name as organization,
  om.user_id,
  om.role,
  om.joined_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
ORDER BY o.name, om.role;

-- ========================================
-- FIN DE LA MIGRACIÓN BASE
-- ========================================
-- 
-- PRÓXIMOS PASOS:
-- 1. Ejecutar este script
-- 2. Crear organización inicial
-- 3. Agregar usuarios como miembros
-- 4. Migrar proyectos existentes
-- ========================================

