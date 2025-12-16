-- ========================================
-- MIGRACIÓN DE DATOS EXISTENTES A ORGANIZACIONES
-- Ejecutar DESPUÉS de add_organizations_system.sql
-- ========================================

-- PASO 1: Crear organización para el equipo actual
-- ========================================

-- Reemplaza 'USER_ID_HELLOPABLO' con el UUID real de hellopablo.a@gmail.com
-- Lo puedes obtener ejecutando: SELECT id, email FROM auth.users;

DO $$
DECLARE
  v_org_id UUID;
  v_owner_id UUID;
  v_member_id UUID;
BEGIN
  -- Obtener IDs de usuarios (ajusta los emails si es necesario)
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'hellopablo.a@gmail.com';
  SELECT id INTO v_member_id FROM auth.users WHERE email = 'arayaignacio88@gmail.com';
  
  -- Verificar que encontramos ambos usuarios
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el usuario hellopablo.a@gmail.com';
  END IF;
  
  IF v_member_id IS NULL THEN
    RAISE NOTICE 'Usuario arayaignacio88@gmail.com no encontrado. Solo se agregará el owner.';
  END IF;
  
  -- Crear la organización principal
  INSERT INTO organizations (name, slug, owner_id)
  VALUES ('Rendix Team', 'rendix-team', v_owner_id)
  RETURNING id INTO v_org_id;
  
  RAISE NOTICE 'Organización creada con ID: %', v_org_id;
  
  -- El owner ya se agregó automáticamente por el trigger
  -- Ahora agregamos al segundo usuario si existe
  IF v_member_id IS NOT NULL THEN
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (v_org_id, v_member_id, 'admin')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Usuario arayaignacio88@gmail.com agregado como admin';
  END IF;
  
  -- Migrar todos los proyectos existentes a esta organización
  UPDATE projects 
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;
  
  RAISE NOTICE 'Proyectos migrados: %', (SELECT COUNT(*) FROM projects WHERE organization_id = v_org_id);
  
  -- Migrar todos los gastos existentes a esta organización
  UPDATE expenses 
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;
  
  RAISE NOTICE 'Gastos migrados: %', (SELECT COUNT(*) FROM expenses WHERE organization_id = v_org_id);
  
END $$;

-- PASO 2: Verificar la migración
-- ========================================

-- Ver la organización creada
SELECT 
  o.id,
  o.name,
  o.slug,
  (SELECT email FROM auth.users WHERE id = o.owner_id) as owner_email,
  o.created_at
FROM organizations o;

-- Ver todos los miembros
SELECT 
  o.name as organization,
  (SELECT email FROM auth.users WHERE id = om.user_id) as member_email,
  om.role,
  om.joined_at
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
ORDER BY om.role DESC;

-- Ver proyectos con su organización
SELECT 
  p.custom_id,
  p.name,
  p.client,
  o.name as organization_name,
  (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as expenses_count
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
ORDER BY p.created_at DESC;

-- Ver resumen de la migración
SELECT 
  'Total Organizaciones' as tipo,
  COUNT(*)::TEXT as cantidad
FROM organizations
UNION ALL
SELECT 
  'Total Miembros',
  COUNT(*)::TEXT
FROM organization_members
UNION ALL
SELECT 
  'Proyectos Migrados',
  COUNT(*)::TEXT
FROM projects
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Gastos Migrados',
  COUNT(*)::TEXT
FROM expenses
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Proyectos Sin Organización',
  COUNT(*)::TEXT
FROM projects
WHERE organization_id IS NULL
UNION ALL
SELECT 
  'Gastos Sin Organización',
  COUNT(*)::TEXT
FROM expenses
WHERE organization_id IS NULL;

-- PASO 3: Hacer organization_id obligatorio (OPCIONAL)
-- ========================================
-- Solo ejecutar esto después de confirmar que todos los datos fueron migrados

-- ALTER TABLE projects 
--   ALTER COLUMN organization_id SET NOT NULL;

-- ALTER TABLE expenses 
--   ALTER COLUMN organization_id SET NOT NULL;

-- ========================================
-- FIN DE LA MIGRACIÓN DE DATOS
-- ========================================

