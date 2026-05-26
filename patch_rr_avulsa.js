const fs = require('fs');
let code = fs.readFileSync('frontend/resumo_rota.js', 'utf8');

const regexOutros = /\/\/ 4\. OUTROS\s+const outros = v\.os\.filter\(o => o\.tipo === 'OUTROS' \|\| o\.tipo === 'AVULSA'\);\s+if \(outros\.length\) \{\s+outros\.forEach\(o => lines\.push\(o\.servico\.toUpperCase\(\)\)\);\s+lines\.push\(''\);\s+\}/;

const replaceOutros = `    // 4. OUTROS E AVULSA
    const avulsas = v.os.filter(o => o.tipo === 'AVULSA');
    if (avulsas.length) {
        const ag = _rrAgruparProdutos(avulsas);
        lines.push('❗ MANUTENCAO AVULSA ' + _rrTipoObraEvento(avulsas) + ':');
        for (const [nome, { qtd, icon }] of Object.entries(ag))
            lines.push('   ' + qtd + ' × ' + nome);
        lines.push('');
    }

    const outros = v.os.filter(o => o.tipo === 'OUTROS');
    if (outros.length) {
        outros.forEach(o => lines.push(o.servico.toUpperCase()));
        lines.push('');
    }`;

if (regexOutros.test(code)) {
    code = code.replace(regexOutros, replaceOutros);
    fs.writeFileSync('frontend/resumo_rota.js', code);
    console.log('PATCH RR AVULSA OK');
} else {
    console.log('REGEX AVULSA FAIL');
}
