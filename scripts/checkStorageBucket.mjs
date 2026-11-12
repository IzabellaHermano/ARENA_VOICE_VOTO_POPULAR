import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carrega .env manualmente
const envPath = path.resolve('.env');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = trimmed.replace('VITE_SUPABASE_URL=', '').trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = trimmed.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
    }
  });
}

supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

console.log('--- TESTANDO SUPABASE STORAGE ---');
console.log('URL:', supabaseUrl);
console.log('Anon Key presente:', !!supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStorage() {
  try {
    // 1. Tenta listar buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    console.log('\n[1] listBuckets():');
    if (bucketsError) {
      console.log('  Erro ao listar buckets:', bucketsError.message, bucketsError);
    } else {
      console.log('  Buckets encontrados:', buckets?.map(b => ({ id: b.id, name: b.name, public: b.public })));
    }

    // 2. Tenta listar arquivos no bucket 'project-banners'
    const { data: files, error: filesError } = await supabase.storage.from('project-banners').list('banners');
    console.log('\n[2] from("project-banners").list("banners"):');
    if (filesError) {
      console.log('  Erro:', filesError.message, filesError);
    } else {
      console.log('  Arquivos encontrados:', files?.length);
    }

    // 3. Tenta obter URL pública de teste
    const { data: publicData } = supabase.storage.from('project-banners').getPublicUrl('banners/test.png');
    console.log('\n[3] getPublicUrl:', publicData?.publicUrl);

    // 4. Teste de upload anônimo
    const testContent = Buffer.from('test-image-content');
    const { data: upAnon, error: upAnonErr } = await supabase.storage
      .from('project-banners')
      .upload(`banners/probe_${Date.now()}.png`, testContent, { contentType: 'image/png' });
    console.log('\n[4] Upload com chave anon (sem login de usuário):');
    if (upAnonErr) {
      console.log('  Resultado esperado / erro:', upAnonErr.message);
    } else {
      console.log('  Upload anônimo teve sucesso:', upAnon);
    }

    // 5. Teste com login administrativo
    console.log('\n[5] Efetuando login como admin (admin@cptm.sp.gov.br)...');
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'admin@cptm.sp.gov.br',
      password: process.env.TEST_ADMIN_PASSWORD || '123456'
    });

    if (authErr) {
      console.log('  Erro no login admin:', authErr.message);
    } else {
      console.log('  Admin autenticado com sucesso! UID:', authData?.user?.id);

      // Agora tenta listar buckets como admin
      const { data: adminBuckets, error: adminBucketsErr } = await supabase.storage.listBuckets();
      console.log('\n[6] listBuckets() como admin:');
      if (adminBucketsErr) {
        console.log('  Erro:', adminBucketsErr.message);
      } else {
        console.log('  Buckets:', adminBuckets);
      }

      // Tenta criar bucket pelo client caso não exista
      const exists = adminBuckets?.some(b => b.id === 'project-banners');
      if (!exists) {
        console.log('\n[7] Tentando createBucket("project-banners") via SDK...');
        const { data: createData, error: createErr } = await supabase.storage.createBucket('project-banners', {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        });
        if (createErr) {
          console.log('  Erro createBucket:', createErr.message, createErr);
        } else {
          console.log('  createBucket sucesso:', createData);
        }
      } else {
        console.log('\n[7] Bucket "project-banners" já existe!');
      }

      // Tenta upload como admin
      console.log('\n[8] Tentando upload como admin...');
      const { data: upAdmin, error: upAdminErr } = await supabase.storage
        .from('project-banners')
        .upload(`banners/probe_admin_${Date.now()}.png`, testContent, { contentType: 'image/png' });
      if (upAdminErr) {
        console.log('  Erro no upload admin:', upAdminErr.message, upAdminErr);
      } else {
        console.log('  Upload como admin SUCESSO:', upAdmin);
        // Remove arquivo de teste
        await supabase.storage.from('project-banners').remove([upAdmin.path]);
        console.log('  Arquivo de teste removido após validação.');
      }
    }

  } catch (e) {
    console.error('Exceção geral:', e);
  }
}

checkStorage();
