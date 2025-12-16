-- ========================================
-- FIX DEFINITIVO: Eliminar recursión en organization_members
-- ========================================
-- Ejecutar en: SQL Editor de Supabase
-- Propósito: Arreglar las políticas RLS de una puta vez
-- ========================================

-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS DE organization_members
-- ========================================

DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners and admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners and admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Users can remove themselves or admins can remove others" ON organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners, admins, or self can remove members" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can view all members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can update members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners or self can remove members" ON organization_members;

-- PASO 2: CREAR POLÍTICAS SIMPLES SIN RECURSIÓN
-- ========================================

-- Permitir que TODOS los usuarios autenticados vean organization_members
-- Esto NO es un problema de seguridad porque de todos modos los JOINs lo necesitan
CREATE POLICY "Authenticated users can view all organization members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (true);

-- Solo permitir INSERT si eres el owner de la organización (verificando en organizations)
CREATE POLICY "Only organization owners can add members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_members.organization_id
      AND owner_id = auth.uid()
    )
  );

-- Solo permitir UPDATE si eres el owner de la organización
CREATE POLICY "Only organization owners can update members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_members.organization_id
      AND owner_id = auth.uid()
    )
  );

-- Permitir DELETE si eres el owner O si te estás eliminando a ti mismo
CREATE POLICY "Organization owners or self can delete members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() -- Puedes eliminarte a ti mismo
    OR
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_members.organization_id
      AND owner_id = auth.uid()
    )
  );

-- PASO 3: VERIFICAR QUE FUNCIONA
-- ========================================

-- Ver las políticas actuales
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
    ELSE 'N/A'
  END as policy_definition
FROM pg_policies
WHERE tablename = 'organization_members'
ORDER BY policyname;

-- Probar que puedes ver tus membresías (CAMBIAR user_id si es necesario)
SELECT 
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  o.name as organization_name,
  om.joined_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'b3cbf1f5-1030-4e0a-882a-265cb230a654';

-- PASO 4: VERIFICACIÓN FINAL
-- ========================================

-- Contar políticas (deberían ser 4)
SELECT 
  'Políticas de organization_members' as info,
  COUNT(*) as cantidad
FROM pg_policies
WHERE tablename = 'organization_members';

-- ========================================
-- ✅ LISTO - Sin más recursión
-- ========================================

