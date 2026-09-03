const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

app.put('/api/departamentos/:id', (req, res) => {
    console.log('PUT received:', req.params.id, req.body);
    res.json({ message: 'OK' });
});

// simulate the fetch
const reqBody = { nome: 'Ajudante Geral', tipo: 'Operacional', responsavel_id: '10', responsavel_nome: 'Wagner', nome_aso: null };
fetch('http://localhost:3000/api/departamentos/79709', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody)
}).then(r => r.json()).then(console.log).catch(console.error);

app.listen(3000, () => {
    console.log('Test server running');
});
