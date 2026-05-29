/**
 * Patch Frontend: Melhorias no Formulário Público de Avaliação de Experiência
 * 1. Botão "Salvar Progresso" no formulário público
 * 2. Botão "Finalizar" desabilitado até tudo preenchido + resultado selecionado
 * 3. Validação de situacao_avaliacao no submit
 * 4. Função salvarPublicRascunho(token)
 */
const fs = require('fs');
const path = require('path');

const jsFile = path.join(__dirname, 'frontend', 'experiencia.js');
const raw = fs.readFileSync(jsFile, 'utf8');
const lines = raw.split('\n');

console.log('Total lines:', lines.length);

function findLine(keyword, startFrom = 0) {
    for (let i = startFrom; i < lines.length; i++) {
        if (lines[i].includes(keyword)) return i;
    }
    return -1;
}

// ============================================================
// CHANGE 1: Modificar a seção de botões do formulário público
// Adicionar botão "Salvar Progresso" + tornar botão submit dinâmico
// ============================================================
// Localizar o bloco de botões do formulário público
const btnSubmitIdx = findLine('Enviar Avaliação Final', 1260);
if (btnSubmitIdx === -1) { console.error('ERRO 1: Botão Enviar Avaliação Final não encontrado'); process.exit(1); }
console.log('C1: Botão submit na linha', btnSubmitIdx + 1);

// Ver o bloco ao redor
console.log('Linhas ao redor do botão:');
for (let i = btnSubmitIdx - 4; i <= btnSubmitIdx + 4; i++) {
    console.log(`L${i+1}:`, lines[i] ? lines[i].substring(0, 100) : '');
}

// Encontrar o div que contém o botão de submit
const divBtnIdx = findLine('padding-top:1rem; border-top:1px solid', btnSubmitIdx - 5);
console.log('C1b: div botão na linha', divBtnIdx + 1);

// Substituir o bloco de botões (3 linhas) por nova versão com dois botões
const oldBtnLines = 4; // div + button type=submit + /div e fechamento
// Localizar onde começa e termina o bloco
let btnBlockStart = divBtnIdx;
let btnBlockEnd = findLine('</div>', btnBlockStart) + 1;
// Should be the closing </div> of the button div
console.log('Bloco de botões de', btnBlockStart+1, 'a', btnBlockEnd+1);

// Construir novo bloco de botões
const indentBtn = lines[divBtnIdx].match(/^(\s*)/)[1];
const newBtnBlock = [
    indentBtn + `<div style="padding-top:1rem; border-top:1px solid #e2e8f0; display:flex; gap:1rem; justify-content:flex-end; flex-wrap:wrap;">`,
    indentBtn + `    <button type="button" id="btn-salvar-progresso" onclick="window.salvarPublicRascunho(_publicExpToken)" style="padding:10px 20px; font-size:0.95rem; font-weight:600; background:#f8fafc; color:#475569; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">`,
    indentBtn + `        💾 Salvar Progresso`,
    indentBtn + `    </button>`,
    indentBtn + `    <button type="submit" id="btn-finalizar-avaliacao" class="btn btn-primary" disabled style="padding:12px 24px; font-size:1.05rem; font-weight:600; background:#94a3b8; color:#fff; border:none; border-radius:8px; cursor:not-allowed; display:inline-flex; align-items:center; gap:6px;" title="Preencha todas as notas e selecione Aprovado/Reprovado para finalizar">`,
    indentBtn + `        ✅ Finalizar Avaliação`,
    indentBtn + `    </button>`,
    indentBtn + `</div>`,
];

// Count lines to replace (from btnBlockStart to the line after the </div>)
// Original block is 3 lines: the div opening, button, and closing div
const linesToReplace = btnBlockEnd - btnBlockStart + 1;
console.log('Substituindo', linesToReplace, 'linhas por', newBtnBlock.length, 'linhas');
lines.splice(btnBlockStart, linesToReplace, ...newBtnBlock);
console.log('C1: Botões substituídos');

// ============================================================
// CHANGE 2: Adicionar lógica de inicialização após renderização
// Armazenar token e adicionar event listeners para enable/disable
// ============================================================
// Encontrar onde o form é inserido no DOM e setTimeout para calcPublicExpScore
const setTimeoutCalcIdx = findLine("setTimeout(window.calcPublicExpScore, 100)", 1280);
if (setTimeoutCalcIdx === -1) { console.error('ERRO 2: setTimeout não encontrado'); process.exit(1); }
console.log('C2: setTimeout na linha', setTimeoutCalcIdx + 1);

