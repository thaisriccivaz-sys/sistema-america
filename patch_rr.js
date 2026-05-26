const fs = require('fs');
let code = fs.readFileSync('frontend/resumo_rota.js', 'utf8');

// 1. PBII and PBIII support
code = code.replace(
    "'PIA III E':   { nome: 'PBIII EVENTO',      icon: '🧼' },",
    "'PIA III E':   { nome: 'PBIII EVENTO',      icon: '🧼' },\n    'PBII O':    { nome: 'PBII OBRA',         icon: '🧼' },\n    'PBII E':    { nome: 'PBII EVENTO',       icon: '🧼' },\n    'PBIII O':   { nome: 'PBIII OBRA',        icon: '🧼' },\n    'PBIII E':   { nome: 'PBIII EVENTO',      icon: '🧼' },\n    'PB II O':    { nome: 'PBII OBRA',         icon: '🧼' },\n    'PB II E':    { nome: 'PBII EVENTO',       icon: '🧼' },\n    'PB III O':   { nome: 'PBIII OBRA',        icon: '🧼' },\n    'PB III E':   { nome: 'PBIII EVENTO',      icon: '🧼' },"
);

// 2. MANUTENCAO AVULSA Support
const searchOutros = `    // 4. OUTROS
    const outros = v.os.filter(o => o.tipo === 'OUTROS' || o.tipo === 'AVULSA');
    if (outros.length) {
        outros.forEach(o => lines.push(o.servico.toUpperCase()));
        lines.push('');
    }`;

const replaceOutros = `    // 4. OUTROS E AVULSA
    const avulsas = v.os.filter(o => o.tipo === 'AVULSA');
    if (avulsas.length) {
        const ag = _rrAgruparProdutos(avulsas);
        lines.push('❗ MANUTENCAO AVULSA ' + _rrTipoObraEvento(avulsas) + ':');
        for (const [nome, { qtd, icon }] of Object.entries(ag))
            lines.push('   ' + qtd + ' ' + nome);
        lines.push('');
    }

    const outros = v.os.filter(o => o.tipo === 'OUTROS');
    if (outros.length) {
        outros.forEach(o => lines.push(o.servico.toUpperCase()));
        lines.push('');
    }`;

code = code.replace(searchOutros, replaceOutros);

// 3. Duplicated CARRINHO: if `nome` has a duplicated keyword emoji, we prevent _rrObsIcon from adding it again.
// We can just regex `^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F]` check. Wait, it already has it.
// If os.cliente exported from SimpliRoute HAS '🛒' and os.obs HAS '🛒', they are both literally in the text.
// We can strip emojis from os.obs if we want to avoid duplication, OR we can strip emojis from os.cliente when it is displayed in the obsLinhas!
// Wait, os.cliente in the obs section is printed. If os.cliente ALREADY has `🛒 🔸 🛒 🚨 `, we can just strip emojis from `nome` in `_rrMontarColB` because the client name doesn't need the routing emojis in the Resumo text! The text is for the driver.
const searchObs = `        let nome = (os.cliente || '').trim();
        
        // Se o nome já possui emoji no início, evitamos adicionar ícone duplicado
        if (/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F]/u.test(nome)) {
            icon = ''; 
        }
        
        nome = nome.substring(0, 25).trim();
        obsLinhas.push(\`\${icon ? icon + ' ' : ''}\${nome}: \${os.obs.toUpperCase()}\`);`;

const replaceObs = `        let nome = (os.cliente || '').trim();
        
        // Remove os emojis do nome do cliente para que o texto fique limpo
        nome = nome.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\\s🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘💙💜🟦🟣🔵♿🚿🚽🧼⬜⚪🛤🧊🔸]+/gu, '').trim();
        
        nome = nome.substring(0, 25).trim();
        
        // Remove também do os.obs caso já venha com emojis como 🛒 no início
        let obsLimpa = os.obs.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\uFE0F\\s🛒]+/, '').trim().toUpperCase();
        
        obsLinhas.push(\`\${icon ? icon + ' ' : ''}\${nome}: \${obsLimpa}\`);`;

code = code.replace(searchObs, replaceObs);

fs.writeFileSync('frontend/resumo_rota.js', code);
console.log('PATCH RR DONE');
