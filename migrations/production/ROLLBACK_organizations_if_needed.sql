-- ========================================
-- ROLLBACK: Sistema de Organizaciones
-- ========================================
-- ⚠️  SOLO EJECUTAR SI NECESITAS REVERTIR LA MIGRACIÓN
-- ⚠️  Este script elimina el sistema de organizaciones
-- ⚠️  pero MANTIENE tus proyectos y gastos intactos
-- ========================================

-- IMPORTANTE: Antes de ejecutar este rollback, asegúrate de que:
-- 1. Tienes un backup de la base de datos
-- 2. Realmente quieres revertir (no hay vuelta atrás después)
-- 3. Has consultado con tu equipo

-- ========================================
-- PARTE 1: Restaurar políticas RLS antiguas para PROJECTS
-- ========================================

-- Eliminar políticas basadas en organizaciones
DROP POLICY IF EXISTS "Users can view organization projects" ON projects;
DROP POLICY IF EXISTS "Organization members can create projects" ON projects;
DROP POLICY IF EXISTS "Organization members can update projects" ON projects;
DROP POLICY IF EXISTS "Organization admins can delete projects" ON projects;

-- Restaurar políticas basadas en user_id
CREATE POLICY "Users can view their own projects" 
  ON projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" 
  ON projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
  ON projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
  ON projects FOR DELETE 
  USING (auth.uid() = user_id);

-- ========================================
-- PARTE 2: Restaurar políticas RLS antiguas para EXPENSES
-- ========================================

-- Eliminar políticas basadas en organizaciones
DROP POLICY IF EXISTS "Users can view organization expenses" ON expenses;
DROP POLICY IF EXISTS "Organization members can create expenses" ON expenses;
DROP POLICY IF EXISTS "Organization members can update expenses" ON expenses;
DROP POLICY IF EXISTS "Organization admins can delete expenses" ON expenses;

-- Restaurar políticas basadas en user_id
CREATE POLICY "Users can view their own expenses" 
  ON expenses FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses" 
  ON expenses FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" 
  ON expenses FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" 
  ON expenses FOR DELETE 
  USING (auth.uid() = user_id);

-- ========================================
-- PARTE 3: Eliminar columnas de organization_id
-- ========================================

-- Remover de projects (tus proyectos se mantienen intactos)
ALTER TABLE projects 
  DROP COLUMN IF EXISTS organization_id;

-- Remover de expenses (tus gastos se mantienen intactos)
ALTER TABLE expenses 
  DROP COLUMN IF EXISTS organization_id;

-- ========================================
-- PARTE 4: Eliminar triggers y funciones
-- ========================================

-- Eliminar triggers
DROP TRIGGER IF EXISTS trigger_update_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS trigger_add_owner_as_member ON organizations;

-- Eliminar funciones
DROP FUNCTION IF EXISTS update_organizations_updated_at();
DROP FUNCTION IF EXISTS add_owner_as_member();
DROP FUNCTION IF EXISTS get_user_organizations(UUID);
DROP FUNCTION IF EXISTS user_belongs_to_organization(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_id_by_email(TEXT);
DROP FUNCTION IF EXISTS get_user_emails(UUID[]);
DROP FUNCTION IF EXISTS get_organization_members_with_emails(UUID);

-- ========================================
-- PARTE 5: Eliminar tablas de organizaciones
-- ========================================

-- Eliminar tabla de miembros primero (por foreign key)
DROP TABLE IF EXISTS organization_members CASCADE;

-- Eliminar tabla de organizaciones
DROP TABLE IF EXISTS organizations CASCADE;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

-- Verificar que los proyectos siguen intactos
SELECT 
  'Total Proyectos' as tipo,
  COUNT(*) as cantidad
FROM projects
UNION ALL
SELECT 
  'Total Gastos',
  COUNT(*)
FROM expenses;

-- Ver algunos proyectos para confirmar
SELECT 
  custom_id,
  name,
  client,
  user_id,
  created_at
FROM projects
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- ✅ ROLLBACK COMPLETADO
-- ========================================
-- 
-- ✅ Sistema de organizaciones eliminado
-- ✅ Proyectos y gastos intactos
-- ✅ Políticas RLS restauradas a user_id
-- ✅ Tu aplicación debería funcionar como antes
-- 
-- NOTA: Si habías hecho cambios en el frontend para organizaciones,
-- necesitarás revertir esos cambios también.
-- 
-- ========================================

