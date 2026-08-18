const fs = require('fs');
let c = fs.readFileSync('backend/routes_candidatos_teste.js', 'utf8');

if (!c.includes('resultado_teste TEXT')) {
    c = c.replace(/'retornou_teste_extra INTEGER DEFAULT 0'/g, "'retornou_teste_extra INTEGER DEFAULT 0',\n        'resultado_teste TEXT'");
    c = c.replace(/UPDATE candidatos_teste SET status = 'Dias de Teste' WHERE status IN \('Teste 1\\u00ba Dia', 'Teste 2\\u00ba Dia', 'Teste Extra'\);/g, 
        "UPDATE candidatos_teste SET status = 'Dias de Teste' WHERE status IN ('Teste 1\\u00ba Dia', 'Teste 2\\u00ba Dia', 'Teste Extra');\n    db.run(\"UPDATE candidatos_teste SET resultado_teste = status, status = 'Teste Finalizado' WHERE status IN ('Aprovado', 'Reprovado');\");");
}

fs.writeFileSync('backend/routes_candidatos_teste.js', c, 'utf8');
console.log('Backend migration applied.');
