/**
 * Patch: Melhorias no Formulário de Avaliação de Experiência
 * 1. gerarEmailExperienciaHTML — adicionar temRascunho
 * 2. Nova rota POST /api/experiencia/publico/rascunho
 * 3. verificarExperienciasVencendo — envio diário
 * 4. Envio manual — passar temRascunho quando iniciado
 */
const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'backend', 'server.js');
const raw = fs.readFileSync(serverFile, 'utf8');
const lines = raw.split('\n');

let applied = 0;

function findLine(keyword, startFrom = 0, endAt = lines.length) {
    for (let i = startFrom; i < endAt; i++) {
        if (lines[i].includes(keyword)) return i;
    }
    return -1;
}

console.log('Total lines:', lines.length);

// ============================================================
// CHANGE 1: gerarEmailExperienciaHTML — adicionar temRascunho
// ============================================================
const emailFnIdx = findLine("function gerarEmailExperienciaHTML({ respNome, nomeCompleto, cargo, prazos, diasRestantes, formLink, tipo })");
if (emailFnIdx === -1) { console.error('ERRO 1: gerarEmailExperienciaHTML não encontrado'); process.exit(1); }
console.log('C1: gerarEmailExperienciaHTML na linha', emailFnIdx + 1);

// Atualiza a assinatura da função
lines[emailFnIdx] = lines[emailFnIdx].replace(
    "function gerarEmailExperienciaHTML({ respNome, nomeCompleto, cargo, prazos, diasRestantes, formLink, tipo })",
    "function gerarEmailExperienciaHTML({ respNome, nomeCompleto, cargo, prazos, diasRestantes, formLink, tipo, temRascunho = false })"
);

// Encontrar o trecho "<!-- AVISO AMARELO -->" para adicionar o banner antes e mudar o texto
const avisoAmarelIdx = findLine('<!-- AVISO AMARELO -->', emailFnIdx, emailFnIdx + 120);
if (avisoAmarelIdx === -1) { console.error('ERRO 1b: AVISO AMARELO não encontrado'); process.exit(1); }
console.log('C1b: AVISO AMARELO na linha', avisoAmarelIdx + 1);

// Inserir banner de rascunho ANTES do aviso amarelo existente
const bannerRascunho = [
    '',
    '          <!-- BANNER RASCUNHO (só aparece se já foi iniciado) -->',
    "          \${temRascunho ? `",
    "          <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fef3c7;border:2px solid #f59e0b;border-radius:10px;margin-bottom:16px;\">",
    "            <tr><td style=\"padding:16px 20px;text-align:center;\">",
    "              <p style=\"margin:0 0 4px;color:#78350f;font-weight:800;font-size:1rem;\">⏳ Formulário Iniciado e Pendente de Finalização</p>",
    "              <p style=\"margin:0;color:#92400e;font-size:0.88rem;\">Este formulário foi parcialmente preenchido. Clique no botão abaixo para continuar de onde parou e finalizá-lo.</p>",
    "            </td></tr>",
    "          </table>",
    "          ` : ''}",
    '',
];
lines.splice(avisoAmarelIdx, 0, ...bannerRascunho);
applied++;
console.log('C1: Banner rascunho inserido');

// ============================================================
// CHANGE 2: Nova rota POST /api/experiencia/publico/rascunho
// ============================================================
// Inserir DEPOIS de POST /api/experiencia/publico/submit
// Localizar o "});" que fecha essa rota
const submitRouteIdx = findLine("app.post('/api/experiencia/publico/submit'", emailFnIdx + 50);
if (submitRouteIdx === -1) { console.error('ERRO 2: rota publico/submit não encontrada'); process.exit(1); }
console.log('C2: publico/submit na linha', submitRouteIdx + 1);

// Encontrar o fechamento da rota (linha que tem apenas "});")
let submitEndIdx = submitRouteIdx + 1;
let braceDepth = 0;
for (let i = submitRouteIdx; i < submitRouteIdx + 80; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.includes('{')) braceDepth += (trimmed.match(/\{/g) || []).length;
    if (trimmed.includes('}')) braceDepth -= (trimmed.match(/\}/g) || []).length;
    if (braceDepth <= 0 && i > submitRouteIdx) { submitEndIdx = i; break; }
}
console.log('C2: Submit route termina na linha', submitEndIdx + 1);

