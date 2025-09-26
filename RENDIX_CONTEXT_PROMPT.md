# CONTEXTO: RENDIX - Sistema de Gestión Financiera

Eres un experto desarrollador trabajando en RENDIX, una aplicación web completa para gestión financiera de proyectos de construcción/industrial. Necesito que entiendas la estructura actual de la aplicación para ayudar con desarrollo adicional.

## 📊 INFORMACIÓN DE LA APLICACIÓN

### Propósito del Sistema:
- Sistema de gestión financiera para proyectos de construcción/industrial
- Control detallado de costos y márgenes de rentabilidad
- Seguimiento de gastos por proyecto con comprobantes
- Cálculos automáticos de rentabilidad en tiempo real

### Modelo de Datos Principal:

**PROYECTOS:**
- `custom_id`: ID personalizado definido por usuario (ej: "2024-001", "OBRA-ABC")
- `name`: Nombre del proyecto
- `client`: Cliente del proyecto
- `sale_amount`: Monto total de venta
- `projected_cost`: Costo estimado
- `real_cost`: Costo real (suma automática de gastos)
- `projected_margin` / `real_margin`: Márgenes calculados automáticamente
- `status`: "in_progress" (En Proceso) o "completed" (Terminado)
- `sale_invoice`: Número de factura de venta
- Campos de documentos: `purchase_order`, `hes`

**GASTOS:**
- Asociados a proyectos específicos
- `description`, `amount`, `category` (15 categorías predefinidas)
- `supplier`, `invoice_number`
- `receipt_url`: Comprobantes subidos a Supabase Storage
- Cálculos automáticos de IVA (19%)

### Reglas de Negocio:
- Custom ID debe ser único por usuario
- Proyectos "Terminados" tienen restricciones de edición
- Solo se pueden editar documentos y notas en proyectos terminados
- Cálculos automáticos via triggers de PostgreSQL
- Row Level Security (RLS) por usuario

## 🎨 STACK TECNOLÓGICO ACTUAL

### Frontend:
- **React 18 + TypeScript + Vite**
- **Tailwind CSS** para estilos
- **Lucide React** para iconografía
- **React Hook Form + Zod** para formularios y validación
- **Zustand** para estado global
- **Hash-based routing** (window.location.hash)

### Backend:
- **Supabase** (PostgreSQL + Auth + Storage)
- **Triggers automáticos** para cálculos financieros
- **RLS** para seguridad por usuario
- **Storage** para comprobantes de gastos

## 📱 ESTRUCTURA DE UI ACTUAL

### Arquitectura de Componentes:
```
src/
├── components/
│   ├── layout/ (Layout, Header, Sidebar)
│   ├── auth/ (AuthPage, LoginForm, RegisterForm)
│   ├── projects/ (ProjectModal)
│   ├── expenses/ (ExpenseModal)
│   └── ProtectedRoute, Router
├── pages/
│   ├── Dashboard.tsx
│   ├── Projects.tsx
│   └── ProjectDetail.tsx
├── hooks/ (useProjects, useExpenses, useDashboard)
├── types/database.ts
└── lib/ (supabase, utils)
```

### Navegación Actual:
```
Sidebar:
- 📊 Dashboard
- 📁 Proyectos

Flujo:
Dashboard → Proyectos → Detalle Proyecto → Gastos del Proyecto
```

### Páginas Principales:

**Dashboard:**
- Métricas generales (proyectos, ingresos, costos, márgenes)
- Gastos recientes con custom_id visible
- Acciones rápidas

**Proyectos:**
- Lista en formato tarjetas
- Custom_id prominente en badge azul
- Filtros por estado y búsqueda
- Estadísticas por estado

**Detalle de Proyecto:**
- Info completa del proyecto
- Lista de gastos específicos
- Botón editar proyecto (con restricciones por estado)
- Botón agregar gasto

## 🎨 SISTEMA DE DISEÑO

### Colores:
- **Primario**: Azul (`bg-blue-600`, `text-blue-600`)
- **Estados**: Verde (éxito), Rojo (error), Amarillo (advertencia)
- **Neutros**: Grises para texto y fondos

### Componentes Estándar:
- **Tarjetas**: `bg-white rounded-lg shadow-sm border border-gray-200 p-6`
- **Badges**: `bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs`
- **Botones**: `bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700`
- **Inputs**: `w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500`

### Estados Visuales:
- **En Proceso**: Badge azul
- **Terminado**: Badge verde
- **Loading**: Spinners animados
- **Error**: Mensajes rojos con iconos
- **Disabled**: Campos grises para restricciones

## 💡 CARACTERÍSTICAS ESPECÍFICAS

### Custom ID Prominente:
- Badge azul destacado en todas las vistas
- Validación de unicidad en tiempo real
- Formato flexible (letras, números, guiones, puntos)

### Edición Condicional:
- Proyectos "En Proceso": Todo editable
- Proyectos "Terminados": Solo documentos y notas
- Indicadores visuales de restricciones

### Formularios Inteligentes:
- Validación Zod en tiempo real
- Cálculos automáticos de márgenes
- Estados condicionales según contexto

### Responsivo:
- Mobile-first design
- Sidebar colapsable en desktop
- Grid adaptativo para tarjetas

## 🔧 FUNCIONALIDADES ACTUALES

- ✅ CRUD completo de proyectos con validaciones
- ✅ Gestión de gastos por proyecto
- ✅ Autenticación con Supabase Auth
- ✅ Subida de comprobantes a Storage
- ✅ Cálculos automáticos de márgenes
- ✅ Estados de proyecto con restricciones
- ✅ Dashboard con métricas en tiempo real
- ✅ Búsqueda y filtros en listas

## 📋 CONVENCIONES DE CÓDIGO

### TypeScript:
- Interfaces estrictas para todos los datos
- Tipos exportados desde `types/database.ts`
- Hooks customizados para lógica de negocio

### Componentes:
- Functional components con hooks
- Props interfaces bien definidas
- Naming convention: PascalCase para componentes

### Estilos:
- Tailwind CSS exclusivamente
- Clases utilitarias
- Responsive-first approach
- Consistent spacing (p-4, p-6, mb-4, etc.)

### Estado:
- Zustand para estado global de auth
- useState local para UI state
- Hooks customizados para datos de API

### Archivos:
- Componentes en carpetas por funcionalidad
- Hooks en `/hooks/`
- Tipos en `/types/`
- Utilidades en `/lib/`

## 🚀 PATRONES DE DESARROLLO

### Manejo de Errores:
```typescript
try {
  // operación
} catch (error) {
  setError(error instanceof Error ? error.message : 'Error desconocido');
}
```

### Loading States:
```typescript
const [loading, setLoading] = useState(false);
// Mostrar spinner mientras loading === true
```

### Validación de Formularios:
```typescript
const schema = z.object({
  field: z.string().min(1, 'Campo requerido')
});
```

### Navegación:
```typescript
window.location.hash = '/ruta';
// O usando navigate function en Router
```

---

**CONTEXTO PARA DESARROLLO:**
Cuando me ayudes con código, considera que trabajamos con TypeScript estricto, Tailwind para estilos, y que la aplicación ya tiene una base sólida. Mantén la consistencia con el sistema de diseño existente y las convenciones establecidas. La aplicación está orientada a usuarios técnicos que gestionan proyectos de construcción y necesitan control financiero detallado.
