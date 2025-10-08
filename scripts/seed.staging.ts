#!/usr/bin/env tsx
/**
 * Seed script para entorno staging de Rendix
 * Crea datos dummy mínimos para testing
 */

import { createClient } from '@supabase/supabase-js';

// Configuración para staging
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Datos dummy
const DUMMY_USERS = [
  {
    email: 'admin@getrendix.com',
    password: 'admin123456',
    role: 'admin'
  },
  {
    email: 'user1@getrendix.com', 
    password: 'user123456',
    role: 'user'
  },
  {
    email: 'user2@getrendix.com',
    password: 'user123456', 
    role: 'user'
  }
];

const DUMMY_PROJECTS = [
  {
    custom_id: 'P-2024-001',
    name: 'Construcción Edificio Central',
    description: 'Proyecto de construcción de edificio corporativo de 10 pisos',
    client: 'Constructora ABC Ltda',
    sale_amount: 500000000, // $500M CLP
    projected_cost: 400000000, // $400M CLP
    start_date: '2024-01-15',
    end_date: '2024-12-31',
    status: 'in_progress',
    purchase_order: 'OC-2024-001',
    tags: ['construccion', 'edificio', 'corporativo']
  },
  {
    custom_id: 'P-2024-002', 
    name: 'Remodelación Oficinas Norte',
    description: 'Remodelación completa de oficinas sector norte',
    client: 'Empresa XYZ S.A.',
    sale_amount: 150000000, // $150M CLP
    projected_cost: 120000000, // $120M CLP
    start_date: '2024-03-01',
    end_date: '2024-06-30',
    status: 'completed',
    purchase_order: 'OC-2024-002',
    tags: ['remodelacion', 'oficinas']
  },
  {
    custom_id: 'P-2024-003',
    name: 'Instalación Sistema Eléctrico',
    description: 'Instalación de sistema eléctrico industrial',
    client: 'Industrias DEF',
    sale_amount: 80000000, // $80M CLP
    projected_cost: 65000000, // $65M CLP
    start_date: '2024-02-01',
    end_date: '2024-04-30',
    status: 'in_progress',
    purchase_order: 'OC-2024-003',
    tags: ['electrico', 'industrial']
  }
];

const DUMMY_EXPENSES = [
  // Proyecto 1 - Edificio Central
  {
    description: 'Compra de cemento y materiales base',
    amount: 25000000,
    net_amount: 21008403,
    tax_amount: 3991597,
    category: 'materials',
    date: '2024-01-20',
    status: 'paid',
    document_type: 'factura',
    document_number: 'F-001234',
    supplier: 'Cementos del Sur S.A.'
  },
  {
    description: 'Pago mano de obra mes enero',
    amount: 15000000,
    net_amount: 12605042,
    tax_amount: 2394958,
    category: 'labor',
    date: '2024-01-31',
    status: 'paid',
    document_type: 'factura',
    document_number: 'F-001235',
    supplier: 'Constructora Mano de Obra Ltda'
  },
  {
    description: 'Arriendo grúa torre mes febrero',
    amount: 8000000,
    net_amount: 6722689,
    tax_amount: 1277311,
    category: 'equipment',
    date: '2024-02-01',
    status: 'provision',
    document_type: 'factura',
    document_number: 'F-001236',
    supplier: 'Grúas y Equipos S.A.'
  },
  // Proyecto 2 - Oficinas Norte
  {
    description: 'Materiales de terminación',
    amount: 12000000,
    net_amount: 10084034,
    tax_amount: 1915966,
    category: 'materials',
    date: '2024-03-15',
    status: 'paid',
    document_type: 'factura',
    document_number: 'F-002001',
    supplier: 'Terminaciones Premium Ltda'
  },
  {
    description: 'Instalación sistemas de climatización',
    amount: 18000000,
    net_amount: 15126050,
    tax_amount: 2873950,
    category: 'services',
    date: '2024-04-10',
    status: 'paid',
    document_type: 'factura',
    document_number: 'F-002002',
    supplier: 'Clima Tech S.A.'
  },
  // Proyecto 3 - Sistema Eléctrico
  {
    description: 'Cables y componentes eléctricos',
    amount: 22000000,
    net_amount: 18487395,
    tax_amount: 3512605,
    category: 'materials',
    date: '2024-02-15',
    status: 'paid',
    document_type: 'factura',
    document_number: 'F-003001',
    supplier: 'Eléctricos Industriales Ltda'
  },
  {
    description: 'Instalación y configuración',
    amount: 10000000,
    net_amount: 8403361,
    tax_amount: 1596639,
    category: 'labor',
    date: '2024-03-01',
    status: 'provision',
    document_type: 'factura', 
    document_number: 'F-003002',
    supplier: 'Técnicos Especialistas S.A.'
  }
];

