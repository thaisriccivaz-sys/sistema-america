const http = require('http');

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const opt = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    const req = http.request(opt, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  try {
    // 1. Get Token
    console.log('Logging in...');
    const loginRes = await request('GET', '/api/auth/auto-login');
    console.log('Login Response:', loginRes.statusCode, loginRes.body);
    const loginData = JSON.parse(loginRes.body);
    const token = loginData.token;

    // 2. Post Address
    console.log('Posting address...');
    const payload = {
      sequencia: 1,
      nome_local: 'MANUTENÇÃO TESTE',
      cpf_cnpj: '000010001001',
      inscricao_estadual: '',
      cep: '03490-000',
      endereco: 'Avenida Aricanduva',
      numero: '3064',
      complemento: '',
      bairro: 'Vila Califórnia',
      uf: 'SP',
      municipio: 'São Paulo',
      coordenadas: '-23.544144, -46.529596',
      contato: '',
      telefone: '',
      ramal: ''
    };
    
    const postRes = await request(
      'POST',
      '/api/clientes/1/enderecos',
      payload,
      { 'Authorization': `Bearer ${token}` }
    );
    console.log('POST Response:', postRes.statusCode, postRes.body);
  } catch (e) {
    console.error(e);
  }
}

main();
