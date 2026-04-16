# RENDIX - Sistema de Gestion Financiera de Proyectos

Sistema web para gestion financiera de proyectos de construccion/industrial. Desarrollado con React + TypeScript + Supabase.

**Produccion:** https://app.getrendix.com  
**Staging:** https://staging.getrendix.com

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|------------|
| Framework | React 18 + TypeScript |
| Bundler | Vite 6 |
| Estilos | Tailwind CSS 3 (dark mode por clase) + plugin `@tailwindcss/forms` |
| Estado global | Zustand (con persist middleware) |
| Backend / Auth / Storage | Supabase (PostgreSQL + Auth + Storage) |
| Formularios | React Hook Form + Zod |
| Graficos | Recharts |
| Iconos | Lucide React |
| Utilidades | clsx, tailwind-merge, date-fns |
| Linting | ESLint (TypeScript + React Hooks) |
| Fuente | IBM Plex Sans (Google Fonts) |

---

## Requisitos Previos

- Node.js 18+
- Cuenta de Supabase
- Git

---

## Instalacion

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp src/env.example .env

# 3. Editar .env con credenciales de Supabase
# VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
# VITE_SUPABASE_ANON_KEY=tu-anon-key

# 4. Iniciar servidor de desarrollo
npm run dev
```

La app estara disponible en `http://localhost:5173`

---

## Scripts Disponibles

| Script | Comando | Descripcion |
|--------|---------|-------------|
| `npm run dev` | `vite` | Servidor de desarrollo |
| `npm run build` | `tsc && vite build` | Build de produccion |
| `npm run preview` | `vite preview` | Preview del build |
| `npm run lint` | `eslint ...` | Linting del codigo |
| `npm run type-check` | `tsc --noEmit` | Verificacion de tipos |
| `npm run seed:staging` | `tsx scripts/seed.staging.ts` | Seed de datos en staging |
| `npm run health:staging` | `curl -I staging.getrendix.com` | Health check staging |
| `npm run health:prod` | `curl -I app.getrendix.com` | Health check produccion |

---

## Estructura del Proyecto

```
rendix/
├── src/
│   ├── components/
│   │   ├── auth/              # Login, Registro, Recuperar contraseña
│   │   ├── charts/            # Graficos (Recharts)
│   │   ├── expenses/          # Modal de gastos
│   │   ├── layout/            # Layout, Header, Sidebar
│   │   ├── organizations/     # Selector de organizacion
│   │   ├── projects/          # Modal de proyectos
│   │   ├── ui/                # Componentes reutilizables (Button, Card, Table, etc.)
│   │   ├── ProtectedRoute.tsx # Guard de autenticacion
│   │   └── Router.tsx         # Enrutador por hash
│   ├── hooks/                 # Custom hooks (useProjects, useExpenses, etc.)
│   ├── lib/                   # Supabase client, utilidades, colores
│   ├── pages/                 # Paginas principales
│   ├── store/                 # Zustand store (authStore)
│   └── types/                 # Tipos TypeScript y constantes
├── migrations/
│   ├── schemas/               # Esquemas base de la BD
│   ├── staging/               # Migraciones de staging
│   ├── production/            # Migraciones de produccion
│   └── fixes/                 # Fixes y parches SQL
├── scripts/                   # Scripts auxiliares (seed)
└── public/                    # Assets estaticos (favicon, imagenes)
```

---

## Navegacion y Rutas

La app usa navegacion por **hash** (`window.location.hash`), sin libreria de rutas externa.

| Ruta | Pagina | Descripcion |
|------|--------|-------------|
| `#/dashboard` | `Dashboard` | Panel principal con KPIs y graficos |
| `#/projects` | `Projects` | Listado de proyectos |
| `#/projects/:id` | `ProjectDetail` | Detalle de un proyecto con sus gastos |
| `#/settings` | `Settings` | Configuracion de organizacion y miembros |
| Cualquier otra | `Dashboard` | Fallback al dashboard |

La barra lateral (Sidebar) muestra los enlaces a Dashboard, Proyectos y Configuracion.

