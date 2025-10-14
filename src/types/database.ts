// Tipos de la base de datos para RENDIX
export type ExpenseCategory = 
  | 'materials'        // Materiales
  | 'labor'           // Mano de obra
  | 'equipment'       // Equipos/maquinaria
  | 'transport'       // Transporte
  | 'services'        // Servicios contratados
  | 'permits'         // Permisos/licencias
  | 'utilities'       // Servicios públicos
  | 'insurance'       // Seguros
  | 'supplies'        // Insumos/suministros
  | 'subcontractors'  // Subcontratistas
  | 'tools'           // Herramientas
  | 'safety'          // Seguridad/EPP
  | 'administration'  // Gastos administrativos
  | 'food'            // Alimentación
  | 'accommodation'   // Hospedaje
  | 'fuel'            // Combustible
  | 'other'           // Otros
  | 'general';        // General

export type ExpenseStatus = 'provision' | 'paid' | 'credit' | 'advance';

export type DocumentType = 'boleta' | 'factura';

export type ProjectStatus = 'in_progress' | 'completed';

export interface Project {
  id: string; // UUID primary key
  custom_id: string; // ID personalizado definido por el usuario (REQUERIDO)
  name: string; // Nombre del proyecto (UNIQUE)
  description?: string; // Descripción opcional
  client: string; // Nombre del cliente (REQUERIDO)
  
  // INFORMACIÓN FINANCIERA (todos DECIMAL)
  sale_amount: number; // Monto total de venta al cliente
  projected_cost: number; // Costo estimado del proyecto
  projected_margin: number; // Margen proyectado (calculado automáticamente)
  real_cost: number; // Costo real (suma automática de gastos)
  real_margin: number; // Margen real (calculado automáticamente)
  
  // FECHAS
  start_date?: string; // Fecha de inicio (DATE)
  end_date?: string; // Fecha de finalización (DATE)
  
  // ESTADO Y DOCUMENTOS
  status: ProjectStatus; // Estado del proyecto
  purchase_order?: string; // Número de Orden de Compra (OC)
  hes?: string; // Hoja de Entrada en Servicio
  invoice?: string; // Número de Factura emitida
  sale_invoice?: string; // Número de Factura de Venta al cliente
  
  // METADATOS
  tags: string[]; // Array de etiquetas
  notes?: string; // Notas adicionales
  metadata: Record<string, any>; // JSONB para datos extra
  
  // AUDITORÍA
  user_id: string; // UID del usuario que creó (Firebase/Supabase)
  created_at: string; // Timestamp automático
  updated_at: string; // Timestamp automático
}

export interface Expense {
  id: string; // UUID primary key
  project_id: string; // FK a projects (CASCADE DELETE)
  
  // INFORMACIÓN DEL GASTO
  description: string; // Descripción del gasto (REQUERIDO)
  amount: number; // Monto total (DECIMAL, > 0, REQUERIDO)
  net_amount: number; // Monto neto sin IVA (DECIMAL, > 0, REQUERIDO)
  tax_amount: number; // IVA 19% (DECIMAL, >= 0, REQUERIDO)
  category: ExpenseCategory; // Categoría (ver enum abajo)
  date: string; // Fecha del gasto (DATE, default HOY)
  
  // INFORMACIÓN ADICIONAL
  status: ExpenseStatus; // Estado del gasto (Provisión, Pagado, Crédito, Anticipo)
  document_type: DocumentType; // Tipo de documento (Boleta o Factura)
  document_number?: string; // Número de boleta o factura
  notes?: string; // Notas adicionales
  receipt_url?: string; // URL del comprobante (Supabase Storage)
  receipt_filename?: string; // Nombre original del archivo
  supplier?: string; // Proveedor/empresa
  invoice_number?: string; // Número de factura del proveedor (DEPRECATED - usar document_number)
  
  // METADATOS
  tags: string[]; // Array de etiquetas
  metadata: Record<string, any>; // JSONB para datos extra
  
  // AUDITORÍA
  user_id: string; // UID del usuario que creó
  created_at: string; // Timestamp automático
  updated_at: string; // Timestamp automático
}

// Tipos derivados para formularios y API
export interface CreateProjectDTO {
  custom_id: string;
  name: string;
  description?: string;
  client: string;
  sale_amount: number;
  projected_cost: number;
  start_date?: string;
  end_date?: string;
  purchase_order?: string;
  hes?: string;
  sale_invoice?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateProjectDTO extends Partial<CreateProjectDTO> {
  status?: ProjectStatus;
  invoice?: string;
  projected_margin?: number;
  real_margin?: number;
}

export interface CreateExpenseDTO {
  project_id: string;
  description: string;
  amount: number;
  net_amount: number;
  tax_amount: number;
  category: ExpenseCategory;
  date: string;
  status: ExpenseStatus;
  document_type: DocumentType;
  document_number?: string;
  notes?: string;
  supplier?: string;
  invoice_number?: string; // DEPRECATED - usar document_number
  tags?: string[];
}

export interface UpdateExpenseDTO extends Partial<CreateExpenseDTO> {
  receipt_url?: string;
  receipt_filename?: string;
}

// Tipos para estadísticas y reportes
export interface ProjectStats {
  id: string;
  name: string;
  custom_id: string;
  client: string;
  sale_amount: number;
  real_cost: number;
  real_margin: number;
  margin_percentage: number;
  status: ProjectStatus;
  expense_count: number;
}

export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_sales: number;
  total_costs: number;
  total_margin: number;
  margin_percentage: number;
  recent_expenses: Expense[];
}

export interface ExpensesByCategory {
  category: ExpenseCategory;
  total_amount: number;
  expense_count: number;
  percentage: number;
}

// Constantes para categorías
export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'materials', label: 'Materiales' },
  { value: 'labor', label: 'Mano de obra' },
  { value: 'equipment', label: 'Equipos/maquinaria' },
  { value: 'transport', label: 'Transporte' },
  { value: 'services', label: 'Servicios contratados' },
  { value: 'permits', label: 'Permisos/licencias' },
  { value: 'utilities', label: 'Servicios públicos' },
  { value: 'insurance', label: 'Seguros' },
  { value: 'supplies', label: 'Insumos/suministros' },
  { value: 'subcontractors', label: 'Subcontratistas' },
  { value: 'tools', label: 'Herramientas' },
  { value: 'safety', label: 'Seguridad/EPP' },
  { value: 'administration', label: 'Gastos administrativos' },
  { value: 'food', label: 'Alimentación' },
  { value: 'accommodation', label: 'Hospedaje' },
  { value: 'fuel', label: 'Combustible' },
  { value: 'other', label: 'Otros' },
  { value: 'general', label: 'General' }
];

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'in_progress', label: 'En Proceso', color: 'blue' },
  { value: 'completed', label: 'Terminado', color: 'green' }
];

export const EXPENSE_STATUSES: { value: ExpenseStatus; label: string; color: string }[] = [
  { value: 'provision', label: 'Provisión', color: 'yellow' },
  { value: 'paid', label: 'Pagado', color: 'green' },
  { value: 'credit', label: 'Crédito', color: 'blue' },
  { value: 'advance', label: 'Anticipo', color: 'purple' }
];

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'boleta', label: 'Boleta' },
  { value: 'factura', label: 'Factura' }
];
