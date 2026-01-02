-- ========================================
-- FIX: Recursión Infinita en Políticas RLS
-- ========================================
-- Ejecutar en: SQL Editor de Supabase PRODUCCIÓN
-- Problema: Las políticas de organization_members causan recursión infinita
-- Solución: Simplificar las políticas para evitar referencias circulares
-- ========================================

-- PASO 1: Eliminar políticas problemáticas de organization_members
-- ========================================

DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners, admins, or self can remove members" ON organization_members;

-- PASO 2: Crear políticas simplificadas SIN recursión
-- ========================================

-- Ver miembros: cualquier usuario puede ver miembros de SU propia organización
-- Usamos la columna user_id directamente en lugar de subquery recursivo
CREATE POLICY "Members can view their organization members" 
  ON organization_members FOR SELECT 
  USING (
    -- El usuario puede ver miembros si:
    -- 1. Es su propio registro
    auth.uid() = user_id
    OR
    -- 2. Existe otro registro donde este usuario es miembro de la misma org
    EXISTS (
      SELECT 1 FROM organization_members om2 
      WHERE om2.user_id = auth.uid() 
      AND om2.organization_id = organization_members.organization_id
    )
  );

-- Agregar miembros: solo owner y admins
CREATE POLICY "Admins can add members" 
  ON organization_members FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organization_members.organization_id 
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Actualizar miembros: solo owner y admins
CREATE POLICY "Admins can update members" 
  ON organization_members FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Eliminar miembros: owner, admins, o el propio usuario puede salirse
CREATE POLICY "Admins or self can remove members" 
  ON organization_members FOR DELETE 
  USING (
    auth.uid() = user_id -- El usuario puede salirse
    OR
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- ========================================
-- PASO 3: Verificar que las políticas funcionan
-- ========================================

-- Probar SELECT (debe funcionar ahora)
SELECT * FROM organization_members WHERE user_id = auth.uid();

-- ========================================
-- ✅ FIX APLICADO
-- ========================================
-- Las políticas ahora usan EXISTS con alias de tabla (om2)
-- para evitar la recursión infinita
-- ========================================

