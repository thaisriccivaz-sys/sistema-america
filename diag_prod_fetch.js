// Diagnóstico de produção: chama a API do sistema real
// Uso: node diag_prod_fetch.js <TOKEN>
// Onde TOKEN = erp_token do localStorage do browser

const https = require('https');

const TOKEN = process.argv[2] || '';
const HOST = 'sistema.america.onrender.com';

if (!TOKEN) {
  console.log('='.repeat(60));
  console.log('INSTRUÇÃO: Para rodar este diagnóstico, você precisa do token JWT.');
  console.log('');
  console.log('Como obter:');
  console.log('1. Abra o sistema no Chrome: https://sistema.america.onrender.com/');
  console.log('2. Pressione F12 para abrir o DevTools');
  console.log('3. Vá na aba "Console"');
  console.log('4. Digite: localStorage.getItem("erp_token")');
  console.log('5. Copie o valor e rode:');
  console.log('   node diag_prod_fetch.js SEU_TOKEN_AQUI');
  console.log('='.repeat(60));
  process.exit(0);
}

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST, path, method: 'GET',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, raw: data.slice(0, 500) }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('=== DIAGNÓSTICO SAC – PRODUÇÃO ===');
  console.log(`Host: ${HOST}\n`);

  // 1. Colaboradores por setor: Comercial
  console.log('--- 1. /api/sac/colaboradores-por-setor?setor=Comercial ---');
  const r1 = await apiGet('/api/sac/colaboradores-por-setor?setor=Comercial');
  if (r1.status !== 200) {
    console.log('ERRO status:', r1.status, r1.raw || JSON.stringify(r1.body));
  } else if (Array.isArray(r1.body)) {
    console.log('Total retornado:', r1.body.length);
    r1.body.forEach(c => {
      const dept = c.departamento || '???';
      const deptHex = Buffer.from(dept, 'utf8').toString('hex');
      console.log(`  - [${dept}] hex=[${deptHex}] | ${c.nome} | status=${c.status} | username=${c.username}`);
    });
  }

  // 2. Todos os colaboradores (filtrar Comercial)
  console.log('\n--- 2. /api/colaboradores (filtrar Thayn*/Caroline*/Laila*) ---');
  const r2 = await apiGet('/api/colaboradores');
  if (r2.status !== 200) {
    console.log('ERRO status:', r2.status);
  } else if (Array.isArray(r2.body)) {
    const interesse = r2.body.filter(c => /thayn|caroline.*flor|laila.*felix|ana\s+v.*gomes/i.test(c.nome_completo || ''));
    console.log('Colaboradores de interesse:');
    interesse.forEach(c => {
      const dept = c.departamento || '???';
      const deptHex = Buffer.from(dept, 'utf8').toString('hex');
      console.log(`  - nome=[${c.nome_completo}] | dept=[${dept}] hex=[${deptHex}] | status=[${c.status}]`);
    });
    
    // Todos departamentos únicos
    const deptsUnicos = [...new Set(r2.body.map(c => c.departamento || ''))].sort();
    console.log('\nDepartamentos únicos em colaboradores:');
    deptsUnicos.forEach(d => {
      const hex = Buffer.from(d, 'utf8').toString('hex');
      console.log(`  [${d}] hex=[${hex}]`);
    });
  }

  // 3. Departamentos
  console.log('\n--- 3. /api/departamentos (verificar responsavel do Comercial) ---');
  const r3 = await apiGet('/api/departamentos');
  if (r3.status !== 200) {
    console.log('ERRO status:', r3.status);
  } else if (Array.isArray(r3.body)) {
    const com = r3.body.find(d => /comercial/i.test(d.nome));
    console.log('Departamento Comercial:', JSON.stringify(com, null, 2));
  }
}

main().catch(e => console.error('Erro fatal:', e));
