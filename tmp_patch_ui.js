const fs = require('fs');

function applyFixes() {
    let serverCode = fs.readFileSync('backend/server.js', 'utf8');
    
    // Patch server.js: INSERT/UPDATE statement
    const stmtMatch = `INSERT INTO recibos_historico (mes, ano, colaborador_id, dias_trabalhados, dias_vr, faltas, dias_extra, valor_vr, apuracao_diaria, folgas)`;
    const stmtReplace = `INSERT INTO recibos_historico (mes, ano, colaborador_id, dias_trabalhados, dias_vr, faltas, dias_extra, valor_vr, apuracao_diaria, folgas, folgas_vt, faltas_vt, folgas_vr, faltas_vr)`;
    serverCode = serverCode.replace(stmtMatch, stmtReplace);

    const valuesMatch = `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const valuesReplace = `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    serverCode = serverCode.replace(valuesMatch, valuesReplace);

    const updateMatch = `folgas=excluded.folgas,
                apuracao_diaria=COALESCE(excluded.apuracao_diaria, recibos_historico.apuracao_diaria)`;
    const updateReplace = `folgas=excluded.folgas,
                folgas_vt=excluded.folgas_vt,
                faltas_vt=excluded.faltas_vt,
                folgas_vr=excluded.folgas_vr,
                faltas_vr=excluded.faltas_vr,
                apuracao_diaria=COALESCE(excluded.apuracao_diaria, recibos_historico.apuracao_diaria)`;
    serverCode = serverCode.replace(updateMatch, updateReplace);

    const runMatch = `stmt.run([mes, ano, i.colaborador_id, i.dias_trabalhados, i.dias_vr, i.faltas, i.dias_extra, i.valor_vr, i.apuracao_diaria, i.folgas || 0], function(errRun) {`;
    const runReplace = `stmt.run([mes, ano, i.colaborador_id, i.dias_trabalhados, i.dias_vr, i.faltas, i.dias_extra, i.valor_vr, i.apuracao_diaria, i.folgas || 0, i.folgas_vt || 0, i.faltas_vt || 0, i.folgas_vr || 0, i.faltas_vr || 0], function(errRun) {`;
    serverCode = serverCode.replace(runMatch, runReplace);

    fs.writeFileSync('backend/server.js', serverCode, 'utf8');


    let recibosCode = fs.readFileSync('frontend/recibos.js', 'utf8');

    // 1. Rename column
    const colNameMatch = `FALTAS VT \${_recibosSortCol==='faltasVT'?(_recibosSortAsc?'<i class="ph ph-caret-up"></i>':'<i class="ph ph-caret-down"></i>'):''}`;
    const colNameReplace = `FALTAS TRANSP. \${_recibosSortCol==='faltasVT'?(_recibosSortAsc?'<i class="ph ph-caret-up"></i>':'<i class="ph ph-caret-down"></i>'):''}`;
    recibosCode = recibosCode.replace(colNameMatch, colNameReplace);

    // 2. Limit Name to 30 chars
    const nameMatch = `title="\${esc(nomeLimpo)}">\${esc(nomeLimpo)}</div>`;
    const nameReplace = `title="\${esc(nomeLimpo)}">\${esc(nomeLimpo.length > 30 ? nomeLimpo.substring(0, 30) + '...' : nomeLimpo)}</div>`;
    recibosCode = recibosCode.replace(nameMatch, nameReplace);

    // 3. Fix _isSupervisao
    const supMatch = `window._isSupervisao = function(c) {
    // Se o colaborador tem dados reais de ponto do RHID (apuracaoDiaria),
    // ele bate ponto e deve ser tratado como operacional (não supervisão)
    const sel = _recibosSelecoes ? _recibosSelecoes[c.id] : null;
    if (sel && sel.apuracaoDiaria && sel.apuracaoDiaria.length > 0) return false;`;
    const supReplace = `window._isSupervisao = function(c) {
    // Se o colaborador tem dados reais de ponto do RHID (apuracaoDiaria),
    // ele bate ponto e deve ser tratado como operacional (não supervisão)
    const sel = _recibosSelecoes ? _recibosSelecoes[c.id] : null;
    if (sel && sel.apuracaoDiaria && sel.apuracaoDiaria.length > 0) {
        // Verifica se tem alguma batida real ou hora trabalhada no período
        const temPontoReal = sel.apuracaoDiaria.some(d => {
            const trb = (d.diasTrabalhados || 0) > 0 || (d.totalHorasTrabalhadas || 0) > 0;
            const batidas = d.marcacoes && d.marcacoes.length > 0;
            return trb || batidas;
        });
        if (temPontoReal) return false;
    }`;
    recibosCode = recibosCode.replace(supMatch, supReplace);

    // 4. Update the save payloads (3 occurrences)
    const saveMatchRegex = /folgas: _recibosSelecoes\[c\.id\]\.folgas \|\| 0,/g;
    const saveReplace = `folgas: _recibosSelecoes[c.id].folgas || 0,
            folgas_vt: _recibosSelecoes[c.id].folgasVT || 0,
            faltas_vt: _recibosSelecoes[c.id].faltasVT || 0,
            folgas_vr: _recibosSelecoes[c.id].folgasVR || 0,
            faltas_vr: _recibosSelecoes[c.id].faltasVR || 0,`;
    recibosCode = recibosCode.replace(saveMatchRegex, saveReplace);

    // 5. Update history loader
    const histMatchRegex = /_recibosSelecoes\[h\.colaborador_id\]\.folgas = h\.folgas \|\| 0;/g;
    const histReplace = `_recibosSelecoes[h.colaborador_id].folgas = h.folgas || 0;
                    _recibosSelecoes[h.colaborador_id].folgasVT = h.folgas_vt != null ? h.folgas_vt : (h.folgas || 0);
                    _recibosSelecoes[h.colaborador_id].faltasVT = h.faltas_vt != null ? h.faltas_vt : h.faltas;
                    _recibosSelecoes[h.colaborador_id].folgasVR = h.folgas_vr != null ? h.folgas_vr : (h.folgas || 0);
                    _recibosSelecoes[h.colaborador_id].faltasVR = h.faltas_vr != null ? h.faltas_vr : h.faltas;`;
    // We only want to replace the first one inside `hist.forEach`, but a global replace is safe since it only exists once there.
    recibosCode = recibosCode.replace(histMatchRegex, histReplace);

    fs.writeFileSync('frontend/recibos.js', recibosCode, 'utf8');
    console.log('All files patched successfully.');
}

applyFixes();