const indentTimeout = lines[setTimeoutCalcIdx].match(/^(\s*)/)[1];
const newInitBlock = [
    // Store token globally so the save button can use it
    indentTimeout + `// Guardar token para uso no botão Salvar Progresso`,
    indentTimeout + `window._publicExpToken = token;`,
    indentTimeout + `window._publicExpTotalItens = totalItens;`,
    indentTimeout + `// Calcular pontuação inicial`,
    lines[setTimeoutCalcIdx].trim() === '' ? '' : lines[setTimeoutCalcIdx],
    indentTimeout + `// Ativar verificação dinâmica do botão Finalizar`,
    indentTimeout + `setTimeout(window.verificarBotaoFinalizar, 200);`,
];
lines.splice(setTimeoutCalcIdx, 1, ...newInitBlock);
console.log('C2: Inicialização com token e verificação adicionadas');

// ============================================================
// CHANGE 3: Validação no submitPublicExpForm — verificar situacao_avaliacao
// ============================================================
const submitFnIdx = findLine("window.submitPublicExpForm = async function(e, token)");
if (submitFnIdx === -1) { console.error('ERRO 3: submitPublicExpForm não encontrado'); process.exit(1); }
console.log('C3: submitPublicExpForm na linha', submitFnIdx + 1);

// Encontrar onde verificar notas (já existe) — depois adicionar verificação de situacao_avaliacao
const verificarNotasIdx = findLine("Swal.fire('Atenção', 'Por favor, avalie", submitFnIdx);
if (verificarNotasIdx === -1) { console.error('ERRO 3b: validação de notas não encontrada'); process.exit(1); }
console.log('C3b: validação notas na linha', verificarNotasIdx + 1);
// Encontrar o próximo "return;" após o Swal.fire
const returnIdx = findLine("return; ", verificarNotasIdx, verificarNotasIdx + 3);
console.log('C3c: return na linha', returnIdx + 1);

// Inserir validação de situacao_avaliacao APÓS o bloco de validação de notas
const afterNotasIdx = returnIdx + 2; // após o "}" que fecha o if
const indentSubmit = lines[verificarNotasIdx].match(/^(\s*)/)[1];
const situacaoValidation = [
    '',
    indentSubmit + `// Verificar se Aprovado/Reprovado foi selecionado`,
    indentSubmit + `const situacaoSelectEl = frm.querySelector('[name="situacao_avaliacao"]');`,
    indentSubmit + `if (!situacaoSelectEl || !situacaoSelectEl.value) {`,
    indentSubmit + `    Swal.fire('Atenção', 'Selecione se o colaborador foi Aprovado ou Reprovado antes de finalizar a avaliação.', 'warning');`,
    indentSubmit + `    return;`,
    indentSubmit + `}`,
    '',
];
lines.splice(afterNotasIdx, 0, ...situacaoValidation);
console.log('C3: Validação de situacao_avaliacao adicionada');

// ============================================================
// CHANGE 4: Adicionar funções novas no final do arquivo
// - salvarPublicRascunho(token)
// - verificarBotaoFinalizar() — habilita/desabilita o botão Finalizar
// - selecionarPublicNotaExp atualizada (já existe, adicionar chamada para verificar)
// ============================================================

// Localizar o final do arquivo (antes do último }) ou no final
const lastLine = lines.length - 1;

