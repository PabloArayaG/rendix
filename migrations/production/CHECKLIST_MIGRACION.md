# ✅ Checklist de Migración a Producción

## 📦 Archivos Necesarios

- [ ] `add_organizations_system_production.sql` - Script principal de migración
- [ ] `README_MIGRACION_ORGANIZACIONES.md` - Guía detallada
- [ ] `ROLLBACK_organizations_if_needed.sql` - Por si necesitas revertir

---

## 🚀 Proceso de Migración

### ANTES de Empezar

- [ ] Leer el `README_MIGRACION_ORGANIZACIONES.md` completo
- [ ] Tener acceso a Supabase Dashboard de **PRODUCCIÓN** (no staging)
- [ ] Confirmar que el frontend ya tiene el código de organizaciones

### PASO 1: Backup de Seguridad

- [ ] Ir a Supabase → Settings → Database → Backups
- [ ] Crear un backup manual (o verificar que hay uno reciente)
- [ ] Anotar la hora del backup: `_______________`

### PASO 2: Verificar Estado Actual

Ejecutar esta query en SQL Editor de producción:

```sql
-- Ver cuántos proyectos y gastos tienes
SELECT 'Proyectos' as tipo, COUNT(*) as cantidad FROM projects
UNION ALL
SELECT 'Gastos', COUNT(*) FROM expenses
UNION ALL
SELECT 'Usuarios', COUNT(*) FROM auth.users;
```

- [ ] Cantidad de proyectos: `_______________`
- [ ] Cantidad de gastos: `_______________`
- [ ] Cantidad de usuarios: `_______________`

### PASO 3: Ejecutar Migración

- [ ] Abrir Supabase Dashboard → SQL Editor
- [ ] Crear nueva query
- [ ] Copiar **TODO** el contenido de `add_organizations_system_production.sql`
- [ ] Pegar en el editor
- [ ] Hacer clic en **Run** (o Ctrl+Enter)
- [ ] Esperar a que termine (puede tomar 30-60 segundos)

### PASO 4: Revisar Mensajes de Éxito

Deberías ver estos mensajes (marca ✅ si los ves):

- [ ] "INICIANDO MIGRACIÓN AUTOMÁTICA DE DATOS"
- [ ] "Usuario detectado: [tu-email]"
- [ ] "Organización creada con ID: [uuid]"
- [ ] "✓ Usuario agregado como owner"
- [ ] "✓ Proyectos migrados: [número]"
- [ ] "✓ Gastos migrados: [número]"
- [ ] "MIGRACIÓN COMPLETADA EXITOSAMENTE"

**Si NO ves estos mensajes, DETENTE y revisa el README.**

### PASO 5: Verificación Automática

Al final del script se ejecutan queries de verificación. Verifica:

- [ ] Tabla muestra 1 organización creada
- [ ] Tabla muestra 1 miembro (tú)
- [ ] "Proyectos con Organización" = cantidad del Paso 2
- [ ] "Proyectos SIN Organización" = 0
- [ ] "Gastos con Organización" = cantidad del Paso 2
- [ ] "Gastos SIN Organización" = 0

### PASO 6: Verificación Manual

Ejecutar estas queries una por una:

```sql
-- 1. Ver la organización creada
SELECT * FROM organizations;
```
- [ ] Organización "Mi Empresa" existe

```sql
-- 2. Ver tu membresía
SELECT 
  o.name as organization,
  u.email as member_email,
  om.role
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
JOIN auth.users u ON u.id = om.user_id;
```
- [ ] Apareces como "owner"

```sql
-- 3. Verificar un proyecto aleatorio
SELECT 
  p.custom_id,
  p.name,
  o.name as organization_name
FROM projects p
JOIN organizations o ON o.id = p.organization_id
LIMIT 1;
```
- [ ] El proyecto tiene organización asignada

```sql
-- 4. Verificar un gasto aleatorio
SELECT 
  e.description,
  o.name as organization_name
FROM expenses e
JOIN organizations o ON o.id = e.organization_id
LIMIT 1;
```
- [ ] El gasto tiene organización asignada

### PASO 7: Probar el Frontend

- [ ] Abrir la aplicación en producción
- [ ] Hacer login con tu usuario
- [ ] Verificar que aparece el selector de organizaciones en el header
- [ ] Ir a la página de Proyectos
- [ ] Verificar que se cargan todos los proyectos
- [ ] Abrir un proyecto
- [ ] Verificar que se cargan todos los gastos
- [ ] Crear un nuevo proyecto de prueba
- [ ] Crear un nuevo gasto de prueba
- [ ] Eliminar el proyecto y gasto de prueba

### PASO 8: Limpieza (Opcional)

Si todo funciona perfectamente:

```sql
-- Hacer organization_id obligatorio
ALTER TABLE projects ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN organization_id SET NOT NULL;
```
- [ ] Ejecutado (opcional)

---

## 🎉 ¡Migración Completada!

Si marcaste ✅ todos los pasos anteriores:

- ✅ El sistema de organizaciones está funcionando
- ✅ Tus datos están intactos
- ✅ Puedes invitar usuarios a tu organización
- ✅ Todo está listo para producción

---

## ❌ Si Algo Salió Mal

Si algún paso falló:

1. **NO ENTRES EN PÁNICO**
2. Anota exactamente qué paso falló
3. Revisa el mensaje de error completo
4. Consulta el `README_MIGRACION_ORGANIZACIONES.md` sección "Problemas Comunes"
5. Si necesitas revertir, usa `ROLLBACK_organizations_if_needed.sql`
6. Si tienes backup, puedes restaurar

---

## 📝 Notas Post-Migración

Anotar cualquier observación:

```
Fecha de migración: _______________
Hora de inicio: _______________
Hora de fin: _______________
Problemas encontrados: _______________
_______________
_______________
Soluciones aplicadas: _______________
_______________
_______________
```

---

## 🔄 Próximos Pasos

Después de la migración:

- [ ] Actualizar la documentación del proyecto
- [ ] Informar al equipo sobre el nuevo sistema
- [ ] Planear invitación de nuevos usuarios
- [ ] Considerar configurar roles (admin, member, viewer)

---

**Fecha de ejecución:** `_______________`  
**Ejecutado por:** `_______________`  
**Estado final:** ⬜ Exitoso / ⬜ Fallido / ⬜ Revertido

