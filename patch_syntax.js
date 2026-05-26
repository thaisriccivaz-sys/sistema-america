const fs = require('fs');
let code = fs.readFileSync('frontend/resumo_rota.js', 'utf8');

code = code.replace(
    /let obsLimpa = os\.obs\.replace\(\/\^\[\\u\{1F000\}-\\u\{1FFFF\}\\u\{2600\}-\\u\{26FF\}\\u\{2700\}-\\u\{27BF\}\\uFE0F\\s🛒\]\+\/, ''\)\.trim\(\)\.toUpperCase\(\);/g,
    `let obsLimpa = os.obs.replace(/^[\\u{1F000}-\\u{1FFFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\uFE0F\\s🛒]+/gu, '').trim().toUpperCase();`
);

fs.writeFileSync('frontend/resumo_rota.js', code);
console.log('Fixed syntax error');
