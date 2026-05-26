const fs = require('fs');
let code = fs.readFileSync('frontend/resumo_rota.js', 'utf8');

const regexObs = /let nome = \(os\.cliente \|\| ''\)\.trim\(\);\s*\/\/ Se o nome já possui emoji no início, evitamos adicionar ícone duplicado\s*if \(\/\^\[\\u\{1F000\}-\\u\{1FFFF\}\\u\{2600\}-\\u\{26FF\}\\u\{2700\}-\\u\{27BF\}\\uFE0F\]\/u\.test\(nome\)\) \{\s*icon = '';\s*\}\s*nome = nome\.substring\(0, 25\)\.trim\(\);\s*obsLinhas\.push\(`\$\{icon \? icon \+ ' ' : ''\}\$\{nome\}: \$\{os\.obs\.toUpperCase\(\)\}`\);/;

const replaceObs = `        let nome = (os.cliente || '').trim();
        
        // Remove os emojis do nome do cliente para que o texto fique limpo
        nome = nome.replace(/^[\\u{1F000}-\\u{1FFFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\uFE0F\\s🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘💙💜🟦🟣🔵♿🚿🚽🧼⬜⚪🛤🧊🔸]+/gu, '').trim();
        
        nome = nome.substring(0, 25).trim();
        
        // Remove também do os.obs caso já venha com emojis como 🛒 no início
        let obsLimpa = os.obs.replace(/^[\\u{1F000}-\\u{1FFFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\uFE0F\\s🛒]+/, '').trim().toUpperCase();
        
        obsLinhas.push(\`\${icon ? icon + ' ' : ''}\${nome}: \${obsLimpa}\`);`;

if (regexObs.test(code)) {
    code = code.replace(regexObs, replaceObs);
    fs.writeFileSync('frontend/resumo_rota.js', code);
    console.log('PATCH RR CARRINHO OK');
} else {
    console.log('REGEX CARRINHO FAIL');
}
