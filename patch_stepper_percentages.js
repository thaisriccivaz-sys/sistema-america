/**
 * patch_stepper_percentages.js
 * Corrige updateAdmissaoStepPercentages para calcular TODOS os steps
 * com base nos dados do colaborador (não do DOM de painéis ocultos).
 *
 * Problema: os painéis ocultos retornam 0 doc-items / checklist-items
 * até serem abertos, então step 3-7 sempre aparecem 0% ao carregar.
 */
const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, 'frontend', 'app.js');

let app = fs.readFileSync(appPath, 'utf8');

// ── Substituir a função updateAdmissaoStepPercentages ─────────────────────────
const OLD_FN_START = `function updateAdmissaoStepPercentages(colab) {\r\n    const targetColab = colab || viewedColaborador;\r\n    if (!targetColab) return;\r\n\r\n    const step1 = calculateAdmissaoStep1Completion(targetColab);\r\n    const pc1 = step1.percent;\r\n\r\n    const calculateChecklist = (panelId) => {`;

if (!app.includes(OLD_FN_START)) {
    console.error('❌ Não encontrei o início de updateAdmissaoStepPercentages');
    process.exit(1);
}

// Localizar início e fim da função
const fnStart = app.indexOf('function updateAdmissaoStepPercentages(colab)');
let depth = 0;
let fnEnd = fnStart;
for (let i = fnStart; i < app.length; i++) {
    if (app[i] === '{') depth++;
    else if (app[i] === '}') {
        depth--;
        if (depth === 0) { fnEnd = i + 1; break; }
    }
}

const oldFn = app.slice(fnStart, fnEnd);
console.log(`Função encontrada: linhas ${app.slice(0, fnStart).split('\n').length} - ${app.slice(0, fnEnd).split('\n').length}`);