const novaRotaRascunho = [
    '',
    "// POST /api/experiencia/publico/rascunho — Salva respostas parciais (sem finalizar)",
    "app.post('/api/experiencia/publico/rascunho', (req, res) => {",
    "    try {",
    "        const payload = jwt.verify(req.query.token, SECRET_KEY);",
    "        const { respostas, pontuacao, situacao_avaliacao, comentarios } = req.body;",
    "        db.get(`SELECT c.*, (SELECT nome_completo FROM colaboradores WHERE id = d.responsavel_id) as responsavel_nome FROM colaboradores c LEFT JOIN departamentos d ON LOWER(TRIM(d.nome)) = LOWER(TRIM(c.departamento)) WHERE c.id = ?`, [payload.colab_id], (err, colab) => {",
    "            if (err || !colab) return res.status(404).json({ error: 'Colaborador não encontrado.' });",
    "            db.get(`SELECT id, situacao FROM experiencia_formularios WHERE colaborador_id = ? ORDER BY criado_em DESC LIMIT 1`, [colab.id], (err2, exist) => {",
    "                if (exist) {",
    "                    if (exist.situacao === 'finalizado') return res.status(400).json({ error: 'O formulário já foi finalizado.' });",
    "                    db.run(`UPDATE experiencia_formularios SET respostas = ?, pontuacao = ?, situacao_avaliacao = ?, comentarios = ?, responsavel_nome = ?, situacao = 'iniciado', atualizado_em = datetime('now') WHERE id = ?`,",
    "                        [JSON.stringify(respostas), pontuacao || 0, situacao_avaliacao || '', comentarios || '', colab.responsavel_nome, exist.id], (err3) => {",
    "                            if (err3) return res.status(500).json({ error: err3.message });",
    "                            res.json({ ok: true, message: 'Progresso salvo com sucesso.' });",
    "                        });",
    "                } else {",
    "                    db.run(`INSERT INTO experiencia_formularios (colaborador_id, responsavel_nome, respostas, pontuacao, situacao_avaliacao, comentarios, situacao) VALUES (?, ?, ?, ?, ?, ?, 'iniciado')`,",
    "                        [colab.id, colab.responsavel_nome, JSON.stringify(respostas), pontuacao || 0, situacao_avaliacao || '', comentarios || ''], function(err3) {",
    "                            if (err3) return res.status(500).json({ error: err3.message });",
    "                            res.json({ ok: true, form_id: this.lastID, message: 'Progresso salvo com sucesso.' });",
    "                        });",
    "                }",
    "            });",
    "        });",
    "    } catch (e) {",
    "        res.status(400).json({ error: 'Token inválido ou expirado.' });",
    "    }",
    "});",
];
lines.splice(submitEndIdx + 1, 0, ...novaRotaRascunho);
applied++;
console.log('C2: Nova rota rascunho inserida');

// ============================================================
// CHANGE 3: verificarExperienciasVencendo — envio diário
// ============================================================
// Localizar a linha com "deveEnviar15d"
const deveEnviar15dIdx = findLine('const deveEnviar15d =', 10000);
if (deveEnviar15dIdx === -1) { console.error('ERRO 3: deveEnviar15d não encontrado'); process.exit(1); }
console.log('C3: deveEnviar15d na linha', deveEnviar15dIdx + 1);

// Verificar as 4 linhas que precisam ser substituídas
console.log('C3 linhas:', JSON.stringify(lines[deveEnviar15dIdx].substring(0, 80)));
console.log('C3+1:     ', JSON.stringify(lines[deveEnviar15dIdx+1].substring(0, 80)));
console.log('C3+2:     ', JSON.stringify(lines[deveEnviar15dIdx+2].substring(0, 80)));
console.log('C3+3:     ', JSON.stringify(lines[deveEnviar15dIdx+3].substring(0, 80)));
console.log('C3+4:     ', JSON.stringify(lines[deveEnviar15dIdx+4].substring(0, 80)));

