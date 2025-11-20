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
Migraciones para el ambiente de producción (actualmente vacío).

### `/fixes`
Fixes y mejoras incrementales que se han aplicado.

- `add_expense_categories.sql` - Añade categorías de gastos
- `add_fuel_category.sql` - Añade categoría de combustible
- `add_iva_to_expenses.sql` - Añade campos de IVA a expenses
- `update_currency_to_clp.sql` - Actualiza moneda a CLP

## 🚀 Cómo Usar

### Para configurar Staging desde cero:
1. Ejecuta el esquema: `/schemas/supabase_schema_staging_clean.sql`
2. Ejecuta la migración: `/staging/staging_complete_migration.sql`

### Para aplicar fixes en Staging:
- Usa directamente: `/staging/staging_complete_migration.sql`

### Para configurar Producción desde cero:
- Ejecuta: `/schemas/supabase_schema.sql`

## 📝 Notas

- Los archivos individuales en `/staging` están consolidados en `staging_complete_migration.sql`
- Siempre revisa el contenido antes de ejecutar en producción
- Haz backup antes de ejecutar migraciones en producción