const newFn = `function updateAdmissaoStepPercentages(colab) {
    const targetColab = colab || viewedColaborador;
    if (!targetColab) return;

    // ── Passo 1: Dados cadastrais ─────────────────────────────────────
    const step1 = calculateAdmissaoStep1Completion(targetColab);
    const pc1 = step1.percent;

    // ── Passo 2: Santander — 100% se ficha foi gerada ─────────────────
    const pc2 = targetColab.santander_ficha_data ? 100 : 0;

    // ── Passo 3: Assinaturas — usa geradores/assinaturas carregados ───
    const pc3 = window._updateAdmissaoStep2Pct ? window._updateAdmissaoStep2Pct() : (() => {
        const checks = document.querySelectorAll('#admissao-signature-list input[type="checkbox"]');
        if (checks.length === 0) return 0;
        const checked = Array.from(checks).filter(c => c.checked).length;
        return Math.round((checked / checks.length) * 100);
    })();

    // Listener no signature-list para reagir a mudanças em tempo real
    const sigList = document.getElementById('admissao-signature-list');
    if (sigList && !sigList.dataset.listener) {
        sigList.addEventListener('change', () => updateAdmissaoStepPercentages());
        sigList.dataset.listener = 'true';
    }

    // Helper: contar docs no DOM do painel (funciona só quando painel está aberto)
    const calculateChecklist = (panelId) => {
        const panel = document.getElementById(panelId);
        if (!panel) return 0;
        const docItems = panel.querySelectorAll('.doc-item');
        if (docItems.length > 0) {
            const total = docItems.length;
            const uploaded = panel.querySelectorAll('.doc-item[data-doc-id]').length;
            return Math.min(100, Math.round((uploaded / total) * 100));
        }
        const total = panel.querySelectorAll('.checklist-item').length;
        if (total === 0) return 0;
        const uploaded = Array.from(panel.querySelectorAll('.upload-status'))
                              .filter(span => span.style.display !== 'none').length;
        return Math.min(100, Math.round((uploaded / total) * 100));
    };

    // ── Passo 4: Ficha Cadastral — documentos enviados ao colaborador ──
    // Tenta DOM primeiro (painel aberto); fallback: dados do colaborador
    let pc4 = 0;
    const panel4 = document.getElementById('panel-step-4');
    if (panel4) {
        const docItems4 = panel4.querySelectorAll('.doc-item');
        if (docItems4.length > 0) {
            const numDocs = docItems4.length;
            const uploaded = panel4.querySelectorAll('.doc-item[data-doc-id]').length;
            const signed = panel4.querySelectorAll('.doc-item[data-assinafy-status*="Assinado"]').length;
            pc4 = Math.min(100, Math.round((uploaded / numDocs) * 20 + (signed / numDocs) * 80));
        }
    }
    // Fallback: usar dados do colaborador (assinaturas) mesmo com painel fechado
    if (pc4 === 0 && targetColab) {
        const assinaturas = window._admissaoAssinaturas || [];
        const geradores = window._admissaoGeradores || [];
        const total = geradores.length;
        if (total > 0) {
            const sent = assinaturas.filter(a => a.enviado_em || (a.assinafy_status && a.assinafy_status !== 'Nenhum' && a.assinafy_status !== '')).length;
            const signed = assinaturas.filter(a => a.assinafy_status === 'Assinado').length;
            pc4 = Math.min(100, Math.round((sent / total) * 20 + (signed / total) * 80));
        }
    }

    // ── Passo 5: ASO — 100% se e-mail enviado para clínica ────────────
    const pc5 = targetColab.aso_email_enviado ? 100 : calculateChecklist('panel-step-5');

    // ── Passo 6: Contabilidade — 100% se ficha enviada ────────────────
    const pc6 = targetColab.admissao_contabil_enviada_em ? 100 : calculateChecklist('panel-step-6');

    // ── Passos 7-10 ───────────────────────────────────────────────────
    const pc7 = calculateChecklist('panel-step-7');
    const pc8 = calculateChecklist('panel-step-8');
    const pc9 = calculateChecklist('panel-step-9');
    const pc10 = 0;

    const percentages = { 1:pc1, 2:pc2, 3:pc3, 4:pc4, 5:pc5, 6:pc6, 7:pc7, 8:pc8, 9:pc9, 10:pc10 };

    let totalPc = 0;
    for (let s in percentages) {
        const pc = percentages[s];
        totalPc += pc;
        const el = document.getElementById(\`step-\${s}-pc\`);
        if (el) el.textContent = \`\${pc}%\`;

        const item = document.getElementById(\`step-\${s}\`);
        if (item) {
            // Regra especial Step 5 (ASO): fica amarelo se e-mail foi enviado mas sem upload
            let isWarning = pc > 0 && pc < 100;
            if (s == 5 && targetColab && targetColab.aso_email_enviado) {
                isWarning = pc < 100;
            }
            item.classList.toggle('pc-warning', isWarning);
            item.classList.toggle('pc-success', pc === 100);
        }
    }

    const avg = Math.round(totalPc / 10);
    const totalEl = document.getElementById('admissao-pc-total');
    if (totalEl) totalEl.textContent = \`\${avg}%\`;
    const bar = document.getElementById('admissao-progress-bar');
    if (bar) bar.style.width = \`\${avg}%\`;
}`;

app = app.slice(0, fnStart) + newFn + app.slice(fnEnd);
console.log('✅ updateAdmissaoStepPercentages corrigida');

// ── Garantir que updateAdmissaoStepPercentages seja chamada também ──────────
// quando o Santander step UI é atualizado, passando o colaborador correto
const OLD_SANTANDER_CALL = `    // Acionar recálculo geral do stepper para manter consistência
    if (typeof updateAdmissaoStepPercentages === 'function') {
        updateAdmissaoStepPercentages();
    }
}`;

const NEW_SANTANDER_CALL = `    // Acionar recálculo geral passando o colaborador para garantir pc2 correto
    if (typeof updateAdmissaoStepPercentages === 'function') {
        updateAdmissaoStepPercentages(viewedColaborador);
    }
}`;

if (app.includes(OLD_SANTANDER_CALL)) {
    app = app.replace(OLD_SANTANDER_CALL, NEW_SANTANDER_CALL);
    console.log('✅ Chamada Santander → updateAdmissaoStepPercentages corrigida');
} else {
    console.warn('⚠️  Chamada Santander não encontrada (pode já estar correta)');
}

fs.writeFileSync(appPath, app, 'utf8');
console.log('✅ frontend/app.js salvo');
console.log('\n🎉 Patch concluído!');
