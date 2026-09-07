# Migraciones SQL - RENDIX

Estructura organizada de scripts SQL para el proyecto RENDIX.

## 📁 Estructura de Carpetas

### `/schemas`
Esquemas completos de base de datos. Úsalos para crear la base de datos desde cero.

- `supabase_schema.sql` - Esquema base completo de producción
- `supabase_schema_staging_clean.sql` - Esquema limpio para staging

### `/staging`
Migraciones y fixes específicos para el ambiente de staging.

- `staging_complete_migration.sql` - ⭐ Migración consolidada (USAR ESTE)
- `fix_decimal_limits.sql` - Aumenta límites DECIMAL de 10,2 a 15,2
- `fix_real_cost_calculation.sql` - Actualiza cálculo de costos a usar net_amount
- `fix_staging_user_id.sql` - Vincula proyectos existentes a usuario específico
- `supabase_migration_staging.sql` - Migración inicial staging
- `supabase_migration_staging_v4.sql` - Migración staging v4

### `/production`
Historial de migraciones y diagnósticos usados en producción. No ejecutar fixes históricos de RLS sobre una base ya endurecida.

### `/fixes`
Fixes y mejoras incrementales que se han aplicado.

- `add_expense_categories.sql` - Añade categorías de gastos
- `add_fuel_category.sql` - Añade categoría de combustible
- `add_iva_to_expenses.sql` - Añade campos de IVA a expenses
- `add_credit_due_date.sql` - Añade vencimiento y soporte para alertas de créditos
- `harden_multitenancy.sql` - Corrige RLS, RPC e integridad entre organizaciones
- `setup_storage_receipts.sql` - Convierte documentos a privados y restringe acceso por proyecto
- `update_currency_to_clp.sql` - Actualiza moneda a CLP

## 🚀 Cómo Usar

Los cambios nuevos aún no aplicados están documentados en `APPLY_PENDING_CHANGES.md` con su orden y validaciones.

### Para configurar Staging desde cero:
1. Ejecuta el esquema: `/schemas/supabase_schema_staging_clean.sql`
2. Ejecuta la migración: `/staging/staging_complete_migration.sql`

### Para aplicar fixes en Staging:
- Para una instalación histórica usa `/staging/staging_complete_migration.sql` y luego sigue `APPLY_PENDING_CHANGES.md`.
- No ejecutes los fixes RLS antiguos después de `fixes/harden_multitenancy.sql`.

### Para configurar Producción desde cero:
- Ejecuta: `/schemas/supabase_schema.sql`

## 📝 Notas

- Los archivos individuales en `/staging` están consolidados en `staging_complete_migration.sql`
- Siempre revisa el contenido antes de ejecutar en producción
- Haz backup antes de ejecutar migraciones en producción

