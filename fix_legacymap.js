const fs = require('fs');
let code = fs.readFileSync('frontend/app.js', 'utf8');

// FIX 1: LEGACY_MAP do prontuario (linha ~11133)
// Desistencia de VT: incluir 'vc' tambem; adicionar Combustivel com checagem de historico
const old1 =                 { nome: 'Desist\\u00EAncia de Vale-Transporte', cond: (c.meio_transporte || '').toLowerCase().includes('outros') },

                { nome: 'Responsabilidade Ve;

const new1 =                 { nome: 'Desist\\u00EAncia de Vale-Transporte', cond: (c.meio_transporte || '').toLowerCase().includes('outros') || (c.meio_transporte || '').toLowerCase().includes('vc') },
                { nome: 'Desist\\u00EAncia de Aux\\u00EDlio-Combust\\u00EDvel', cond: ((c.meio_transporte || '').toLowerCase().includes('outros') || (c.meio_transporte || '').toLowerCase().includes('vt')) && Array.isArray(window.currentDocs) && window.currentDocs.some(function(d){ return (d.tab_name === 'CONTRATOS_AVULSOS' || d.tab_name === 'CONTRATOS') && (d.document_type || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim() === 'acordo de auxilio-combustivel'; }) },

                { nome: 'Responsabilidade Ve;

if (code.includes(old1)) {
    code = code.replace(old1, new1);
    console.log('FIX 1 OK (prontuario LEGACY_MAP)');
} else {
    console.log('FIX 1 FALHOU - alvo nao encontrado');
}

// FIX 2: LEGACY_MAP da admissao (linha ~13343)
const old2 =                 { nome: 'Desist\\u00EAncia de Vale-Transporte', cond: (c.meio_transporte || '').toLowerCase().includes('outros') },

                    { nome: 'Responsabilidade Ve;

const new2 =                 { nome: 'Desist\\u00EAncia de Vale-Transporte', cond: (c.meio_transporte || '').toLowerCase().includes('outros') || (c.meio_transporte || '').toLowerCase().includes('vc') },
                { nome: 'Desist\\u00EAncia de Aux\\u00EDlio-Combust\\u00EDvel', cond: ((c.meio_transporte || '').toLowerCase().includes('outros') || (c.meio_transporte || '').toLowerCase().includes('vt')) && Array.isArray(window.currentDocs) && window.currentDocs.some(function(d){ return (d.tab_name === 'CONTRATOS_AVULSOS' || d.tab_name === 'CONTRATOS') && (d.document_type || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim() === 'acordo de auxilio-combustivel'; }) },

                    { nome: 'Responsabilidade Ve;

if (code.includes(old2)) {
    code = code.replace(old2, new2);
    console.log('FIX 2 OK (admissao LEGACY_MAP)');
} else {
    console.log('FIX 2 FALHOU - alvo nao encontrado');
}

fs.writeFileSync('frontend/app.js', code, 'utf8');
console.log('Arquivo salvo.');
