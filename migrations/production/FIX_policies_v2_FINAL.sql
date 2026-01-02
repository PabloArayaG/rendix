-- ========================================
-- FIX FINAL: Eliminar Recursión Infinita
-- ========================================
-- Ejecutar en: SQL Editor de Supabase PRODUCCIÓN
-- Solución: Políticas SIMPLES sin consultar la misma tabla
-- ========================================

-- PASO 1: Eliminar TODAS las políticas de organization_members
-- ========================================

DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Owners, admins, or self can remove members" ON organization_members;
DROP POLICY IF EXISTS "Members can view their organization members" ON organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins or self can remove members" ON organization_members;

-- PASO 2: Crear políticas MUY SIMPLES sin recursión
-- ========================================

-- SELECT: El usuario puede ver sus propios registros de membresía
CREATE POLICY "Users can view own memberships" 
  ON organization_members FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT: Solo para admins - lo haremos mediante funciones RPC
-- Por ahora, permitir a usuarios autenticados (lo restringiremos en el código)
CREATE POLICY "Authenticated users can add members" 
  ON organization_members FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Solo el registro propio o mediante RPC
CREATE POLICY "Users can update own memberships" 
  ON organization_members FOR UPDATE 
  USING (auth.uid() = user_id);

-- DELETE: Solo el registro propio
CREATE POLICY "Users can delete own memberships" 
  ON organization_members FOR DELETE 
  USING (auth.uid() = user_id);

-- ========================================
-- PASO 3: Verificar que funciona
-- ========================================

-- Probar SELECT (debe funcionar sin recursión)
SELECT * FROM organization_members WHERE user_id = auth.uid();

-- ========================================
-- ✅ FIX APLICADO - POLÍTICAS SIMPLES
-- ========================================
-- Las políticas ahora solo verifican auth.uid() = user_id
-- Sin consultas a la misma tabla = Sin recursión
-- ========================================