async function createUsers() {
  console.log('👥 Creando usuarios dummy...');
  
  const createdUsers = [];
  
  for (const userData of DUMMY_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    });
    
    if (error) {
      console.error(`❌ Error creando usuario ${userData.email}:`, error.message);
      continue;
    }
    
    console.log(`✅ Usuario creado: ${userData.email} (${userData.role})`);
    createdUsers.push(data.user);
  }
  
  return createdUsers;
}

async function createProjects(users: any[]) {
  console.log('🏗️ Creando proyectos dummy...');
  
  const createdProjects = [];
  
  for (let i = 0; i < DUMMY_PROJECTS.length; i++) {
    const projectData = DUMMY_PROJECTS[i];
    const user = users[i % users.length]; // Rotar entre usuarios
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...projectData,
        user_id: user.id,
        projected_margin: projectData.sale_amount - projectData.projected_cost,
        real_cost: 0,
        real_margin: projectData.sale_amount,
        metadata: {}
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error creando proyecto ${projectData.name}:`, error.message);
      continue;
    }
    
    console.log(`✅ Proyecto creado: ${projectData.custom_id} - ${projectData.name}`);
    createdProjects.push(data);
  }
  
  return createdProjects;
}

async function createExpenses(projects: any[], users: any[]) {
  console.log('💰 Creando gastos dummy...');
  
  let expenseIndex = 0;
  
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const user = users[i % users.length];
    
    // Número de gastos por proyecto (2-3 gastos)
    const expensesCount = i === 0 ? 3 : 2;
    
    for (let j = 0; j < expensesCount; j++) {
      if (expenseIndex >= DUMMY_EXPENSES.length) break;
      
      const expenseData = DUMMY_EXPENSES[expenseIndex];
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expenseData,
          project_id: project.id,
          user_id: user.id,
          tags: [],
          metadata: {}
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error creando gasto ${expenseData.description}:`, error.message);
        continue;
      }
      
      console.log(`✅ Gasto creado: ${expenseData.description} - $${expenseData.amount.toLocaleString()}`);
      expenseIndex++;
    }
  }
}

async function main() {
  console.log('🌱 Iniciando seed para entorno staging...\n');
  
  try {
    // 1. Crear usuarios
    const users = await createUsers();
    if (users.length === 0) {
      throw new Error('No se pudieron crear usuarios');
    }
    
    console.log('');
    
    // 2. Crear proyectos
    const projects = await createProjects(users);
    if (projects.length === 0) {
      throw new Error('No se pudieron crear proyectos');
    }
    
    console.log('');
    
    // 3. Crear gastos
    await createExpenses(projects, users);
    
    console.log('\n🎉 Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`- ${users.length} usuarios creados`);
    console.log(`- ${projects.length} proyectos creados`);
    console.log('- 7 gastos creados');
    console.log('\n🔑 Credenciales de acceso:');
    console.log('- admin@getrendix.com / admin123456 (Admin)');
    console.log('- user1@getrendix.com / user123456 (Usuario)');
    console.log('- user2@getrendix.com / user123456 (Usuario)');
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  }
}

// Ejecutar seed
if (require.main === module) {
  main();
}
