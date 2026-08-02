// Diagnóstico: consulta a API de produção para verificar colaboradores por setor
// Precisa de um token válido - passe como argumento: node diag_sac_prod.js <TOKEN>
const https = require('https');

const TOKEN = process.argv[2] || '';
const HOST = 'sistema.america.onrender.com';

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  if (!TOKEN) {
    console.log('ERRO: Passe o token JWT como argumento:');
    console.log('  node diag_sac_prod.js <TOKEN>');
    console.log('\nComo obter o token: abra o sistema no browser, F12 > Console > localStorage.getItem("erp_token")');
    return;
  }

  console.log('=== DIAGNÓSTICO SAC – API de Produção ===\n');

  // 1. Testa endpoint colaboradores-por-setor para Comercial
  console.log('1. GET /api/sac/colaboradores-por-setor?setor=Comercial');
  const comercial = await apiGet('/api/sac/colaboradores-por-setor?setor=Comercial');
  console.log(`   Status: ${comercial.status}`);
  if (Array.isArray(comercial.body)) {
    console.log(`   Encontrados: ${comercial.body.length} colaboradores`);
    comercial.body.forEach(c => console.log(`   - [${c.departamento}] ${c.nome} | status=${c.status} | username=${c.username}`));
  } else {
    console.log('   Resposta:', JSON.stringify(comercial.body));
  }

  // 2. Testa para Logística
  console.log('\n2. GET /api/sac/colaboradores-por-setor?setor=Log%C3%ADstica');
  const logistica = await apiGet('/api/sac/colaboradores-por-setor?setor=Log%C3%ADstica');
  console.log(`   Status: ${logistica.status}`);
  if (Array.isArray(logistica.body)) {
    console.log(`   Encontrados: ${logistica.body.length} colaboradores`);
    logistica.body.slice(0,10).forEach(c => console.log(`   - [${c.departamento}] ${c.nome}`));
    if (logistica.body.length > 10) console.log(`   ... e mais ${logistica.body.length - 10}`);
  } else {
    console.log('   Resposta:', JSON.stringify(logistica.body));
  }

  // 3. Lista todos os colaboradores ativos para ver departamentos reais
  console.log('\n3. Verificando todos os colaboradores com nome "Thayn" ou "Caroline" ou "Laila"...');
  const todos = await apiGet('/api/colaboradores');
  if (Array.isArray(todos.body)) {
    const interesse = todos.body.filter(c =>
      /thayn|caroline|laila|ana v/i.test(c.nome_completo || c.nome || '')
    );
    interesse.forEach(c => {
      const nome = c.nome_completo || c.nome;
      const dept = c.departamento;
      console.log(`   - Nome=[${nome}] Dept=[${dept}] Status=[${c.status}]`);
    });
  } else {
    console.log('   Não foi possível listar colaboradores:', todos.status);
  }

  // 4. Verifica departamentos
  console.log('\n4. GET /api/departamentos (busca responsavel do Comercial)');
  const depts = await apiGet('/api/departamentos');
  if (Array.isArray(depts.body)) {
    const com = depts.body.find(d => /comercial/i.test(d.nome));
    console.log('   Departamento Comercial:', JSON.stringify(com));
  }
}

main().catch(console.error);