> **Nota:** Existe `src/pages/Expenses.tsx` (listado global de gastos) pero actualmente no esta registrada en el Router ni en el Sidebar.

---

## Autenticacion

### Flujo

1. `App.tsx` envuelve todo en `ProtectedRoute`
2. `ProtectedRoute` llama a `authStore.initialize()` que ejecuta `supabase.auth.getSession()`
3. Si no hay sesion: muestra `AuthPage` (login/registro)
4. Si hay sesion: renderiza `Router` con las paginas protegidas

### Funcionalidades de Auth

| Funcionalidad | Estado | Detalle |
|---------------|--------|---------|
| Login | Implementado | Email + contraseña via `signInWithPassword` |
| Registro | Implementado | Email + contraseña via `signUp` |
| Recuperar contraseña (envio email) | Implementado | `resetPasswordForEmail` desde `LoginForm` |
| Establecer nueva contraseña | **Pendiente** | No hay ruta `#/reset-password` ni formulario para `updateUser({ password })` |
| Logout | Implementado | `signOut` + limpieza de estado |
| Persistencia de sesion | Automatico | Supabase SDK maneja localStorage |

### Auth Store (Zustand)

```
Estado persistido en localStorage (key: "rendix-auth-storage"):
- activeOrganizationId: string | null
- isDarkMode: boolean

Estado en memoria (no persistido):
- user: { id, email, created_at } | null
- loading: boolean
- initialized: boolean
```

---

## Sistema Multi-Organizacion

La app soporta multiples organizaciones por usuario.

### Roles

| Rol | Permisos |
|-----|----------|
| **Owner** | Control total. Se asigna automaticamente al crear la organizacion |
| **Admin** | Gestionar miembros y configuraciones |
| **Member** | Crear y editar proyectos y gastos |
| **Viewer** | Solo lectura |

### Flujo

- Al iniciar sesion, se carga la lista de organizaciones del usuario via RPC `get_user_organizations`
- El usuario selecciona la organizacion activa desde el Header (`OrganizationSelector`)
- Todos los hooks (`useProjects`, `useExpenses`, `useDashboard`) filtran datos por `activeOrganizationId`
- La organizacion activa se persiste en localStorage

---

## Paginas y Funcionalidades

### Dashboard (`/dashboard`)

- 4 tarjetas KPI: proyectos totales, activos, ventas totales, margen promedio
- Graficos: estado de proyectos (donut), ingresos vs costos (barras), gastos por categoria (pie), tendencia mensual (linea)
- Rendimiento financiero por proyecto
- Ultimos 10 gastos con acceso rapido a edicion
- Filtro por proyecto individual

### Proyectos (`/projects`)

- Listado en tarjetas con busqueda y filtro por estado
- Creacion/edicion via modal (`ProjectModal`)
- Auto-generacion de ID personalizado (ej: `P-2025-001`)
- Validacion de unicidad de `custom_id` por organizacion
- Estados: `in_progress` (En progreso), `completed` (Completado)

### Detalle de Proyecto (`/projects/:id`)

- Informacion del proyecto y progreso
- Resumen financiero (venta, costo proyectado, margen proyectado, costo real, margen real)
- Lista de gastos del proyecto con filtros
- Graficos: gastos por categoria y tendencia mensual (modo compacto)
- CRUD completo de gastos desde el detalle
- Edicion del proyecto

### Configuracion (`/settings`)

- Informacion de la organizacion (nombre, rol, total miembros)
- Listado de miembros con email y rol
- Agregar miembros por email (solo admin/owner)
- Cambiar rol de miembros
- Eliminar miembros (con confirmacion)

---

## Modelo de Datos

### Diagrama de Relaciones

```
auth.users
  │
  ├──< organizations (owner_id)
  │       │
  │       ├──< organization_members (organization_id)
  │       │       └── user_id → auth.users
  │       │
  │       ├──< projects (organization_id)
  │       │       │
  │       │       └──< expenses (project_id)
  │       │
  │       └──< expenses (organization_id)
  │
  └──< organization_members (user_id)
```

