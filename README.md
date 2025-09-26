# RENDIX - Sistema de Gestión Financiera de Proyectos

Sistema web completo para gestión financiera de proyectos de construcción/industrial desarrollado con React + TypeScript + Supabase.

## 🚀 Características

- **Gestión de Proyectos**: CRUD completo con auto-generación de IDs (P-2024-001)
- **Control de Gastos**: Registro detallado con comprobantes y categorización
- **Cálculos Automáticos**: Márgenes y costos reales en tiempo real
- **Dashboard Financiero**: Métricas y resúmenes ejecutivos
- **Autenticación**: Sistema seguro con Supabase Auth
- **Reportes**: Análisis financiero con filtros y exportación

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI**: Tailwind CSS + Lucide Icons
- **Estado**: Zustand
- **Formularios**: React Hook Form + Zod validation

## 📋 Requisitos Previos

- Node.js 18 o superior
- Cuenta de Supabase
- Git

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a Settings > API para obtener tus credenciales
3. Copia el archivo de variables de entorno:

```bash
cp src/env.example .env
```

4. Completa el archivo `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Configurar Base de Datos

1. Ve al SQL Editor en tu proyecto de Supabase
2. Ejecuta el esquema completo desde el archivo `supabase_schema.sql`
3. Verifica que las tablas `projects` y `expenses` se crearon correctamente

### 4. Configurar Storage (Opcional)

Si quieres usar comprobantes de gastos:

1. Ve a Storage en tu proyecto de Supabase
2. Crea un bucket llamado `receipts`
3. Configura como público si es necesario

### 5. Iniciar Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── auth/           # Componentes de autenticación
│   └── layout/         # Layout y navegación
├── hooks/              # Custom hooks para API
├── lib/                # Utilidades y configuración
├── pages/              # Páginas principales
├── store/              # Estado global (Zustand)
└── types/              # Tipos TypeScript
```

## 🔑 Funcionalidades Principales

### Dashboard
- Resumen financiero general
- Métricas de proyectos activos/completados
- Gastos recientes
- Indicadores de rentabilidad

### Proyectos
- Crear/editar/eliminar proyectos
- Auto-generación de IDs (P-2024-001)
- Seguimiento financiero automático
- Estados: activo, completado, en pausa, cancelado

### Gastos
- Registro detallado por proyecto
- 15 categorías predefinidas
- Subida de comprobantes
- Cálculos automáticos de costos

### Reportes
- Por proyecto individual
- Por período de tiempo
- Por categoría de gastos
- Exportación a PDF/Excel

## 🗃️ Base de Datos

### Tablas Principales

- **projects**: Información y financiación de proyectos
- **expenses**: Gastos asociados a proyectos

### Características del Esquema

- **Triggers**: Cálculos automáticos de márgenes
- **Functions**: Auto-generación de IDs personalizados
- **RLS**: Seguridad por usuario
- **Storage**: Comprobantes organizados por proyecto

## 🔒 Seguridad

- Row Level Security (RLS) habilitado
- Autenticación obligatoria
- Políticas por usuario
- Validaciones en frontend y backend

## 🚀 Producción

### Build

```bash
npm run build
```

### Deploy

Los archivos de producción estarán en `dist/`. Puedes deployar en:

- Vercel
- Netlify  
- Render
- Tu servidor preferido

### Variables de Entorno en Producción

Asegúrate de configurar las variables de entorno en tu plataforma de deploy.

## 📊 Reglas de Negocio

### Cálculos Automáticos

- `projected_margin = sale_amount - projected_cost`
- `real_cost = SUM(expenses.amount)`
- `real_margin = sale_amount - real_cost`

### Validaciones

- Montos de gastos > 0
- Nombres de proyecto únicos
- Usuario autenticado para todas las operaciones

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Si tienes problemas:

1. Revisa la documentación de [Supabase](https://supabase.com/docs)
2. Verifica las variables de entorno
3. Asegúrate de que el esquema SQL se ejecutó correctamente
4. Revisa la consola del navegador para errores

---

**RENDIX** - Sistema de Gestión Financiera de Proyectos
Desarrollado con ❤️ usando React + TypeScript + Supabase