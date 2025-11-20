-- ESQUEMA SQL PARA RENDIX - Sistema de Gestión Financiera de Proyectos
-- Ejecutar en Supabase SQL Editor

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Eliminar tablas existentes si existen (para desarrollo)
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Tabla de proyectos
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
    
    -- Estado y documentos
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    purchase_order VARCHAR(100),
    hes VARCHAR(100),
    invoice VARCHAR(100),
    
    -- Metadatos
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Auditoría
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de gastos
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Información del gasto
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) DEFAULT 'general',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Información adicional
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

-- Índices para optimización
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_custom_id ON projects(custom_id);

CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);

-- Función para auto-generar custom_id
CREATE OR REPLACE FUNCTION generate_project_custom_id()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_number INT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Buscar el próximo número disponible para el año actual
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

-- Trigger para auto-generar custom_id al insertar proyecto
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

-- Trigger para actualizar updated_at automáticamente
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

-- Función para recalcular costos reales del proyecto
CREATE OR REPLACE FUNCTION update_project_real_costs()
RETURNS TRIGGER AS $$
DECLARE
    project_sale_amount DECIMAL(12, 2);
    total_expenses DECIMAL(12, 2);
BEGIN
    -- Obtener el monto de venta del proyecto
    SELECT sale_amount INTO project_sale_amount
    FROM projects 
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    -- Calcular total de gastos
    SELECT COALESCE(SUM(amount), 0) INTO total_expenses
    FROM expenses 
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
    
    -- Actualizar proyecto con costos reales
    UPDATE projects SET
        real_cost = total_expenses,
        real_margin = project_sale_amount - total_expenses,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar costos automáticamente
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

-- Función para recalcular margen proyectado al actualizar montos
CREATE OR REPLACE FUNCTION update_project_projected_margin()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcular margen proyectado si cambian sale_amount o projected_cost
    IF NEW.sale_amount != OLD.sale_amount OR NEW.projected_cost != OLD.projected_cost THEN
        NEW.projected_margin := NEW.sale_amount - NEW.projected_cost;
    END IF;
    
    -- Recalcular margen real si cambia sale_amount
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

-- Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para projects
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE USING (auth.uid()::text = user_id);

-- Políticas de seguridad para expenses
CREATE POLICY "Users can view their own expenses" ON expenses
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own expenses" ON expenses
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own expenses" ON expenses
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own expenses" ON expenses
    FOR DELETE USING (auth.uid()::text = user_id);

-- Configurar Storage para comprobantes
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Política de storage para comprobantes
CREATE POLICY "Users can upload their own receipts" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own receipts" ON storage.objects
    FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipts" ON storage.objects
    FOR UPDATE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipts" ON storage.objects
    FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insertar datos de ejemplo (opcional para testing)
INSERT INTO projects (
    name, description, client, sale_amount, projected_cost, 
    start_date, user_id
) VALUES 
(
    'Proyecto Demo 1', 
    'Proyecto de demostración para testing', 
    'Cliente Demo S.L.',
    50000.00,
    35000.00,
    CURRENT_DATE,
    'demo-user-id'
),
(
    'Proyecto Demo 2', 
    'Segundo proyecto de demostración', 
    'Otra Empresa S.A.',
    25000.00,
    18000.00,
    CURRENT_DATE,
    'demo-user-id'
);

-- Insertar algunos gastos de ejemplo
INSERT INTO expenses (
    project_id, description, amount, category, date, user_id
) 
SELECT 
    p.id,
    'Gasto de ejemplo - ' || p.name,
    1500.00,
    'materials',
    CURRENT_DATE,
    'demo-user-id'
FROM projects p 
WHERE p.name = 'Proyecto Demo 1';

-- Comentarios sobre el esquema
COMMENT ON TABLE projects IS 'Tabla principal de proyectos con información financiera y de seguimiento';
COMMENT ON TABLE expenses IS 'Tabla de gastos asociados a proyectos con comprobantes opcionales';
COMMENT ON FUNCTION generate_project_custom_id() IS 'Genera automáticamente IDs personalizados como P-2024-001';
COMMENT ON FUNCTION update_project_real_costs() IS 'Recalcula automáticamente los costos reales del proyecto cuando se modifican gastos';

-- Verificar que todo funciona correctamente
SELECT 'Schema created successfully!' as status;
