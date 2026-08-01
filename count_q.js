const fs = require('fs');
const path = require('path');

const fileContent = fs.readFileSync(path.join(__dirname, 'frontend/avaliacoes_perguntas.js'), 'utf8');
const fakeWindow = {};
eval(fileContent.replace('window.AVALIACAO_QUESTIONS', 'fakeWindow.AVALIACAO_QUESTIONS'));

const sq = fakeWindow.AVALIACAO_QUESTIONS.satisfacao;
console.log("Motorista categories:", Object.keys(sq.motorista).length, "Total Q:", Object.values(sq.motorista).reduce((acc, val) => acc + val.length, 0));
console.log("Manutencao categories:", Object.keys(sq.manutencao).length, "Total Q:", Object.values(sq.manutencao).reduce((acc, val) => acc + val.length, 0));
console.log("Escritorio categories:", Object.keys(sq.escritorio).length, "Total Q:", Object.values(sq.escritorio).reduce((acc, val) => acc + val.length, 0));