const novasFuncoes = [
    '',
    '// ---- SALVAR RASCUNHO PÚBLICO ----',
    'window.salvarPublicRascunho = async function(token) {',
    '    if (!token) { Swal.fire("Erro", "Token inválido.", "error"); return; }',
    '    const frm = document.getElementById("public-exp-form-element");',
    '    if (!frm) return;',
    '',
    '    // Coletar respostas atuais',
    '    const respostas = {};',
    '    const inputs = frm.querySelectorAll("input[name^=\\"nota_\\"], input[name^=\\"obs_\\"]");',
    '    inputs.forEach(inp => { respostas[inp.name] = inp.value; });',
    '    const pontuacao = parseFloat(document.getElementById("public-exp-pontuacao-val")?.value || 0);',
    '    const situacaoEl = frm.querySelector("[name=\\"situacao_avaliacao\\"]");',
    '    const comentariosEl = frm.querySelector("[name=\\"comentarios\\"]");',
    '',
    '    const payload = {',
    '        respostas,',
    '        pontuacao,',
    '        situacao_avaliacao: situacaoEl ? situacaoEl.value : "",',
    '        comentarios: comentariosEl ? comentariosEl.value : ""',
    '    };',
    '',
    '    const btn = document.getElementById("btn-salvar-progresso");',
    '    const originalText = btn ? btn.innerHTML : "";',
    '    if (btn) { btn.innerHTML = "⏳ Salvando..."; btn.disabled = true; }',
    '',
    '    try {',
    '        const resp = await fetch(`/api/experiencia/publico/rascunho?token=${token}`, {',
    '            method: "POST",',
    '            headers: { "Content-Type": "application/json" },',
    '            body: JSON.stringify(payload)',
    '        });',
    '        const data = await resp.json();',
    '        if (!resp.ok) throw new Error(data.error || "Erro ao salvar");',
    '        Swal.fire({',
    '            icon: "success",',
    '            title: "Progresso Salvo!",',
    '            text: "Suas respostas foram salvas. Você pode continuar preenchendo depois pelo mesmo link recebido por e-mail.",',
    '            confirmButtonText: "OK"',
    '        });',
    '    } catch(e) {',
    '        Swal.fire("Erro", e.message, "error");',
    '    } finally {',
    '        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }',
    '    }',
    '};',
    '',
    '// ---- VERIFICAÇÃO DINÂMICA DO BOTÃO FINALIZAR ----',
    'window.verificarBotaoFinalizar = function() {',
    '    const frm = document.getElementById("public-exp-form-element");',
    '    const btn = document.getElementById("btn-finalizar-avaliacao");',
    '    if (!frm || !btn) return;',
    '',
    '    const inputs = frm.querySelectorAll("input[name^=\\"nota_\\"]");',
    '    const todasNotasPreenchidas = Array.from(inputs).every(inp => inp.value && inp.value !== "0");',
    '',
    '    const situacaoEl = frm.querySelector("[name=\\"situacao_avaliacao\\"]");',
    '    const resultadoSelecionado = situacaoEl && situacaoEl.value !== "";',
    '',
    '    const podeSubmit = todasNotasPreenchidas && resultadoSelecionado;',
    '',
    '    btn.disabled = !podeSubmit;',
    '    btn.style.background = podeSubmit ? "#16a34a" : "#94a3b8";',
    '    btn.style.cursor = podeSubmit ? "pointer" : "not-allowed";',
    '    btn.title = podeSubmit ? "" : "Preencha todas as notas e selecione Aprovado/Reprovado para finalizar";',
    '',
    '    // Adicionar listener no select de resultado (só uma vez)',
    '    if (situacaoEl && !situacaoEl._listenerAdicionado) {',
    '        situacaoEl.addEventListener("change", window.verificarBotaoFinalizar);',
    '        situacaoEl._listenerAdicionado = true;',
    '    }',
    '};',
];

lines.push(...novasFuncoes);
console.log('C4: Funções novas adicionadas');

// Modificar selecionarPublicNotaExp para chamar verificarBotaoFinalizar
const selecionarPublicIdx = findLine('window.selecionarPublicNotaExp = function');
if (selecionarPublicIdx !== -1) {
    const calcCallIdx = findLine('window.calcPublicExpScore()', selecionarPublicIdx);
    if (calcCallIdx !== -1) {
        const indentCalc = lines[calcCallIdx].match(/^(\s*)/)[1];
        lines.splice(calcCallIdx + 1, 0, indentCalc + 'window.verificarBotaoFinalizar();');
        console.log('C4b: verificarBotaoFinalizar adicionado após calcPublicExpScore');
    }
}

// Salvar arquivo
const result = lines.join('\n');
fs.writeFileSync(jsFile, result, 'utf8');

// Verificar
const verify = fs.readFileSync(jsFile, 'utf8');
const checks = [
    verify.includes('btn-salvar-progresso'),
    verify.includes('btn-finalizar-avaliacao'),
    verify.includes('salvarPublicRascunho'),
    verify.includes('verificarBotaoFinalizar'),
    verify.includes('Selecione se o colaborador foi Aprovado ou Reprovado'),
    verify.includes('_publicExpToken'),
];
console.log('\n✅ Verificações:');
checks.forEach((ok, i) => console.log(`  ${ok ? '✅' : '❌'} Check ${i+1}`));
if (checks.every(Boolean)) {
    console.log('\n🎉 SUCESSO! Todas as mudanças do frontend aplicadas.');
} else {
    console.error('\n❌ Algumas verificações falharam!');
    process.exit(1);
}
