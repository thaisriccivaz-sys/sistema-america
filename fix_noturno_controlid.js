/**
 * fix_noturno_controlid.js
 * Adiciona calculo de minutosNoturnos em processarApuracao (controlid.js)
 */
const fs = require('fs');
let code = fs.readFileSync('backend/routes/controlid.js', 'utf8');
const orig = code.length;

// 1. No loop do Array.isArray(data), após calcular diasTrabalhados, adicionar soma de minutosNoturnos
const oldArrayBlock = `        diasTrabalhados = diasComPresenca.length; // VT: todos os dias com presença`;
const newArrayBlock = `        diasTrabalhados = diasComPresenca.length; // VT: todos os dias com presença
        // Somar minutos noturnos de todos os dias (campo RHID: horasNoturnasNaoExtra + extraNoturna)
        minutosNoturnos = data.reduce(function(acc, d) {
            return acc + (parseInt(d.horasNoturnasNaoExtra) || 0) + (parseInt(d.extraNoturna) || 0);
        }, 0);`;

if (code.indexOf(oldArrayBlock) !== -1) {
    code = code.replace(oldArrayBlock, newArrayBlock);
    console.log('✅ minutosNoturnos no array loop');
} else {
    console.log('❌ âncora array loop não encontrada');
}

// 2. Declarar minutosNoturnos = 0 junto das outras variáveis
const oldVarDecl = `    let diasComHoraExtra = null; // Dias com ≥3h extra (janta)`;
const newVarDecl = `    let diasComHoraExtra = null; // Dias com ≥3h extra (janta)
    let minutosNoturnos  = 0;   // Total de minutos em horário noturno (22h-5h) no mês`;

if (code.indexOf(oldVarDecl) !== -1) {
    code = code.replace(oldVarDecl, newVarDecl);
    console.log('✅ variável minutosNoturnos declarada');
} else {
    // CRLF variant
    const oldVarDeclCRLF = oldVarDecl.replace(/\n/g, '\r\n');
    if (code.indexOf(oldVarDeclCRLF) !== -1) {
        code = code.replace(oldVarDeclCRLF, newVarDecl);
        console.log('✅ variável minutosNoturnos declarada (CRLF)');
    } else {
        console.log('❌ âncora variável não encontrada');
    }
}

// 3. Adicionar minutosNoturnos ao return final
const oldReturn = `    return {\r\n        diasUteis: diasUteisTotal,\r\n        diasTrabalhados,\r\n        diasVR,\r\n        faltas,\r\n        diasComHoraExtra,\r\n        aviso:`;
const newReturn = `    return {\r\n        diasUteis: diasUteisTotal,\r\n        diasTrabalhados,\r\n        diasVR,\r\n        faltas,\r\n        diasComHoraExtra,\r\n        minutosNoturnos,\r\n        aviso:`;

if (code.indexOf(oldReturn) !== -1) {
    code = code.replace(oldReturn, newReturn);
    console.log('✅ minutosNoturnos adicionado ao return');
} else {
    const oldReturnLF = oldReturn.replace(/\r\n/g, '\n');
    const newReturnLF = newReturn.replace(/\r\n/g, '\n');
    if (code.indexOf(oldReturnLF) !== -1) {
        code = code.replace(oldReturnLF, newReturnLF);
        console.log('✅ minutosNoturnos adicionado ao return (LF)');
    } else {
        console.log('❌ âncora return não encontrada');
    }
}

fs.writeFileSync('backend/routes/controlid.js', code, 'utf8');
console.log('controlid.js salvo, tamanho:', code.length, '(era:', orig, ')');