### Tabla: `organizations`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador unico |
| `name` | VARCHAR(255) | Nombre de la organizacion |
| `slug` | VARCHAR(100) UNIQUE | URL-friendly name |
| `owner_id` | UUID → auth.users | Propietario |
| `logo_url` | TEXT | URL del logo |
| `settings` | JSONB | Configuraciones adicionales |
| `created_at` | TIMESTAMPTZ | Fecha de creacion |
| `updated_at` | TIMESTAMPTZ | Ultima actualizacion |

### Tabla: `organization_members`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador unico |
| `organization_id` | UUID → organizations | Organizacion |
| `user_id` | UUID → auth.users | Usuario miembro |
| `role` | VARCHAR(50) | Rol: owner, admin, member, viewer |
| `joined_at` | TIMESTAMPTZ | Fecha de ingreso |

Constraint UNIQUE en (`organization_id`, `user_id`).

### Tabla: `projects`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador unico |
| `custom_id` | VARCHAR(50) UNIQUE | ID personalizado (ej: P-2025-001) |
| `name` | VARCHAR(255) UNIQUE | Nombre del proyecto |
| `description` | TEXT | Descripcion |
| `client` | VARCHAR(255) | Cliente |
| `sale_amount` | DECIMAL(12,2) | Monto de venta |
| `projected_cost` | DECIMAL(12,2) | Costo proyectado |
| `projected_margin` | DECIMAL(12,2) | Margen proyectado (calculado) |
| `real_cost` | DECIMAL(12,2) | Costo real (suma de gastos) |
| `real_margin` | DECIMAL(12,2) | Margen real (calculado) |
| `start_date` | DATE | Fecha de inicio |
| `end_date` | DATE | Fecha de termino |
| `status` | VARCHAR(50) | Estado: in_progress, completed |
| `purchase_order` | VARCHAR(100) | Orden de compra |
| `hes` | VARCHAR(100) | HES |
| `invoice` | VARCHAR(100) | Factura |
| `sale_invoice` | VARCHAR(100) | Factura de venta |
| `tags` | TEXT[] | Etiquetas |
| `notes` | TEXT | Notas |
| `metadata` | JSONB | Metadata adicional |
| `user_id` | TEXT | Creador (auth.uid) |
| `organization_id` | UUID → organizations | Organizacion |
| `created_at` | TIMESTAMPTZ | Fecha de creacion |
| `updated_at` | TIMESTAMPTZ | Ultima actualizacion |

### Tabla: `expenses`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | UUID (PK) | Identificador unico |
| `project_id` | UUID → projects | Proyecto asociado |
| `description` | TEXT | Descripcion del gasto |
| `amount` | DECIMAL(10,2) | Monto total (bruto) |
| `net_amount` | DECIMAL(10,2) | Monto neto |
| `tax_amount` | DECIMAL(10,2) | Monto IVA (19%) |
| `category` | VARCHAR(100) | Categoria del gasto |
| `date` | DATE | Fecha del gasto |
| `status` | VARCHAR(50) | Estado: provision, paid, credit, advance |
| `document_type` | VARCHAR(20) | Tipo: boleta, factura |
| `document_number` | VARCHAR(100) | Numero de documento |
| `notes` | TEXT | Notas |
| `receipt_url` | TEXT | URL del comprobante |
| `receipt_filename` | VARCHAR(255) | Nombre del archivo |
| `supplier` | VARCHAR(255) | Proveedor |
| `invoice_number` | VARCHAR(100) | Numero de factura (deprecado) |
| `tags` | TEXT[] | Etiquetas |
| `metadata` | JSONB | Metadata adicional |
| `user_id` | TEXT | Creador (auth.uid) |
| `organization_id` | UUID → organizations | Organizacion |
| `created_at` | TIMESTAMPTZ | Fecha de creacion |
| `updated_at` | TIMESTAMPTZ | Ultima actualizacion |

### Categorias de Gastos (19 categorias)

