# Cambios pendientes en Supabase online

Estos scripts quedaron preparados localmente y **no han sido ejecutados** en staging ni producción.

## Antes de aplicar

Ejecutar primero `preflight_pending_changes.sql` en SQL Editor de staging y revisar su resultado. Es de solo lectura y permite contrastar tipos, funciones, políticas y consistencia de datos antes de aplicar cambios.

1. Hacer un respaldo de la base de datos.
2. Confirmar que `projects.organization_id` y `expenses.organization_id` están poblados.
3. Probar primero en staging con una cuenta owner, una member y una viewer.
4. No volver a ejecutar los fixes históricos de RLS después del hardening: podrían restaurar políticas permisivas. En particular, evitar `production/FIX_policies_v2_FINAL.sql`, `fixes/fix_all_organizations_policies.sql` y `fixes/fix_rls_definitivo.sql`.

## Orden recomendado

1. `fixes/harden_multitenancy.sql`
   - Verificar con `verify_hardening.sql`; todas las filas deben mostrar `passed = true`.
   - Si falla `helpers protegidos`, ejecutar `diagnose_hardening_helpers.sql` antes de continuar.
   - Si `anon_can_execute` aparece en `true`, ejecutar `fixes/revoke_anon_helper_permissions.sql` y repetir `verify_hardening.sql`.
2. `fixes/add_credit_due_date.sql`
   - Verificar con `verify_credit_due_date.sql`; las tres filas deben mostrar `passed = true`.
3. `fixes/setup_storage_receipts.sql`
   - Ejecutar antes `preflight_storage_private.sql` y revisar que no existan rutas incompatibles ni proyectos huérfanos.

El primer script corrige RLS, limita los RPC de miembros y asegura que cada gasto pertenezca a la misma organización que su proyecto. Se detiene si encuentra organizaciones inconsistentes en los gastos; no reasigna datos automáticamente. El segundo agrega `credit_due_date`. El tercero vuelve privado el bucket `receipts` y autoriza archivos según la membresía del proyecto.

Coordinar el hardening y Storage con el frontend nuevo: el RPC de búsqueda por email cambia de firma y los enlaces públicos dejan de funcionar al privatizar el bucket. Mantener el despliegue remoto pendiente de revisión del usuario; el frontend local actualizado sirve para las pruebas contra staging.

## Verificación posterior

- Owner/admin: pueden gestionar miembros; member/viewer no pueden elevar roles.
- Viewer: solo lectura. Member: crea y edita proyectos/gastos, sin eliminar proyectos ni gastos.
- Un usuario de otra organización no puede leer registros, emails ni archivos ajenos.
- Los comprobantes y documentos antiguos continúan abriendo mediante URL firmada.
- Crear y editar un crédito exige fecha de vencimiento; la campana y los filtros muestran vencidos y próximos 30 días.

Si alguna comprobación falla, no avanzar a producción. Guardar el error exacto y revisar el estado real del esquema antes de modificar los scripts.
