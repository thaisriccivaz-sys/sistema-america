const fs = require('fs');
let code = fs.readFileSync('frontend/fechamento.js', 'utf8');

// O problema: o arquivo tem \" dentro de template literals (backtick strings)
// Isso é inválido em JavaScript - dentro de template literals, " não precisa de escape
// Precisamos: dentro de cada template literal, substituir \" por "

// Estratégia: processar o arquivo char por char, identificar template literals
// e dentro deles converter \" para "

let result = '';
let i = 0;
let inTemplateLiteral = false;
let templateDepth = 0;
let inExpression = 0; // contador de ${} dentro do template

while (i < code.length) {
    const ch = code[i];
    const ch2 = code.substring(i, i+2);

    if (!inTemplateLiteral) {
        if (ch === '`') {
            inTemplateLiteral = true;
            inExpression = 0;
            result += ch;
            i++;
        } else {
            result += ch;
            i++;
        }
    } else {
        // Dentro do template literal
        if (ch2 === '${') {
            inExpression++;
            result += ch2;
            i += 2;
        } else if (inExpression > 0 && ch === '}') {
            inExpression--;
            result += ch;
            i++;
        } else if (ch === '`' && inExpression === 0) {
            // Fim do template literal
            inTemplateLiteral = false;
            result += ch;
            i++;
        } else if (ch2 === '\\"' && inExpression === 0) {
            // \" dentro do template literal (fora de ${}): converter para "
            result += '"';
            i += 2;
        } else {
            result += ch;
            i++;
        }
    }
}

fs.writeFileSync('frontend/fechamento.js', result, 'utf8');
console.log('✅ Template literals corrigidos, tamanho:', result.length);