// Substituir as 5 linhas (deveEnviar15d, deveEnviar7d, if (!deveEnviar15d && !deveEnviar7d) {, console.log, continue)
// Por: envio diário sem restrição
const oldBlock = 5; // remover as 5 linhas (deveEnviar15d + deveEnviar7d + if block + console + continue)
const I_CRON = lines[deveEnviar15dIdx].match(/^(\s*)/)[1];
const newCronBlock = [
    I_CRON + "// Envio diário: envia para todos dentro da janela, independente de envios anteriores",
    I_CRON + "const deveEnviar15d = diasRestantes <= 15 && diasRestantes > 7 && !r.notificacao_15d_enviada; // mantido p/ auditoria",
    I_CRON + "const deveEnviar7d  = diasRestantes <= 7  && diasRestantes > 0  && !r.notificacao_7d_enviada;  // mantido p/ auditoria",
    I_CRON + "// Envia todos os dias — não para mais após primeira notificação",
];
lines.splice(deveEnviar15dIdx, oldBlock, ...newCronBlock);
applied++;
console.log('C3: Cron alterado para envio diário');

// ============================================================
// CHANGE 4a: Cron — passar temRascunho quando situacao === 'iniciado'
// ============================================================
// Localizar gerarEmailExperienciaHTML dentro do cron (dentro de verificarExperienciasVencendo)
const cronEmailCallIdx = findLine("tipo: 'automatico'", deveEnviar15dIdx - 100);
if (cronEmailCallIdx === -1) { console.error('ERRO 4a: tipo automatico no cron não encontrado'); process.exit(1); }
console.log('C4a: tipo automatico no cron na linha', cronEmailCallIdx + 1);
// Inserir temRascunho logo antes do fechamento do objeto (antes do })
// A linha com tipo: 'automatico' é parte de gerarEmailExperienciaHTML({...})
// Precisamos adicionar temRascunho: r.situacao === 'iniciado'
lines[cronEmailCallIdx] = lines[cronEmailCallIdx].replace(
    "tipo: 'automatico'",
    "tipo: 'automatico',\n" + lines[cronEmailCallIdx].match(/^(\s*)/)[1] + "                        temRascunho: r.situacao === 'iniciado'"
);
applied++;
console.log('C4a: temRascunho adicionado ao cron');

// ============================================================
// CHANGE 4b: Envio manual — passar temRascunho
// ============================================================
const manualEmailCallIdx = findLine("tipo: 'manual'");
if (manualEmailCallIdx === -1) { console.error('ERRO 4b: tipo manual não encontrado'); process.exit(1); }
console.log('C4b: tipo manual na linha', manualEmailCallIdx + 1);
lines[manualEmailCallIdx] = lines[manualEmailCallIdx].replace(
    "tipo: 'manual'",
    "tipo: 'manual',\n" + lines[manualEmailCallIdx].match(/^(\s*)/)[1] + "                    temRascunho: r.situacao === 'iniciado'"
);
applied++;
console.log('C4b: temRascunho adicionado ao envio manual');

// ============================================================
// CHANGE 4c: forcar — passar temRascunho
// ============================================================
// Localizar segunda ocorrência de tipo: 'automatico' (dentro do /api/experiencia/cron/forcar)
let forcarEmailCallIdx = -1;
for (let i = cronEmailCallIdx + 1; i < lines.length; i++) {
    if (lines[i].includes("tipo: 'automatico'")) { forcarEmailCallIdx = i; break; }
}
if (forcarEmailCallIdx !== -1) {
    lines[forcarEmailCallIdx] = lines[forcarEmailCallIdx].replace(
        "tipo: 'automatico'",
        "tipo: 'automatico',\n" + lines[forcarEmailCallIdx].match(/^(\s*)/)[1] + "                        temRascunho: r.situacao === 'iniciado'"
    );
    applied++;
    console.log('C4c: temRascunho adicionado ao forcar');
}

// Salvar arquivo
const result = lines.join('\n');
fs.writeFileSync(serverFile, result, 'utf8');

// Verificar
const verify = fs.readFileSync(serverFile, 'utf8');
const checks = [
    verify.includes('temRascunho = false'),
    verify.includes("POST /api/experiencia/publico/rascunho"),
    verify.includes("Progresso salvo com sucesso"),
    verify.includes("Envio diário: envia para todos"),
    verify.includes("temRascunho: r.situacao === 'iniciado'"),
];
console.log('\n✅ Verificações:');
checks.forEach((ok, i) => console.log(`  ${ok ? '✅' : '❌'} Check ${i+1}`));

if (checks.every(Boolean)) {
    console.log('\n🎉 SUCESSO! Todas as mudanças do backend aplicadas.');
} else {
    console.error('\n❌ Algumas verificações falharam!');
}
console.log('Total changes applied:', applied);
