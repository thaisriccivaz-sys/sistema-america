const fetch = require('node-fetch');
async function test() {
  const loginRes = await fetch('https://sistema-america.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ana.vitoria', password: '123' }) // Assuming default or we need to login as admin
  });
  console.log(await loginRes.text());
}
test();