| Valor | Etiqueta |
|-------|----------|
| `materials` | Materiales |
| `labor` | Mano de obra |
| `equipment` | Equipos |
| `transport` | Transporte |
| `services` | Servicios |
| `permits` | Permisos |
| `utilities` | Servicios basicos |
| `insurance` | Seguros |
| `supplies` | Insumos |
| `subcontractors` | Subcontratistas |
| `tools` | Herramientas |
| `safety` | Seguridad/EPP |
| `administration` | Gastos administrativos |
| `salary` | Sueldos |
| `food` | Alimentacion |
| `accommodation` | Alojamiento |
| `fuel` | Combustible |
| `other` | Otros |
| `general` | General |

### Estados de Gastos

| Valor | Etiqueta |
|-------|----------|
| `provision` | Provision |
| `paid` | Pagado |
| `credit` | Credito |
| `advance` | Anticipo |

### Tipos de Documento

| Valor | Etiqueta |
|-------|----------|
| `boleta` | Boleta |
| `factura` | Factura |

---

## Logica de Negocio y Triggers en BD

### Calculos Automaticos

- `projected_margin = sale_amount - projected_cost`
- `real_cost = SUM(expenses.amount)` por proyecto
- `real_margin = sale_amount - real_cost`
- Recalculo automatico via triggers al insertar/actualizar/eliminar gastos

### IVA (19%)

- Al crear un gasto con `net_amount` y `tax_amount` en 0, un trigger calcula:
  - `net_amount = amount / 1.19`
  - `tax_amount = amount - net_amount`

### Custom ID de Proyectos

- Auto-generado si no se proporciona, formato: `P-YYYY-NNN`
- Validacion de unicidad por organizacion

### Validaciones en BD

- `amount > 0` en gastos
- `net_amount >= 0`, `tax_amount >= 0`
- `status` restringido a valores validos via CHECK constraints
- `category` validada via CHECK constraint `expenses_valid_category`

---

## Row Level Security (RLS)

- Habilitado en todas las tablas
- Los usuarios solo acceden a datos de sus organizaciones
- Las politicas verifican membresia en `organization_members` via `auth.uid()`
- Storage: bucket `receipts` con politicas por usuario

---

## Custom Hooks

| Hook | Descripcion | Retorna |
|------|-------------|---------|
| `useProjects` | CRUD de proyectos de la organizacion activa | `projects, loading, error, refetch, createProject, updateProject, deleteProject, getProjectStats, canEditProject, canDeleteProject, validateCustomId` |
| `useProject(id)` | Un proyecto por ID | `project, loading, error, refetch` |
| `useExpenses(projectId?)` | CRUD de gastos, opcionalmente filtrado por proyecto | `expenses, loading, error, refetch, createExpense, updateExpense, deleteExpense, getExpensesByCategory` |
| `useExpense(id)` | Un gasto por ID | `expense, loading, error` |
| `useDashboard` | Estadisticas del dashboard | `stats, loading, error, refetch, getMonthlyStats, getProjectsOverview` |
| `useOrganizations` | Organizaciones del usuario | `organizations, loading, error, refetch` |
| `useOrganizationMembers` | Miembros de la organizacion activa | `members, loading, error, fetchMembers, addMemberByEmail, updateMemberRole, removeMember` |

Todos los hooks (excepto `useOrganizations`) dependen de `activeOrganizationId` del store.

---

## Componentes UI Reutilizables

| Componente | Descripcion |
|------------|-------------|
| `Button` | Boton con variantes (primary, secondary, etc.) y estado loading |
| `Badge` | Etiquetas de estado/categoria con colores |
| `Card` | Contenedor con CardHeader, CardTitle, CardContent, CardFooter |
| `Table` | Tabla responsive con scroll |
| `EmptyState` | Estado vacio con icono y accion opcional |
| `Tooltip` | Tooltip hover/focus |
| `ConfirmDialog` | Dialogo de confirmacion con variante danger |
| `CollapsibleCard` | Card con cabecera plegable |
| `ThemeToggle` | Toggle de tema claro/oscuro |

---

## Graficos

| Componente | Tipo | Descripcion |
|------------|------|-------------|
| `ProjectsStatusChart` | Donut | Proyectos en progreso vs completados |
| `IncomeVsCostsChart` | Barras | Ingresos, costos y margen |
| `ExpensesByCategoryChart` | Pie | Gastos agrupados por categoria (consulta a BD) |
| `MonthlyExpensesTrendChart` | Linea | Tendencia mensual de gastos |
| `TimeRangeSelector` | Selector | Rango temporal para filtrar graficos |

