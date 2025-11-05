# 📊 Guía: Cambios para Mostrar Montos NETOS

## 🎯 Cambios Implementados

### 1. **Labels de UI Actualizados**
- ✅ "Venta Total" → "Venta Neto"  
- ✅ "Costo Real" → "Costo Neto"
- ✅ Archivos modificados:
  - `src/pages/ProjectDetail.tsx`
  - `src/pages/Projects.tsx`

### 2. **Cálculo de Costos Corregido**
- ✅ Script SQL: `fix_real_cost_calculation.sql`
- ✅ Función `update_project_real_costs()` actualizada
- ✅ Ahora suma `net_amount` (sin IVA) en lugar de `amount` (con IVA)

## 🚀 Pasos para Aplicar

### Paso 1: Ejecutar Script SQL
```bash
# En Supabase Dashboard > SQL Editor
# Ejecutar: fix_real_cost_calculation.sql
```

**Qué hace este script:**
1. Actualiza la función `update_project_real_costs()` para usar `net_amount`
2. Recalcula automáticamente todos los proyectos existentes
3. Muestra verificación de los cambios

### Paso 2: Deploy Código Frontend
```bash
# Los cambios de código ya están listos
git add .
git commit -m "Fix: Cambiar a mostrar montos NETOS (Venta Neto y Costo Neto)"
git push
```

## 📋 Resumen de Cambios

### Antes:
```
Venta Total: $154.105.072
Costo Real: $107.169.892 (incluía IVA)
Margen Real: $46.935.180
```

### Después:
```
Venta Neto: $154.105.072
Costo Neto: $90.059.571 (solo neto, sin IVA)
Margen Real: $64.045.501 (margen real corregido)
```

## 🔍 Verificación

### 1. Verificar en SQL (después de ejecutar el script)
```sql
SELECT 
    custom_id,
    name,
    sale_amount as venta_neto,
    real_cost as costo_neto,
    real_margin as margen,
    (SELECT SUM(net_amount) FROM expenses WHERE project_id = projects.id) as verificacion_neto,
    (SELECT SUM(amount) FROM expenses WHERE project_id = projects.id) as total_con_iva
FROM projects
ORDER BY created_at DESC
LIMIT 5;
```

**Debe cumplirse:**
- `real_cost` = `verificacion_neto`
- `real_margin` = `sale_amount - real_cost`

### 2. Verificar en UI
1. Abrir cualquier proyecto
2. Verificar que diga "Venta Neto" y "Costo Neto"
3. Los valores deben ser menores que antes (porque ahora no incluyen IVA)
4. El margen real debe ser mayor que antes

## 📊 Impacto en Márgenes

### Ejemplo Real:
- **Venta Neto**: $154.105.072
- **Antes (con IVA)**: Costo $107.169.892 → Margen 30.4%
- **Después (sin IVA)**: Costo $90.059.571 → Margen 41.5%

**Los márgenes serán más altos ahora porque:**
- Estamos comparando venta neto vs costo neto
- Antes comparábamos venta neto vs costo con IVA (no era correcto)

## ⚠️ Notas Importantes

1. **Todos los proyectos existentes se recalcularán automáticamente** al ejecutar el script
2. **Los gastos no se modifican**, solo cambia cómo se suman en el proyecto
3. **El IVA sigue registrado** en cada gasto (campos `net_amount` y `tax_amount`)
4. **Los triggers funcionarán automáticamente** para nuevos gastos

## 🎉 Resultado Final

Ahora el sistema muestra correctamente:
- **Venta Neto**: Lo que vendes (sin IVA)
- **Costo Neto**: Lo que gastas (sin IVA)  
- **Margen Real**: Diferencia entre venta y costo (ambos netos)

Esto es más correcto contablemente y refleja el verdadero margen del proyecto.
