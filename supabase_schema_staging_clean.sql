-- RESET COMPLETO Y SCHEMA NUEVO PARA STAGING
-- Ejecutar en Supabase SQL Editor

-- 1. RESET COMPLETO - Eliminar todo
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP FUNCTION IF EXISTS generate_project_custom_id() CASCADE;
DROP FUNCTION IF EXISTS update_project_real_costs() CASCADE;
DROP FUNCTION IF EXISTS calculate_expense_amounts() CASCADE;
DROP FUNCTION IF EXISTS update_project_projected_margin() CASCADE;
DROP FUNCTION IF EXISTS set_project_custom_id() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 2. RECREAR EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. CREAR TABLA PROJECTS CON TIPOS CORRECTOS
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_id VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    client VARCHAR(255) NOT NULL,
    
    -- Información financiera
    sale_amount DECIMAL(12, 2) DEFAULT 0.00,
    projected_cost DECIMAL(12, 2) DEFAULT 0.00,
    projected_margin DECIMAL(12, 2) DEFAULT 0.00,
    real_cost DECIMAL(12, 2) DEFAULT 0.00,
    real_margin DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Fechas
    start_date DATE,
    end_date DATE,
    
    -- Estado y documentos (TIPOS CORRECTOS)
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    purchase_order VARCHAR(100),
    hes VARCHAR(100),
    invoice VARCHAR(100),
    sale_invoice VARCHAR(100),
    
    -- Metadatos
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Auditoría
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREAR TABLA EXPENSES CON TIPOS CORRECTOS
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Información del gasto
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (net_amount >= 0),
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    category VARCHAR(100) DEFAULT 'general',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Información adicional (TIPOS CORRECTOS)
    status VARCHAR(50) DEFAULT 'provision' CHECK (status IN ('provision', 'paid', 'credit', 'advance')),
    document_type VARCHAR(20) DEFAULT 'boleta' CHECK (document_type IN ('boleta', 'factura')),
    document_number VARCHAR(100),
    notes TEXT,
    receipt_url TEXT,
    receipt_filename VARCHAR(255),
    supplier VARCHAR(255),
    invoice_number VARCHAR(100),
    
    -- Metadatos
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Auditoría
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para categorías válidas
    CONSTRAINT expenses_valid_category CHECK (
        category IN ('materials', 'labor', 'equipment', 'transport', 'services', 
                    'permits', 'utilities', 'insurance', 'supplies', 'subcontractors', 
                    'tools', 'safety', 'administration', 'other', 'general')
    )
);

-- 5. ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_custom_id ON projects(custom_id);

CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);

-- 6. FUNCIÓN PARA AUTO-GENERAR CUSTOM_ID
CREATE OR REPLACE FUNCTION generate_project_custom_id()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COALESCE(MAX(
        CASE 
            WHEN custom_id ~ ('^P-' || current_year || '-[0-9]+$') 
            THEN SUBSTRING(custom_id FROM '^P-' || current_year || '-([0-9]+)$')::INT
            ELSE 0
        END
    ), 0) + 1 INTO next_number FROM projects;
    
    RETURN 'P-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER PARA AUTO-GENERAR CUSTOM_ID
CREATE OR REPLACE FUNCTION set_project_custom_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.custom_id IS NULL THEN
        NEW.custom_id := generate_project_custom_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_project_custom_id
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION set_project_custom_id();

-- 8. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. FUNCIÓN PARA CALCULAR AMOUNTS (IVA 19%)
CREATE OR REPLACE FUNCTION calculate_expense_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Si net_amount no está definido, calcularlo (IVA 19%)
    IF NEW.net_amount = 0 OR NEW.net_amount IS NULL THEN
        NEW.net_amount := ROUND(NEW.amount / 1.19, 2);
    END IF;
    
    -- Si tax_amount no está definido, calcularlo
    IF NEW.tax_amount = 0 OR NEW.tax_amount IS NULL THEN
        NEW.tax_amount := NEW.amount - NEW.net_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_expense_amounts
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expense_amounts();

-- 10. FUNCIÓN PARA RECALCULAR COSTOS DEL PROYECTO
CREATE OR REPLACE FUNCTION update_project_real_costs()
RETURNS TRIGGER AS $$
DECLARE
    project_sale_amount DECIMAL(12, 2);
    total_expenses DECIMAL(12, 2);
    target_project_id UUID;
BEGIN
    target_project_id := COALESCE(NEW.project_id, OLD.project_id);
    
    -- Obtener monto de venta
    SELECT sale_amount INTO project_sale_amount
    FROM projects 
    WHERE id = target_project_id;
    
    -- Calcular total de gastos
    SELECT COALESCE(SUM(amount), 0) INTO total_expenses
    FROM expenses 
    WHERE project_id = target_project_id;
    
    -- Actualizar proyecto
    UPDATE projects SET
        real_cost = total_expenses,
        real_margin = project_sale_amount - total_expenses,
        updated_at = NOW()
    WHERE id = target_project_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expenses_update_project_costs_insert
    AFTER INSERT ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_project_real_costs();

CREATE TRIGGER trigger_expenses_update_project_costs_update
    AFTER UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_project_real_costs();

CREATE TRIGGER trigger_expenses_update_project_costs_delete
    AFTER DELETE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_project_real_costs();

-- 11. TRIGGER PARA MARGEN PROYECTADO
CREATE OR REPLACE FUNCTION update_project_projected_margin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sale_amount != OLD.sale_amount OR NEW.projected_cost != OLD.projected_cost THEN
        NEW.projected_margin := NEW.sale_amount - NEW.projected_cost;
    END IF;
    
    IF NEW.sale_amount != OLD.sale_amount THEN
        NEW.real_margin := NEW.sale_amount - NEW.real_cost;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_update_margins
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_projected_margin();

-- 12. ROW LEVEL SECURITY
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Políticas para projects
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE USING (auth.uid()::text = user_id);

-- Políticas para expenses
CREATE POLICY "Users can view their own expenses" ON expenses
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own expenses" ON expenses
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own expenses" ON expenses
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own expenses" ON expenses
    FOR DELETE USING (auth.uid()::text = user_id);

-- 13. CONFIGURAR STORAGE
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage (eliminar existentes primero)
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;

CREATE POLICY "Users can upload their own receipts" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own receipts" ON storage.objects
    FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipts" ON storage.objects
    FOR UPDATE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipts" ON storage.objects
    FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 14. VERIFICACIÓN FINAL
SELECT 'Schema recreated successfully!' as status;
SELECT 'Ready for seed data!' as next_step;
