const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function test() {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: 1, role: 'admin' }, 'america_rental_secret_key_123', { expiresIn: '8h' });

    fs.writeFileSync('backend/temp_test.pdf', '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');

    const form = new FormData();
    form.append('arquivo', fs.createReadStream('backend/temp_test.pdf'));

    console.log("Token:", token);
    console.log("Sending...");
    
    const res = await fetch('https://sistema-america.onrender.com/api/extrair-bo', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            ...form.getHeaders()
        },
        body: form
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
}

test().catch(console.error);
