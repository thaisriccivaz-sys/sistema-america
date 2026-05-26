const baseUrl = 'https://sistema-america.onrender.com';

async function run() {
    try {
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: 'teste.2', senha: '123' })
        });
        const loginData = await loginRes.json();
        if (!loginData.token) throw new Error('Login failed: ' + JSON.stringify(loginData));
        
        const catRes = await fetch(`${baseUrl}/api/frota/catalogo`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const catData = await catRes.json();
        console.log('Catalogo length:', catData.length);
        console.log('Sample:', catData.slice(0, 5));
        
        const counts = {};
        catData.forEach(c => {
            counts[c.nome] = (counts[c.nome] || 0) + 1;
        });
        const dups = Object.entries(counts).filter(([n, c]) => c > 1);
        console.log('Duplicates:', dups);
    } catch(e) {
        console.error(e);
    }
}
run();
