# 🚀 Migración de Organizaciones a PRODUCCIÓN

## 📋 Resumen

Este script migra el sistema de organizaciones de staging a producción de forma **100% segura**, sin borrar ningún dato existente.

## ✅ Lo que hace el script

1. **Crea las tablas necesarias:**
   - `organizations` - Organizaciones/empresas
   - `organization_members` - Miembros con roles

2. **Agrega campos a tablas existentes:**
   - `organization_id` en `projects`
   - `organization_id` en `expenses`

3. **Crea funciones helper:**
   - `get_user_organizations()` - Lista organizaciones del usuario
   - `user_belongs_to_organization()` - Verifica membresía
   - `get_user_id_by_email()` - Busca usuario por email
   - `get_user_emails()` - Obtiene emails de usuarios
   - `get_organization_members_with_emails()` - Lista miembros con emails

4. **Actualiza políticas RLS:**
   - Cambia de `user_id` a `organization_id`
   - Mantiene seguridad y privacidad

5. **Migra datos automáticamente:**
   - ✅ Detecta el usuario actual
   - ✅ Crea organización "Mi Empresa"
   - ✅ Migra todos los proyectos existentes
   - ✅ Migra todos los gastos existentes

## 🔒 Seguridad

- ❌ **NO borra ningún dato**
- ✅ Solo agrega columnas nuevas
- ✅ Migra datos automáticamente
- ✅ Si algo falla, los datos originales están intactos

## 📝 Instrucciones Paso a Paso

### Paso 1: Backup (Recomendado)

Aunque el script es seguro, siempre es buena práctica hacer backup:

1. Ve a tu proyecto en Supabase
2. Settings → Database → Backups
3. Crea un backup manual (o verifica que tengas uno reciente)

### Paso 2: Ejecutar el Script

1. Abre Supabase Dashboard de **PRODUCCIÓN**
2. Ve a: **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido completo de: `add_organizations_system_production.sql`
5. Haz clic en **Run** (o presiona Ctrl+Enter)

### Paso 3: Revisar los Mensajes

El script mostrará mensajes de progreso como:

```
========================================
INICIANDO MIGRACIÓN AUTOMÁTICA DE DATOS
========================================
Usuario detectado: tu-email@gmail.com (ID: xxx-xxx-xxx)
Creando organización por defecto...
✓ Organización creada con ID: xxx-xxx-xxx
✓ Usuario agregado como owner
✓ Proyectos migrados: 15
✓ Gastos migrados: 47
========================================
MIGRACIÓN COMPLETADA EXITOSAMENTE
========================================
```

### Paso 4: Verificar los Resultados

Al final del script se ejecutan queries de verificación automáticamente:

#### 4.1 Verificar Organización Creada

Deberías ver algo como:

| org_id | organization_name | slug | owner_email | created_at |
|--------|------------------|------|-------------|------------|
| xxx... | Mi Empresa | mi-empresa | tu@email.com | 2026-01-02 |

#### 4.2 Verificar Membresía

| organization | member_email | role | joined_at |
|-------------|--------------|------|-----------|
| Mi Empresa | tu@email.com | owner | 2026-01-02 |

#### 4.3 Resumen de Migración

| tipo | cantidad |
|------|----------|
| Total Organizaciones | 1 |
| Total Miembros | 1 |
| Proyectos con Organización | X |
| Proyectos SIN Organización | 0 |
| Gastos con Organización | Y |
| Gastos SIN Organización | 0 |

**✅ Si "Proyectos SIN Organización" y "Gastos SIN Organización" están en 0, ¡perfecto!**

## 🔍 Verificación Manual (Opcional)

Si quieres verificar manualmente, ejecuta estas queries:

### Ver todas las organizaciones:
```sql
SELECT * FROM organizations;
```

### Ver todos los miembros:
```sql
SELECT 
  o.name as organization,
  u.email as member_email,
  om.role
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
JOIN auth.users u ON u.id = om.user_id;
```

### Ver proyectos migrados:
```sql
SELECT 
  p.custom_id,
  p.name,
  p.client,
  o.name as organization_name
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
ORDER BY p.created_at DESC;
```

### Ver gastos migrados:
```sql
SELECT 
  e.description,
  e.net_amount,
  p.custom_id as project,
  o.name as organization_name
FROM expenses e
LEFT JOIN projects p ON p.id = e.project_id
LEFT JOIN organizations o ON o.id = e.organization_id
ORDER BY e.created_at DESC
LIMIT 20;
```

## 🎯 Resultado Esperado

Después de ejecutar el script:

1. ✅ Una organización llamada "Mi Empresa" creada
2. ✅ Tu usuario es el owner de esa organización
3. ✅ Todos tus proyectos ahora pertenecen a "Mi Empresa"
4. ✅ Todos tus gastos ahora pertenecen a "Mi Empresa"
5. ✅ Las políticas RLS funcionan correctamente
6. ✅ Puedes invitar a otros usuarios a tu organización (desde el frontend)

## ⚠️ Problemas Comunes y Soluciones

### Problema: "No se encontró ningún usuario en el sistema"
**Solución:** Verifica que tienes al menos un usuario registrado. Ejecuta:
```sql
SELECT id, email FROM auth.users;
```

### Problema: Algunos proyectos no se migraron
**Solución:** Verifica si tienen `user_id`. Ejecuta:
```sql
SELECT custom_id, name, user_id, organization_id 
FROM projects 
WHERE organization_id IS NULL;
```

Si hay proyectos sin `user_id`, puedes migrarlos manualmente:
```sql
UPDATE projects 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;
```

### Problema: Algunos gastos no se migraron
Similar a proyectos, ejecuta:
```sql
UPDATE expenses 
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;
```

## 📱 Cambios en el Frontend

**No necesitas cambiar nada en el código del frontend**, ya que:
- Los hooks ya están preparados para organizaciones
- El componente `OrganizationSelector` ya existe
- Las políticas RLS manejan todo automáticamente

Sin embargo, deberías:
1. Verificar que el selector de organizaciones aparece en el header
2. Probar crear un nuevo proyecto
3. Probar crear un nuevo gasto
4. Invitar a un usuario nuevo (cuando lo necesites)

## 🔄 Próximos Pasos (Opcional)

### Hacer organization_id obligatorio

Si todo funciona perfectamente y quieres asegurar que no se creen proyectos/gastos sin organización:

```sql
-- Solo ejecutar después de confirmar que TODO está migrado
ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN organization_id SET NOT NULL;
```

### Cambiar el nombre de la organización

Si no te gusta "Mi Empresa", puedes cambiarlo:

```sql
UPDATE organizations 
SET name = 'Tu Nombre Aquí', 
    slug = 'tu-slug-aqui'
WHERE slug = 'mi-empresa';
```

## 📞 Soporte

Si algo sale mal:
1. Revisa los mensajes en el SQL Editor
2. Ejecuta las queries de verificación manual
3. Revisa este README nuevamente
4. Si creaste un backup, puedes restaurarlo

## ✅ Checklist Final

Antes de cerrar:
- [ ] Script ejecutado sin errores
- [ ] Organización creada correctamente
- [ ] Usuario es owner de la organización
- [ ] Todos los proyectos tienen `organization_id`
- [ ] Todos los gastos tienen `organization_id`
- [ ] Frontend funciona correctamente
- [ ] Puedes crear proyectos nuevos
- [ ] Puedes crear gastos nuevos

---

**¡Listo! Tu sistema de producción ahora tiene soporte completo de organizaciones.** 🎉

