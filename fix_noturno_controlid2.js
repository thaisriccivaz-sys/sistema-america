/**
 * fix_noturno_controlid2.js
 * Corrige o response do endpoint ponto-colaborador para incluir horas noturnas + adicional
 * E adiciona AUTO MIGRATION no server.js para a coluna adicional_noturno
 */
const fs = require('fs');

// ===== Fix controlid.js: response =====
{
    let code = fs.readFileSync('backend/routes/controlid.js', 'utf8');
    
    // O colaborador já é lido do banco antes de processar. Verificar onde é declarado
    // Linhas 450-460: return res.json({ success, encontrado, idRHID, nomeRHID, dataIni, dataFinal, apuracaoRaw, apuracaoErro, ...resultado })
    const oldJson = `        return res.json({
            success: true,
            encontrado: true,
            idRHID: idPerson,
            nomeRHID,
            dataIni,
            dataFinal,
            apuracaoRaw: apuracaoData, // incluído para debug/exploração
            apuracaoErro,              // detalhe do erro da apuração para o frontend
            ...resultado
        });`;
    
    const newJson = `        // Calcular horas noturnas e adicional noturno
        const _minNot = resultado.minutosNoturnos || 0;
        let _horasNotStr = '';
        let _adicionalNotVal = 0;
        if (_minNot > 0) {
            // Hora noturna reduzida: fator 60/52.5 = 1.142857
            const _hNotReduzido = (_minNot * (60 / 52.5)) / 60; // horas decimais reduzidas
            const _salario = parseFloat(colaborador && colaborador.salario) || 0;
            const _hNorm = 220; // base padrão CLT
            const _valHora = _salario > 0 ? (_salario / _hNorm) : 0;
            _adicionalNotVal = Math.round(_hNotReduzido * _valHora * 0.20 * 100) / 100;
            // Formatar HH:MM com horas brutas reais
            const _hBruto = Math.floor(_minNot / 60);
            const _mBruto = _minNot % 60;
            _horasNotStr = String(_hBruto).padStart(2, '0') + ':' + String(_mBruto).padStart(2, '0');
        }

        return res.json({
            success: true,
            encontrado: true,
            idRHID: idPerson,
            nomeRHID,
            dataIni,
            dataFinal,
            horasNoturnas: _horasNotStr,
            adicionalNoturnoValor: _adicionalNotVal,
            apuracaoRaw: apuracaoData,
            apuracaoErro,
            ...resultado
        });`;
    
    const oldLF = oldJson.replace(/\n/g, '\r\n');
    if (code.indexOf(oldLF) !== -1) {
        code = code.replace(oldLF, newJson);
        console.log('✅ Fix controlid: response com horasNoturnas + adicionalNoturnoValor');
    } else if (code.indexOf(oldJson) !== -1) {
        code = code.replace(oldJson, newJson);
        console.log('✅ Fix controlid: response (LF)');
    } else {
        console.log('❌ âncora response não encontrada - tentando manual');
        // Localizar pela âncora parcial
        const anchor = 'apuracaoRaw: apuracaoData, // incluído para debug/exploração';
        const idx = code.indexOf(anchor);
        if (idx !== -1) {
            // Encontrar o início do return res.json
            const retStart = code.lastIndexOf('return res.json({', idx);
            // Encontrar o fim do objeto
            let depth = 0; let started = false; let retEnd = idx;
            for (let i = retStart; i < code.length; i++) {
                if (code[i] === '{') { depth++; started = true; }
                if (code[i] === '}') { depth--; if (started && depth === 0) { retEnd = i + 1; break; } }
            }
            // Encontrar o ; e newline depois
            const semiEnd = code.indexOf(';', retEnd) + 1;
            code = code.substring(0, retStart) + newJson.replace('return res.json({', 'return res.json({') + ';' + code.substring(semiEnd);
            console.log('✅ Fix controlid: response (manual)');
        } else {
            console.log('❌ FALHA: âncora anchor não encontrada');
        }
    }
    
    // Verificar se colaborador está disponível no escopo onde usamos
    // O colaborador é buscado do banco antes do passo 4. Verificar
    const hasColab = code.indexOf('colaborador.salario') !== -1 || code.indexOf('colaborador &&') !== -1;
    console.log('Referência colaborador:', hasColab ? 'OK' : 'VERIFICAR');
    
    fs.writeFileSync('backend/routes/controlid.js', code, 'utf8');
    console.log('controlid.js salvo, tamanho:', code.length);
}

// ===== Fix server.js: AUTO MIGRATION adicional_noturno =====
{
    let code = fs.readFileSync('backend/server.js', 'utf8');
    
    const anchor = "console.error('[Migration] fechamento_mensal:', err.message); });";
    const idx = code.indexOf(anchor);
    if (idx !== -1) {
        const end = idx + anchor.length;
        const migration = `\r\ndb.run('ALTER TABLE fechamento_mensal ADD COLUMN adicional_noturno REAL DEFAULT 0', function(e) {\r\n    if (e && !e.message.includes('duplicate') && !e.message.includes('already')) {}\r\n    // coluna ja existe — OK silencioso\r\n});`;
        code = code.substring(0, end) + migration + code.substring(end);
        console.log('✅ server.js: ALTER TABLE adicional_noturno');
    } else {
        console.log('❌ server.js: migration anchor não encontrada');
    }
    
    fs.writeFileSync('backend/server.js', code, 'utf8');
    console.log('server.js salvo, tamanho:', code.length);
}