Todos los graficos usan Recharts y soportan modo `compact` para vistas embebidas.

---

## Storage (Comprobantes)

- Bucket: `receipts` en Supabase Storage
- Ruta de archivos: `receipts/{projectId}/{expenseId}_{timestamp}.{ext}`
- Operaciones: subida, descarga (URL publica), eliminacion
- Validacion de tipo y tamano de archivo en frontend
- Limpieza automatica al actualizar o eliminar gastos

---

## Tema y UI

- **Dark mode** por clase CSS (`dark` en `<html>`)
- Persistido en localStorage via Zustand
- Toggle disponible en el Header
- La pantalla de login siempre fuerza dark mode
- Paleta principal: azul (primary), naranja (botones de accion)

---

## Variables de Entorno

### Desarrollo Local (Vite)

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### Staging (Vercel Preview)

```env
NEXT_PUBLIC_SUPABASE_URL=https://lkqjqvzddqsvgyxkvjcf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PUBLIC_APP_URL=https://staging.getrendix.com
```

### Produccion (Vercel Production)

```env
NEXT_PUBLIC_SUPABASE_URL=https://rendix-prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PUBLIC_APP_URL=https://app.getrendix.com
```

> **Nota:** El cliente Supabase en codigo soporta ambos prefijos (`VITE_*` para desarrollo local con Vite y `NEXT_PUBLIC_*` para Vercel).

---

## Deploy

| Entorno | Plataforma | Rama | Dominio | Deploy |
|---------|------------|------|---------|--------|
| Produccion | Vercel | `master` | app.getrendix.com | Automatico en push |
| Staging | Vercel (Preview) | `staging` | staging.getrendix.com | Automatico en push |

### Flujo de Desarrollo

```bash
# Desarrollo en staging
git checkout staging
# ... hacer cambios ...
git add . && git commit -m "descripcion"
git push origin staging    # → deploy automatico a staging

# Promocion a produccion
git checkout master
git merge staging
git push origin master     # → deploy automatico a produccion
```

---

## Migraciones SQL

Todos los archivos SQL estan en `/migrations/`:

| Carpeta | Contenido |
|---------|-----------|
| `schemas/` | Esquemas base: `supabase_schema.sql` (original), `supabase_schema_staging_clean.sql` (alineado con la app actual) |
| `staging/` | Migraciones aplicadas en staging (organizaciones, fix de datos, decimal limits, etc.) |
| `production/` | Migraciones aplicadas en produccion (organizaciones, fix de policies, debug) |
| `fixes/` | Parches generales: categorias, IVA, RLS, RPCs para miembros, etc. |

### RPCs de Supabase (funciones de BD)

| Funcion | Descripcion |
|---------|-------------|
| `get_user_organizations` | Obtiene las organizaciones del usuario autenticado con su rol |
| `get_organization_members_with_emails` | Lista miembros de una organizacion con sus emails |
| `get_user_emails` | Obtiene emails de usuarios por IDs |
| `get_user_id_by_email` | Busca un usuario por email para invitarlo |

---

## Pendientes Conocidos (TODO)

- [ ] Ruta `#/expenses` no esta registrada en el Router ni en el Sidebar (el archivo `Expenses.tsx` existe)
- [ ] Pantalla para establecer nueva contraseña tras el enlace de recuperacion (`#/reset-password`)
- [ ] Verificar que los roles (admin, member, viewer) esten aplicados con RLS en BD, no solo en UI
- [ ] Menu "mas opciones" en tarjetas de proyecto (referenciado en codigo pero no implementado)
- [ ] Exportacion a PDF/Excel (documentada pero no implementada)
- [ ] Alinear convenciones de variables de entorno (`VITE_*` vs `NEXT_PUBLIC_*`)
- [ ] El `package.json` aun tiene `name: "solid-pro"` en vez de `"rendix"`

---

## Licencia

MIT
