// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: RELATÓRIO IA POR DEPARTAMENTO (SATISFAÇÃO & DESEMPENHO), STATUS E ENVIO AO GESTOR
// Arquivo: backend/routes_satisfacao_ia.js
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = function registerSatisfacaoIA(app, db, authenticateToken, sendMailHelper) {
    const dbRun = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res({ lastID: this.lastID, changes: this.changes }); }));
    const dbGet = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => e ? rej(e) : res(r || null)));
    const dbAll = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => e ? rej(e) : res(r || [])));

    db.run(`CREATE TABLE IF NOT EXISTS satisfacao_relatorios_ia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        departamento TEXT NOT NULL,
        ano INTEGER NOT NULL,
        trimestre INTEGER NOT NULL,
        relatorio_texto TEXT NOT NULL,
        resumo_json TEXT,
        enviado_gestor_em DATETIME,
        enviado_para_email TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(departamento, ano, trimestre)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS desempenho_relatorios_ia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        departamento TEXT NOT NULL,
        ano INTEGER NOT NULL,
        trimestre INTEGER NOT NULL,
        relatorio_texto TEXT NOT NULL,
        resumo_json TEXT,
        enviado_gestor_em DATETIME,
        enviado_para_email TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(departamento, ano, trimestre)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS satisfacao_status_periodo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        colaborador_id INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        trimestre INTEGER NOT NULL,
        status_manual TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(colaborador_id, ano, trimestre)
    )`);

    const MES_TRIM_SAT = { 1: 'Fevereiro', 2: 'Maio', 3: 'Agosto', 4: 'Novembro' };
    const MES_TRIM_DES = { 1: 'Janeiro', 2: 'Abril', 3: 'Julho', 4: 'Outubro' };

    function normTipo(tipo) {
        return String(tipo || 'satisfacao').toLowerCase() === 'desempenho' ? 'desempenho' : 'satisfacao';
    }
    function tabelaRelatorioPorTipo(tipo) {
        return normTipo(tipo) === 'desempenho' ? 'desempenho_relatorios_ia' : 'satisfacao_relatorios_ia';
    }
    function labelPeriodo(ano, trim, tipo = 'satisfacao') {
        const map = normTipo(tipo) === 'desempenho' ? MES_TRIM_DES : MES_TRIM_SAT;
        return `${map[trim] || ('T' + trim)} (${trim}º Trim. ${ano})`;
    }

    // Escala oficial de cores e níveis:
    // >= 4.5: Verde (Ponto Forte / Bom)
    // 4.0 a 4.49 (< 4.5): Amarelo (Ponto de Atenção)
    // 3.0 a 3.99 (< 4.0): Laranja (Atenção Redobrada)
    // < 3.0: Vermelho (Crítico)
    function corTextoNota(v) {
        if (v === null || v === undefined || isNaN(v)) return '#94a3b8';
        if (v >= 4.5) return '#15803d';
        if (v >= 4.0) return '#a16207';
        if (v >= 3.0) return '#c2410c';
        return '#b91c1c';
    }
    function corFundoNota(v) {
        if (v === null || v === undefined || isNaN(v)) return '#f1f5f9';
        if (v >= 4.5) return '#dcfce7';
        if (v >= 4.0) return '#fef9c3';
        if (v >= 3.0) return '#ffedd5';
        return '#fee2e2';
    }
    function nivelAtencaoNota(v) {
        if (v === null || v === undefined || isNaN(v)) return 'Sem dados';
        if (v >= 4.5) return 'Ponto Forte (Verde)';
        if (v >= 4.0) return 'Ponto de Atenção (Amarelo)';
        if (v >= 3.0) return 'Atenção Redobrada (Laranja)';
        return 'Crítico (Vermelho)';
    }

    async function buscarGestorDepartamento(departamento) {
        if (!departamento) return null;
        const d = await dbGet(
            `SELECT d.id, d.nome, d.responsavel_id,
                    c.nome_completo AS gestor_nome,
                    COALESCE(NULLIF(TRIM(c.email_corporativo), ''), NULLIF(TRIM(c.email), '')) AS colab_email
             FROM departamentos d
             LEFT JOIN colaboradores c ON c.id = d.responsavel_id
             WHERE LOWER(TRIM(d.nome)) = LOWER(TRIM(?))
             LIMIT 1`,
            [departamento]
        );
        if (!d) return { departamento, gestor_nome: null, gestor_email: null, usuario_id: null };
        let usu = null;
        if (d.gestor_nome) {
            usu = await dbGet(
                `SELECT id, username, nome, email FROM usuarios
                 WHERE ativo = 1 AND (LOWER(TRIM(nome)) = LOWER(TRIM(?)) OR LOWER(TRIM(username)) = LOWER(TRIM(?)))
                 LIMIT 1`,
                [d.gestor_nome, d.gestor_nome.split(/\s+/).slice(0, 2).join('.')]
            );
        }
        const email = (d.colab_email && d.colab_email.includes('@'))
            ? d.colab_email
            : (usu && usu.email && usu.email.includes('@') ? usu.email : null);
        return {
            departamento: d.nome || departamento,
            responsavel_id: d.responsavel_id || null,
            gestor_nome: d.gestor_nome || (usu && (usu.nome || usu.username)) || null,
            gestor_email: email,
            usuario_id: usu ? usu.id : null
        };
    }

    // Coleta estatísticas, evolução histórica entre períodos e observações 100% ANÔNIMAS do departamento
    async function coletarDadosAnonimosDepto(departamento, ano, trimestre, tipoRaw = 'satisfacao') {
        const tipo = normTipo(tipoRaw);
        const colabsDepto = await dbAll(
            `SELECT id, nome_completo, cargo, departamento, data_admissao
             FROM colaboradores
             WHERE status != 'Desligado'
               AND LOWER(TRIM(COALESCE(departamento, 'Sem Departamento'))) = LOWER(TRIM(?))`,
            [departamento]
        );
        const statusManualRows = tipo === 'satisfacao'
            ? await dbAll(
                `SELECT colaborador_id, status_manual
                 FROM satisfacao_status_periodo
                 WHERE ano = ? AND trimestre = ?`,
                [Number(ano), Number(trimestre)]
            )
            : [];
        const statusManualMap = {};
        statusManualRows.forEach(r => { statusManualMap[r.colaborador_id] = r.status_manual; });

        const mesInicioMap = tipo === 'satisfacao'
            ? { 1: 2, 2: 5, 3: 8, 4: 11 }
            : { 1: 1, 2: 4, 3: 7, 4: 10 };
        const mesInicio = mesInicioMap[Number(trimestre)] || ((Number(trimestre) - 1) * 3 + 1);
        const dataPesquisa = new Date(Number(ano), mesInicio - 1, 1);

        const rows = await dbAll(
            `SELECT a.colaborador_id, a.respostas_json, c.cargo
             FROM avaliacoes a
             JOIN colaboradores c ON c.id = a.colaborador_id
             WHERE a.tipo = ?
               AND a.ano = ?
               AND a.trimestre = ?
               AND LOWER(TRIM(COALESCE(c.departamento, 'Sem Departamento'))) = LOWER(TRIM(?))`,
            [tipo, Number(ano), Number(trimestre), departamento]
        );
        const respondidosSet = new Set(rows.map(r => r.colaborador_id));

        let elegiveisCount = 0;
        let concluidosEspeciaisCount = 0;
        colabsDepto.forEach(c => {
            if (respondidosSet.has(c.id)) {
                elegiveisCount++;
                return;
            }
            const manual = statusManualMap[c.id];
            const dtAdm = c.data_admissao ? new Date(c.data_admissao) : null;
            const naoAdmAuto = dtAdm && dtAdm > dataPesquisa;
            if (manual === 'na' || manual === 'afastado' || (!manual && naoAdmAuto)) {
                concluidosEspeciaisCount++;
            } else {
                elegiveisCount++;
            }
        });

        const nomesParaAnonimizar = colabsDepto
            .map(c => String(c.nome_completo || '').trim())
            .filter(Boolean);

        const anonimizarTexto = (txt) => {
            let s = String(txt || '').trim();
            nomesParaAnonimizar.forEach(nome => {
                const partes = nome.split(/\s+/).filter(p => p.length >= 3);
                if (nome.length >= 3) {
                    const rxFull = new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    s = s.replace(rxFull, '[colaborador]');
                }
                partes.forEach(p => {
                    const rxPart = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                    s = s.replace(rxPart, '[colaborador]');
                });
            });
            return s;
        };

        const templatesRows = await dbAll(`SELECT grupo_key, categorias_json FROM avaliacao_templates WHERE LOWER(tipo) = ?`, [tipo]).catch(() => []);
        const templatesMap = {};
        templatesRows.forEach(t => {
            try {
                const cats = JSON.parse(t.categorias_json || '{}');
                String(t.grupo_key || '').split(',').map(k => k.trim()).filter(Boolean).forEach(k => {
                    templatesMap[k] = cats;
                });
            } catch (e) { /* ignore */ }
        });

        const topicosNotas = {};
        const perguntasNotas = {};
        const observacoesAnonimas = [];

        rows.forEach(r => {
            let resp = {};
            try { resp = JSON.parse(r.respostas_json || '{}'); } catch (e) { resp = {}; }

            let snapCats = null;
            if (resp.__categorias_snapshot__) {
                try { snapCats = JSON.parse(resp.__categorias_snapshot__); } catch (e) { snapCats = null; }
            }
            if (!snapCats && resp.__grupo__ && templatesMap[resp.__grupo__]) {
                snapCats = templatesMap[resp.__grupo__];
            }

            if (resp.scores && typeof resp.scores === 'object' && !Array.isArray(resp.scores)) {
                Object.entries(resp.scores).forEach(([topico, val]) => {
                    const n = parseFloat(val);
                    if (!isNaN(n)) {
                        if (!topicosNotas[topico]) topicosNotas[topico] = [];
                        topicosNotas[topico].push(n);
                    }
                });
            } else {
                Object.entries(resp).forEach(([topico, val]) => {
                    if (topico.startsWith('__') || topico === 'scores' || topico === 'topicos' || topico === 'info_adicional') return;
                    if (!topicosNotas[topico]) topicosNotas[topico] = [];
                    if (Array.isArray(val)) {
                        val.forEach((v, idx) => {
                            const n = parseFloat(v);
                            if (!isNaN(n)) {
                                topicosNotas[topico].push(n);
                                const qTxt = snapCats && snapCats[topico] && snapCats[topico][idx] ? snapCats[topico][idx] : `${topico} (Item ${idx + 1})`;
                                const keyP = `${topico} — ${qTxt}`;
                                if (!perguntasNotas[keyP]) perguntasNotas[keyP] = [];
                                perguntasNotas[keyP].push(n);
                            }
                        });
                    } else if (typeof val === 'object' && val !== null) {
                        Object.entries(val).forEach(([idxStr, v]) => {
                            if (idxStr === 'media') return;
                            const n = parseFloat(v);
                            if (!isNaN(n)) {
                                topicosNotas[topico].push(n);
                                const idx = parseInt(idxStr, 10);
                                const qTxt = snapCats && snapCats[topico] && !isNaN(idx) && snapCats[topico][idx] ? snapCats[topico][idx] : `${topico} (Item ${idxStr})`;
                                const keyP = `${topico} — ${qTxt}`;
                                if (!perguntasNotas[keyP]) perguntasNotas[keyP] = [];
                                perguntasNotas[keyP].push(n);
                            }
                        });
                    } else {
                        const n = parseFloat(val);
                        if (!isNaN(n)) topicosNotas[topico].push(n);
                    }
                });
            }

            if (resp.__obs__ && typeof resp.__obs__ === 'object') {
                Object.entries(resp.__obs__).forEach(([topico, obsMap]) => {
                    if (topico === 'info_adicional' && typeof obsMap === 'string' && obsMap.trim()) {
                        observacoesAnonimas.push({ contexto: 'Observação Geral', topico: 'Geral', texto: anonimizarTexto(obsMap) });
                        return;
                    }
                    if (typeof obsMap === 'object' && obsMap !== null) {
                        Object.entries(obsMap).forEach(([idxStr, txtObs]) => {
                            if (txtObs && String(txtObs).trim()) {
                                const idx = parseInt(idxStr, 10);
                                const qTxt = snapCats && snapCats[topico] && !isNaN(idx) && snapCats[topico][idx] ? snapCats[topico][idx] : topico;
                                observacoesAnonimas.push({
                                    contexto: `${topico}${qTxt !== topico ? ' (' + qTxt + ')' : ''}`,
                                    topico,
                                    pergunta: qTxt,
                                    texto: anonimizarTexto(txtObs)
                                });
                            }
                        });
                    }
                });
            }
            if (resp.__obs_gerais__ && String(resp.__obs_gerais__).trim()) {
                const ja = observacoesAnonimas.some(o => o.texto === anonimizarTexto(resp.__obs_gerais__));
                if (!ja) observacoesAnonimas.push({ contexto: 'Observação Geral', topico: 'Geral', texto: anonimizarTexto(resp.__obs_gerais__) });
            }
        });

        const resumoTopicos = Object.entries(topicosNotas).map(([topico, arr]) => {
            const media = arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;
            return { topico, media, nivel: nivelAtencaoNota(media), qtd_notas: arr.length };
        }).filter(t => t.media !== null).sort((a, b) => b.media - a.media);

        const resumoPerguntas = Object.entries(perguntasNotas).map(([pergunta, arr]) => {
            const media = arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;
            const qtdBaixas = arr.filter(n => n <= 3).length;
            return { pergunta, media, nivel: nivelAtencaoNota(media), qtd_respostas: arr.length, qtd_baixas: qtdBaixas };
        }).filter(p => p.media !== null).sort((a, b) => a.media - b.media);

        const todasMediasTopicos = resumoTopicos.map(t => t.media);
        const mediaGeral = todasMediasTopicos.length
            ? parseFloat((todasMediasTopicos.reduce((a, b) => a + b, 0) / todasMediasTopicos.length).toFixed(2))
            : null;

        const historico = await coletarHistoricoComparativoDepto(departamento, Number(ano), Number(trimestre), tipo);

        return {
            tipo,
            total_colaboradores: elegiveisCount,
            total_bruto_colaboradores: colabsDepto.length,
            concluidos_especiais: concluidosEspeciaisCount,
            responderam: rows.length,
            media_geral: mediaGeral,
            topicos: resumoTopicos,
            perguntas: resumoPerguntas,
            observacoes: observacoesAnonimas,
            historico
        };
    }

    async function coletarHistoricoComparativoDepto(departamento, anoAte, trimAte, tipoRaw = 'satisfacao') {
        const tipo = normTipo(tipoRaw);
        const periodosDb = await dbAll(
            `SELECT DISTINCT ano, trimestre FROM avaliacoes
             WHERE tipo = ?
               AND (ano < ? OR (ano = ? AND trimestre <= ?))
             ORDER BY ano DESC, trimestre DESC LIMIT 4`,
            [tipo, anoAte, anoAte, trimAte]
        );
        if (!periodosDb.some(p => Number(p.ano) === anoAte && Number(p.trimestre) === trimAte)) {
            periodosDb.unshift({ ano: anoAte, trimestre: trimAte });
        }
        const periodos = periodosDb
            .slice(0, 4)
            .sort((a, b) => (a.ano - b.ano) || (a.trimestre - b.trimestre))
            .map(p => ({
                ano: Number(p.ano),
                trimestre: Number(p.trimestre),
                key: `${p.ano}-T${p.trimestre}`,
                label: labelPeriodo(Number(p.ano), Number(p.trimestre), tipo)
            }));

        const rows = await dbAll(
            `SELECT a.ano, a.trimestre, a.respostas_json
             FROM avaliacoes a
             JOIN colaboradores c ON c.id = a.colaborador_id
             WHERE a.tipo = ?
               AND LOWER(TRIM(COALESCE(c.departamento, 'Sem Departamento'))) = LOWER(TRIM(?))`,
            [tipo, departamento]
        );

        const mapTopicos = {};
        const ordemTopicos = [];
        const addVal = (topico, key, v) => {
            if (!topico || topico.startsWith('_') || topico === 'scores' || topico === 'topicos' || topico === 'info_adicional') return;
            const n = parseFloat(v);
            if (isNaN(n)) return;
            if (!mapTopicos[topico]) {
                mapTopicos[topico] = {};
                ordemTopicos.push(topico);
            }
            if (!mapTopicos[topico][key]) mapTopicos[topico][key] = [];
            mapTopicos[topico][key].push(n);
        };

        rows.forEach(r => {
            const key = `${r.ano}-T${r.trimestre}`;
            if (!periodos.some(p => p.key === key)) return;
            let resp = {};
            try { resp = JSON.parse(r.respostas_json || '{}'); } catch (e) { resp = {}; }
            if (resp.scores && typeof resp.scores === 'object' && !Array.isArray(resp.scores)) {
                Object.entries(resp.scores).forEach(([topico, avg]) => addVal(topico, key, avg));
                return;
            }
            Object.entries(resp).forEach(([topico, notas]) => {
                if (topico.startsWith('__') || topico === 'scores' || topico === 'topicos' || topico === 'info_adicional') return;
                if (Array.isArray(notas)) {
                    const nums = notas.map(n => parseFloat(n)).filter(n => !isNaN(n));
                    if (nums.length) addVal(topico, key, nums.reduce((a, b) => a + b, 0) / nums.length);
                } else if (typeof notas === 'object' && notas !== null) {
                    const nums = Object.values(notas).map(n => parseFloat(n)).filter(n => !isNaN(n));
                    if (nums.length) addVal(topico, key, nums.reduce((a, b) => a + b, 0) / nums.length);
                } else {
                    addVal(topico, key, notas);
                }
            });
        });

        const linhasTopicos = ordemTopicos.map(topico => {
            const valores = periodos.map(p => {
                const arr = mapTopicos[topico][p.key] || [];
                return arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;
            });
            return { topico, valores };
        });

        const mediasPeriodo = periodos.map((p, idx) => {
            const vals = linhasTopicos.map(t => t.valores[idx]).filter(v => v !== null && !isNaN(v));
            return vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : null;
        });

        return { periodos, topicos: linhasTopicos, medias_periodo: mediasPeriodo };
    }

    function montarTabelaComparativaHtml(departamento, gestorNome, est) {
        const hist = est.historico || { periodos: [], topicos: [], medias_periodo: [] };
        const periodos = hist.periodos || [];
        const topicos = hist.topicos || [];
        if (!periodos.length || !topicos.length) return '';

        const mediaRef = est.media_geral != null ? Number(est.media_geral).toFixed(1) : '—';
        const corMediaBg = corFundoNota(est.media_geral);
        const corMediaTxt = corTextoNota(est.media_geral);

        const setaTendenciaHtml = (vals, idx) => {
            if (idx === 0) return '';
            const atual = vals[idx];
            let ant = null;
            for (let k = idx - 1; k >= 0; k--) {
                if (vals[k] !== null && vals[k] !== undefined && !isNaN(vals[k])) {
                    ant = vals[k];
                    break;
                }
            }
            if (atual === null || atual === undefined || ant === null || ant === undefined) return '';
            const diff = atual - ant;
            if (diff >= 0.1) return `<span style="color:#16a34a;font-size:0.82rem;font-weight:800;margin-left:6px;" title="+${diff.toFixed(1)}">▲</span>`;
            if (diff <= -0.1) return `<span style="color:#dc2626;font-size:0.82rem;font-weight:800;margin-left:6px;" title="${diff.toFixed(1)}">▼</span>`;
            return `<span style="color:#94a3b8;font-size:0.82rem;font-weight:700;margin-left:6px;" title="Estável">→</span>`;
        };

        const pillHtml = (v) => {
            if (v === null || v === undefined || isNaN(v)) {
                return `<span style="display:inline-block;min-width:44px;padding:4px 10px;border-radius:999px;background:#f1f5f9;color:#94a3b8;font-weight:700;font-size:0.82rem;text-align:center;">—</span>`;
            }
            return `<span style="display:inline-block;min-width:44px;padding:4px 10px;border-radius:999px;background:${corFundoNota(v)};color:${corTextoNota(v)};font-weight:700;font-size:0.82rem;text-align:center;">${Number(v).toFixed(1)}</span>`;
        };

        return `
        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;margin:16px 0 22px;">
            <div style="padding:14px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <span style="font-weight:800;color:#1e293b;font-size:1rem;">🏢 ${departamento}</span>
                <span style="background:#ede9fe;color:#7c3aed;border-radius:8px;padding:4px 10px;font-size:0.76rem;font-weight:700;">
                    👥 ${est.responderam}/${est.total_colaboradores} respondentes
                </span>
                ${gestorNome ? `<span style="background:#e0f2fe;color:#0369a1;border-radius:8px;padding:4px 10px;font-size:0.76rem;font-weight:700;">Gestor: ${gestorNome}</span>` : ''}
                ${est.media_geral != null ? `<span style="background:${corMediaBg};color:${corMediaTxt};border-radius:999px;padding:4px 12px;font-size:0.8rem;font-weight:800;">Média: ${mediaRef}</span>` : ''}
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:10px 14px;text-align:left;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;border-bottom:1px solid #e2e8f0;">Tópico Avaliado</th>
                            ${periodos.map((p, i) => `<th style="padding:10px 14px;text-align:center;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${p.label}${i > 0 ? ' <span style="font-size:0.65rem;opacity:0.65;">TENDÊNCIA</span>' : ''}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${topicos.map(t => `
                            <tr>
                                <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#334155;">${t.topico}</td>
                                ${t.valores.map((v, i) => `
                                    <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:center;white-space:nowrap;">
                                        ${pillHtml(v)}${setaTendenciaHtml(t.valores, i)}
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                        <tr style="background:#f8fafc;font-weight:700;">
                            <td style="padding:10px 14px;color:#7c3aed;font-weight:800;">Média do Departamento (${departamento})</td>
                            ${hist.medias_periodo.map((v, i) => `
                                <td style="padding:10px 14px;text-align:center;white-space:nowrap;">
                                    ${pillHtml(v)}${setaTendenciaHtml(hist.medias_periodo, i)}
                                </td>
                            `).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style="padding:10px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:0.74rem;color:#64748b;display:flex;gap:14px;flex-wrap:wrap;">
                <span>🟢 <strong>≥ 4,5:</strong> Ponto Forte</span>
                <span>🟡 <strong>4,0 a 4,4:</strong> Ponto de Atenção</span>
                <span>🟠 <strong>3,0 a 3,9:</strong> Atenção Redobrada</span>
                <span>🔴 <strong>&lt; 3,0:</strong> Crítico</span>
            </div>
        </div>`;
    }

    function gerarRelatorioFallbackEstruturado(departamento, ano, trimestre, est, tipoRaw = 'satisfacao') {
        const tipo = normTipo(tipoRaw);
        const nomeAval = tipo === 'desempenho' ? 'Desempenho' : 'Clima e Satisfação';
        const fortes = est.topicos.filter(t => t.media >= 4.5);
        const atencaoAmarelo = est.topicos.filter(t => t.media >= 4.0 && t.media < 4.5);
        const atencaoLaranja = est.topicos.filter(t => t.media >= 3.0 && t.media < 4.0);
        const criticosVermelho = est.topicos.filter(t => t.media < 3.0);

        const hist = est.historico || { periodos: [], topicos: [], medias_periodo: [] };
        const evoluiu = [];
        const recuou = [];
        if (hist.periodos && hist.periodos.length >= 2) {
            const ultIdx = hist.periodos.length - 1;
            hist.topicos.forEach(t => {
                const atual = t.valores[ultIdx];
                let ant = null;
                for (let k = ultIdx - 1; k >= 0; k--) {
                    if (t.valores[k] !== null && t.valores[k] !== undefined) { ant = t.valores[k]; break; }
                }
                if (atual !== null && ant !== null) {
                    if (atual - ant >= 0.1) evoluiu.push(t.topico);
                    else if (atual - ant <= -0.1) recuou.push(t.topico);
                }
            });
        }

        const temasSensiveis = new Set();
        est.observacoes.forEach(o => {
            const tx = String(o.texto || '').toLowerCase();
            const ctx = String(o.topico || o.contexto || '').toLowerCase();
            if (tx.includes('comunica') || tx.includes('aviso') || tx.includes('informa') || ctx.includes('comunica')) {
                temasSensiveis.add('alinhamento de comunicação interna e clareza no repasse de orientações');
            }
            if (tx.includes('equipamento') || tx.includes('ferramenta') || tx.includes('caminh') || tx.includes('veic') || tx.includes('estrutura') || ctx.includes('condi')) {
                temasSensiveis.add('condições de recursos operacionais, manutenção preventiva e ferramentas de rotina');
            }
            if (tx.includes('cresci') || tx.includes('carreira') || tx.includes('oportunidade') || tx.includes('treinament') || tx.includes('capacita') || ctx.includes('cresci')) {
                temasSensiveis.add('necessidade de capacitação técnica, treinamentos direcionados e desenvolvimento da equipe');
            }
            if (tx.includes('rotina') || tx.includes('sobrecarga') || tx.includes('tempo') || tx.includes('prazo') || tx.includes('entrega') || ctx.includes('organiza') || ctx.includes('processo') || ctx.includes('produtiv')) {
                temasSensiveis.add('organização das demandas diárias, cumprimento de prazos e padronização de processos');
            }
            if (tx.includes('lider') || tx.includes('gestor') || tx.includes('escuta') || tx.includes('apoio') || tx.includes('feedback') || ctx.includes('lider')) {
                temasSensiveis.add('acompanhamento próximo da liderança e rituais estruturados de orientação e feedback');
            }
            if (tx.includes('equipe') || tx.includes('colega') || tx.includes('clima') || tx.includes('colabora')) {
                temasSensiveis.add('integração entre os membros da equipe e colaboração mútua na execução');
            }
        });
        est.perguntas.filter(p => p.media < 4.2 || p.qtd_baixas > 0).slice(0, 5).forEach(p => {
            const pNome = p.pergunta.split(' — ')[0] || p.pergunta;
            temasSensiveis.add(`aperfeiçoamento prático e treinamento nos critérios ligados a ${pNome.toLowerCase()}`);
        });

        const linhas = [];
        linhas.push(`Análise Executiva de ${nomeAval} — Departamento ${departamento} (${labelPeriodo(ano, trimestre, tipo)})`);
        linhas.push('');
        linhas.push('1. Pontos Fortes do Departamento');
        if (fortes.length > 0) {
            const nomesFortes = fortes.map(f => f.topico).join(', ');
            linhas.push(`A equipe apresenta consistência e resultados muito positivos nos pilares de ${nomesFortes}. Esses indicadores demonstram maturidade operacional, domínio das rotinas essenciais e boa aderência às expectativas da empresa nesses quesitos.`);
        } else {
            linhas.push(`Embora o departamento mantenha entregas relevantes na rotina, nenhum pilar atingiu a faixa máxima de consolidação neste ciclo, apontando oportunidade clara para ações de desenvolvimento e acompanhamento mais próximo.`);
        }
        if (evoluiu.length > 0) {
            linhas.push(`Em comparação com os períodos anteriores, houve evolução positiva em ${evoluiu.join(', ')}, refletindo avanço consistente da equipe.`);
        }

        linhas.push('');
        linhas.push('2. Pontos de Melhoria e Níveis de Atenção');
        if (criticosVermelho.length === 0 && atencaoLaranja.length === 0 && atencaoAmarelo.length === 0) {
            linhas.push(`Todos os tópicos avaliados situaram-se na faixa verde, sem alertas em amarelo, laranja ou vermelho neste período. Recomenda-se manter a regularidade dos feedbacks e o estímulo contínuo ao aprimoramento.`);
        } else {
            if (criticosVermelho.length > 0) {
                linhas.push(`• Nível Crítico (Vermelho): Os critérios de ${criticosVermelho.map(x => x.topico).join(', ')} exigem intervenção imediata e plano de capacitação prioritário, indicando lacunas importantes na execução ou na percepção da área.`);
            }
            if (atencaoLaranja.length > 0) {
                linhas.push(`• Atenção Redobrada (Laranja): Os pilares de ${atencaoLaranja.map(x => x.topico).join(', ')} estão na faixa laranja e demandam atenção redobrada, sendo recomendável estruturar reciclagem prática e alinhamento direto com o time.`);
            }
            if (atencaoAmarelo.length > 0) {
                linhas.push(`• Ponto de Atenção (Amarelo): Os temas de ${atencaoAmarelo.map(x => x.topico).join(', ')} encontram-se em faixa amarela de atenção preventiva, sinalizando oscilações pontuais que podem ser fortalecidas com orientação e treinamentos direcionados.`);
            }
        }
        if (recuou.length > 0) {
            linhas.push(`• Tendência Histórica: Observou-se retração frente ao ciclo anterior em ${recuou.join(', ')}, merecendo atenção especial da gestão.`);
        }

        linhas.push('');
        linhas.push('3. Informações Importantes e Recomendações para a Gestão');
        if (temasSensiveis.size > 0) {
            const listaTemas = Array.from(temasSensiveis);
            linhas.push(`A leitura analítica das avaliações e observações registradas aponta foco de desenvolvimento em: ${listaTemas.join('; ')}.`);
            linhas.push(`Recomenda-se utilizar esses direcionadores para definir trilhas/cursos de desenvolvimento na UniAmérica e rituais de acompanhamento com a liderança do setor.`);
        } else {
            linhas.push(`O conjunto das avaliações indica estabilidade no departamento. Recomenda-se manter ciclos periódicos de feedback e treinamentos de atualização contínua.`);
        }

        return linhas.join('\n');
    }

    // PUT /api/avaliacoes/satisfacao/status-colaborador — Permite alterar Pendente para N/A ou Afastado (considerado concluído)
    app.put('/api/avaliacoes/satisfacao/status-colaborador', authenticateToken, async (req, res) => {
        try {
            const colaborador_id = parseInt(req.body.colaborador_id, 10);
            const ano = parseInt(req.body.ano, 10);
            const trimestre = parseInt(req.body.trimestre, 10);
            const status_manual = String(req.body.status_manual || '').trim().toLowerCase();

            if (!colaborador_id || !ano || !trimestre || !['pendente', 'na', 'afastado'].includes(status_manual)) {
                return res.status(400).json({ error: 'Parâmetros inválidos. Informe colaborador_id, ano, trimestre e status_manual (pendente, na ou afastado).' });
            }

            await dbRun(
                `INSERT INTO satisfacao_status_periodo (colaborador_id, ano, trimestre, status_manual, updated_at)
                 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(colaborador_id, ano, trimestre)
                 DO UPDATE SET status_manual = excluded.status_manual, updated_at = CURRENT_TIMESTAMP`,
                [colaborador_id, ano, trimestre, status_manual]
            );

            res.json({ ok: true, colaborador_id, ano, trimestre, status_manual });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Rotas parametrizadas para :tipo ('satisfacao' | 'desempenho')
    app.get('/api/avaliacoes/:tipo/relatorio-ia', authenticateToken, async (req, res) => {
        try {
            const tipo = normTipo(req.params.tipo);
            const tabela = tabelaRelatorioPorTipo(tipo);
            const departamento = String(req.query.departamento || '').trim();
            const ano = parseInt(req.query.ano, 10);
            const trimestre = parseInt(req.query.trimestre, 10);
            if (!departamento || !ano || !trimestre) {
                return res.status(400).json({ error: 'departamento, ano e trimestre são obrigatórios.' });
            }
            const [gestor, salvo, estatisticas] = await Promise.all([
                buscarGestorDepartamento(departamento),
                dbGet(`SELECT * FROM ${tabela} WHERE LOWER(TRIM(departamento)) = LOWER(TRIM(?)) AND ano = ? AND trimestre = ?`, [departamento, ano, trimestre]),
                coletarDadosAnonimosDepto(departamento, ano, trimestre, tipo)
            ]);
            const tabelaComparativaHtml = montarTabelaComparativaHtml(departamento, gestor ? gestor.gestor_nome : null, estatisticas);
            res.json({
                ok: true,
                tipo,
                departamento,
                ano,
                trimestre,
                periodo_label: labelPeriodo(ano, trimestre, tipo),
                gestor,
                relatorio: salvo || null,
                estatisticas,
                tabela_comparativa_html: tabelaComparativaHtml
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/avaliacoes/:tipo/relatorio-ia', authenticateToken, async (req, res) => {
        try {
            const tipo = normTipo(req.params.tipo);
            const tabela = tabelaRelatorioPorTipo(tipo);
            const tituloTipo = tipo === 'desempenho' ? 'Avaliação de Desempenho' : 'Pesquisa de Satisfação';
            const departamento = String(req.body.departamento || '').trim();
            const ano = parseInt(req.body.ano, 10);
            const trimestre = parseInt(req.body.trimestre, 10);
            if (!departamento || !ano || !trimestre) {
                return res.status(400).json({ error: 'departamento, ano e trimestre são obrigatórios.' });
            }

            const est = await coletarDadosAnonimosDepto(departamento, ano, trimestre, tipo);
            if (est.responderam === 0) {
                return res.status(400).json({ error: `Nenhuma avaliação respondida encontrada para o departamento "${departamento}" em ${labelPeriodo(ano, trimestre, tipo)}.` });
            }

            let textoGerado = null;

            if (process.env.GEMINI_API_KEY) {
                try {
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    let availableModels = [];
                    try {
                        const rModels = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
                        if (rModels.ok) {
                            const dModels = await rModels.json();
                            if (dModels && dModels.models) availableModels = dModels.models.map(m => m.name);
                        }
                    } catch (eM) { /* ignore */ }

                    const ordemPreferencia = [
                        'models/gemini-2.5-flash',
                        'models/gemini-flash-latest',
                        'models/gemini-2.0-flash',
                        'models/gemini-pro-latest'
                    ];
                    let candidatos = ordemPreferencia.filter(m => availableModels.includes(m)).map(m => m.replace('models/', ''));
                    if (!candidatos.length && availableModels.length) {
                        candidatos = availableModels
                            .filter(n => n.includes('flash') && !n.includes('tts') && !n.includes('image'))
                            .map(m => m.replace('models/', ''));
                    }
                    if (!candidatos.length) candidatos = ['gemini-2.5-flash', 'gemini-2.0-flash'];

                    const classificarFaixa = (m) => {
                        if (m >= 4.5) return 'VERDE — Ponto Forte (>= 4,5)';
                        if (m >= 4.0) return 'AMARELO — Ponto de Atenção (4,0 a 4,4)';
                        if (m >= 3.0) return 'LARANJA — Atenção Redobrada (3,0 a 3,9)';
                        return 'VERMELHO — Crítico (< 3,0)';
                    };

                    const topicosStr = est.topicos.map(t => `- Tópico "${t.topico}": Classificação [${classificarFaixa(t.media)}]`).join('\n');
                    const histStr = (est.historico && est.historico.topicos || []).map(t => {
                        const serie = (est.historico.periodos || []).map((p, idx) => `${p.label}: ${t.valores[idx] != null ? classificarFaixa(t.valores[idx]) : 'sem dados'}`).join(' -> ');
                        return `- ${t.topico}: ${serie}`;
                    }).join('\n');
                    const perguntasStr = est.perguntas.map(p => `- ${p.pergunta}: Classificação [${classificarFaixa(p.media)}] (${p.qtd_baixas} resposta(s) mais baixas de ${p.qtd_respostas})`).join('\n');
                    const obsStr = est.observacoes.length
                        ? est.observacoes.map((o, i) => `${i + 1}. Contexto [${o.contexto}]: ${o.texto}`).join('\n')
                        : 'Nenhuma observação escrita adicional foi registrada.';

                    const prompt = `Você é um Consultor Executivo Sênior de Recursos Humanos, Clima e Desenvolvimento Organizacional.
Analise os resultados da ${tituloTipo} do departamento "${departamento}" referente ao período "${labelPeriodo(ano, trimestre, tipo)}" e elabore uma análise consultiva, profunda e interpretativa para o Gestor do Departamento e para o planejamento de treinamentos.

DIRETRIZES OBRIGATÓRIAS E INEGOCIÁVEIS:
1. NÃO ESCREVA AS NOTAS NUMÉRICAS NO TEXTO: O gestor já receberá a tabela visual com os números ao lado deste texto. Portanto, NÃO cite números de médias (como "média 4.5", "nota 3.4/5", etc.) no texto escrito. Foque 100% na leitura qualitativa, comportamental e gerencial.
2. NÃO TRANSCREVA NEM MENCIONE O TEXTO LITERAL DAS OBSERVAÇÕES: Jamais copie frases entre aspas, não exponha nomes de colaboradores e não seja direto a ponto de reproduzir o comentário literal. Leia as observações escritas, compreenda o contexto por trás delas e transforme-as em uma análise profissional e indireta sobre a equipe, os processos, as competências ou a gestão da área.
3. CLASSIFICAÇÃO DE ATENÇÃO OBRIGATÓRIA:
   - Tudo que estiver em VERDE (acima de 4,5) deve ser interpretado como Ponto Forte consolidado.
   - Tudo que estiver em AMARELO (abaixo de 4,5 até 4,0) é um PONTO DE ATENÇÃO.
   - Tudo que estiver em LARANJA (abaixo de 4,0 até 3,0) é ATENÇÃO REDOBRADA.
   - Tudo que estiver em VERMELHO (abaixo de 3,0) é CRÍTICO.
4. FORMATAÇÃO: Escreva em português natural (letras maiúsculas e minúsculas normais, NUNCA deixe o texto todo em caixa alta), sem asteriscos (**) e sem hashtags (#).

ESTRUTURE O TEXTO EXATAMENTE NESTES 3 BLOCOS:
1. Pontos Fortes do Departamento
(Análise interpretativa e aprofundada dos pilares em faixa verde e dos aspectos que demonstram maturidade, engajamento, competência técnica ou evolução positiva em relação às avaliações anteriores)

2. Pontos de Melhoria e Níveis de Atenção
(Análise detalhada separando claramente o que requer Ponto de Atenção [faixa amarela], o que exige Atenção Redobrada [faixa laranja] e o que está Crítico [faixa vermelha], além de apontar se houve queda ou melhora frente aos ciclos anteriores e o impacto prático no setor)

3. Informações Importantes, Desenvolvimento de Equipe e Recomendações para a Gestão
(Análise indireta, consultiva e inteligente das percepções extraídas das respostas e das observações escritas — sem mencionar o texto literal que foi colocado — destacando quais temas de treinamento/desenvolvimento seriam mais valiosos para essa equipe e orientações práticas para o gestor)

DADOS PARA SUA ANÁLISE INTERNA (NÃO REPRODUZA OS NÚMEROS NEM OS TEXTOS LITERAIS):
CLASSIFICAÇÃO DOS TÓPICOS NO PERÍODO ATUAL:
${topicosStr}

HISTÓRICO ENTRE PERÍODOS:
${histStr}

DETALHAMENTO POR PERGUNTA:
${perguntasStr}

OBSERVAÇÕES REGISTRADAS (INTERPRETE O SENTIDO SEM CITAR LITERALMENTE):
${obsStr}`;

                    for (const modelName of candidatos) {
                        try {
                            const model = genAI.getGenerativeModel({ model: modelName });
                            const result = await model.generateContent(prompt);
                            const response = await result.response;
                            const text = response.text();
                            if (text && text.trim()) {
                                textoGerado = text.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
                                break;
                            }
                        } catch (errModel) {
                            console.warn(`[Avaliacao IA - ${tipo}] Falha no modelo ${modelName}:`, errModel.message);
                        }
                    }
                } catch (errGemini) {
                    console.warn(`[Avaliacao IA - ${tipo}] Erro Gemini, usando análise estruturada:`, errGemini.message);
                }
            }

            if (!textoGerado) {
                textoGerado = gerarRelatorioFallbackEstruturado(departamento, ano, trimestre, est, tipo);
            }

            await dbRun(
                `INSERT INTO ${tabela} (departamento, ano, trimestre, relatorio_texto, resumo_json, updated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(departamento, ano, trimestre)
                 DO UPDATE SET relatorio_texto = excluded.relatorio_texto, resumo_json = excluded.resumo_json, updated_at = CURRENT_TIMESTAMP`,
                [departamento, ano, trimestre, textoGerado, JSON.stringify(est)]
            );

            const salvo = await dbGet(`SELECT * FROM ${tabela} WHERE LOWER(TRIM(departamento)) = LOWER(TRIM(?)) AND ano = ? AND trimestre = ?`, [departamento, ano, trimestre]);
            const gestor = await buscarGestorDepartamento(departamento);
            const tabelaComparativaHtml = montarTabelaComparativaHtml(departamento, gestor ? gestor.gestor_nome : null, est);

            res.json({
                ok: true,
                tipo,
                relatorio: salvo,
                relatorio_texto: textoGerado,
                estatisticas: est,
                gestor,
                tabela_comparativa_html: tabelaComparativaHtml
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.put('/api/avaliacoes/:tipo/relatorio-ia', authenticateToken, async (req, res) => {
        try {
            const tipo = normTipo(req.params.tipo);
            const tabela = tabelaRelatorioPorTipo(tipo);
            const departamento = String(req.body.departamento || '').trim();
            const ano = parseInt(req.body.ano, 10);
            const trimestre = parseInt(req.body.trimestre, 10);
            const relatorio_texto = String(req.body.relatorio_texto || '').trim();
            if (!departamento || !ano || !trimestre || !relatorio_texto) {
                return res.status(400).json({ error: 'Preencha o texto do relatório.' });
            }
            const est = await coletarDadosAnonimosDepto(departamento, ano, trimestre, tipo);
            await dbRun(
                `INSERT INTO ${tabela} (departamento, ano, trimestre, relatorio_texto, resumo_json, updated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(departamento, ano, trimestre)
                 DO UPDATE SET relatorio_texto = excluded.relatorio_texto, resumo_json = excluded.resumo_json, updated_at = CURRENT_TIMESTAMP`,
                [departamento, ano, trimestre, relatorio_texto, JSON.stringify(est)]
            );
            res.json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/avaliacoes/:tipo/enviar-gestor', authenticateToken, async (req, res) => {
        try {
            const tipo = normTipo(req.params.tipo);
            const tabela = tabelaRelatorioPorTipo(tipo);
            const tituloTipo = tipo === 'desempenho' ? 'Avaliação de Desempenho' : 'Pesquisa de Satisfação';
            const subNotif = tipo === 'desempenho' ? 'avaliacao_desempenho' : 'pesquisa_satisfacao';
            const departamento = String(req.body.departamento || '').trim();
            const ano = parseInt(req.body.ano, 10);
            const trimestre = parseInt(req.body.trimestre, 10);
            const relatorio_texto = String(req.body.relatorio_texto || '').trim();
            const emailInput = String(req.body.email_destino || '').trim();

            if (!departamento || !ano || !trimestre || !relatorio_texto) {
                return res.status(400).json({ error: 'Gere o relatório do departamento antes de enviar ao gestor.' });
            }

            const gestor = await buscarGestorDepartamento(departamento);
            const emailDestino = emailInput || (gestor && gestor.gestor_email) || '';
            if (!emailDestino || !emailDestino.includes('@')) {
                return res.status(400).json({ error: 'Informe um e-mail válido do gestor do departamento para enviar o relatório.' });
            }

            const est = await coletarDadosAnonimosDepto(departamento, ano, trimestre, tipo);
            const perStr = labelPeriodo(ano, trimestre, tipo);

            await dbRun(
                `INSERT INTO ${tabela} (departamento, ano, trimestre, relatorio_texto, resumo_json, enviado_gestor_em, enviado_para_email, updated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(departamento, ano, trimestre)
                 DO UPDATE SET relatorio_texto = excluded.relatorio_texto, resumo_json = excluded.resumo_json,
                               enviado_gestor_em = CURRENT_TIMESTAMP, enviado_para_email = excluded.enviado_para_email, updated_at = CURRENT_TIMESTAMP`,
                [departamento, ano, trimestre, relatorio_texto, JSON.stringify(est), emailDestino]
            );

            const tabelaComparativaHtml = montarTabelaComparativaHtml(departamento, gestor ? gestor.gestor_nome : null, est);

            const relatorioHtml = relatorio_texto
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');

            const destinatariosLista = emailDestino
                .split(/[;,]+/)
                .map(s => s.trim())
                .filter(s => s && s.includes('@'));
            const toFormatado = destinatariosLista.join(', ');

            const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
            const temLogo = fs.existsSync(logoPath);
            const htmlEmail = `<div style="font-family:Arial,sans-serif;max-width:740px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;">
                ${temLogo ? `<div style="text-align:center;background:#fff;border-bottom:1px solid #eee;">
                    <img src="cid:empresa-logo" alt="América Rental" style="width:100%;max-width:740px;height:auto;display:block;">
                </div>` : ''}
                <div style="padding:24px 28px;">
                    <div style="background:#7c3aed;color:#fff;padding:16px 20px;border-radius:10px;margin-bottom:20px;">
                        <h2 style="margin:0;font-size:1.25rem;">Relatório de ${tituloTipo} — ${departamento}</h2>
                        <div style="font-size:0.9rem;opacity:0.9;margin-top:4px;">Período de Referência: ${perStr} · Histórico Comparativo e Análise Consolidada</div>
                    </div>
                    <p style="color:#334155;font-size:0.95rem;">Olá${gestor && gestor.gestor_nome ? `, <strong>${gestor.gestor_nome}</strong>` : ''},</p>
                    <p style="color:#475569;font-size:0.92rem;line-height:1.5;">
                        Compartilhamos abaixo o quadro comparativo de evolução da <strong>${tituloTipo}</strong> do departamento <strong>${departamento}</strong> (com as médias por tópico e setas de tendência em relação às avaliações anteriores), seguido da análise executiva de pontos fortes, pontos de melhoria e recomendações para a gestão.
                    </p>
                    ${tabelaComparativaHtml}
                    <h3 style="font-size:0.98rem;color:#1e293b;margin:22px 0 8px;">Análise Consolidada do Departamento</h3>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #7c3aed;border-radius:8px;padding:18px;color:#1e293b;font-size:0.92rem;line-height:1.65;">
                        ${relatorioHtml}
                    </div>
                    <p style="font-size:0.78rem;color:#94a3b8;margin-top:20px;text-align:center;">
                        Nota: Este relatório consolida os indicadores do departamento de forma confidencial, sem identificação individual de colaboradores.
                    </p>
                </div>
            </div>`;

            const mailInfo = await sendMailHelper({
                to: toFormatado,
                subject: `Relatório de ${tituloTipo} — Depto. ${departamento} (${perStr})`,
                html: htmlEmail,
                attachments: temLogo ? [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }] : []
            });
            console.log(`[RELATORIO-IA] E-mail de ${tituloTipo} (${departamento} - ${perStr}) enviado para ${toFormatado} | MsgId: ${mailInfo && mailInfo.messageId}`);

            if (gestor && gestor.usuario_id) {
                const msgNotif = `📊 O Relatório de ${tituloTipo} do departamento <strong>${departamento}</strong> (${perStr}) foi enviado para seu e-mail (${emailDestino}). Média do setor: <strong>${est.media_geral != null ? est.media_geral.toFixed(1) : '—'}/5</strong>.`;
                await dbRun(
                    `INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)`,
                    [gestor.usuario_id, subNotif, msgNotif, JSON.stringify({ departamento, ano, trimestre, media_geral: est.media_geral })]
                ).catch(() => {});
            }

            res.json({ ok: true, enviado_para: emailDestino, gestor_nome: gestor ? gestor.gestor_nome : null });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // GET /api/avaliacoes/diagnostico-departamentos — Usado na UniAmérica (Gestão de Cursos) para ver as análises de Satisfação + Desempenho por departamento
    app.get('/api/avaliacoes/diagnostico-departamentos', authenticateToken, async (req, res) => {
        try {
            const deptosColabs = await dbAll(`SELECT DISTINCT TRIM(COALESCE(departamento, 'Sem Departamento')) AS departamento FROM colaboradores WHERE status != 'Desligado'`);
            const deptosSet = new Set(deptosColabs.map(d => d.departamento || 'Sem Departamento').filter(Boolean));
            const departamentos = Array.from(deptosSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

            const [ultSat, ultDes, relsSat, relsDes] = await Promise.all([
                dbGet(`SELECT ano, trimestre FROM avaliacoes WHERE tipo = 'satisfacao' ORDER BY ano DESC, trimestre DESC LIMIT 1`),
                dbGet(`SELECT ano, trimestre FROM avaliacoes WHERE tipo = 'desempenho' ORDER BY ano DESC, trimestre DESC LIMIT 1`),
                dbAll(`SELECT * FROM satisfacao_relatorios_ia ORDER BY ano DESC, trimestre DESC, updated_at DESC`),
                dbAll(`SELECT * FROM desempenho_relatorios_ia ORDER BY ano DESC, trimestre DESC, updated_at DESC`)
            ]);

            const resultado = [];
            for (const dep of departamentos) {
                const [estSat, estDes, gestor] = await Promise.all([
                    ultSat ? coletarDadosAnonimosDepto(dep, ultSat.ano, ultSat.trimestre, 'satisfacao') : Promise.resolve(null),
                    ultDes ? coletarDadosAnonimosDepto(dep, ultDes.ano, ultDes.trimestre, 'desempenho') : Promise.resolve(null),
                    buscarGestorDepartamento(dep)
                ]);

                const relSat = relsSat.find(r => r.departamento.trim().toLowerCase() === dep.trim().toLowerCase()) || null;
                const relDes = relsDes.find(r => r.departamento.trim().toLowerCase() === dep.trim().toLowerCase()) || null;

                // Identificar tópicos prioritários para cursos (< 4.5 em satisfação ou desempenho)
                const alertas = [];
                if (estSat && estSat.topicos) {
                    estSat.topicos.filter(t => t.media < 4.5).forEach(t => {
                        alertas.push({ origem: 'Satisfação', topico: t.topico, media: t.media, nivel: t.nivel });
                    });
                }
                if (estDes && estDes.topicos) {
                    estDes.topicos.filter(t => t.media < 4.5).forEach(t => {
                        alertas.push({ origem: 'Desempenho', topico: t.topico, media: t.media, nivel: t.nivel });
                    });
                }
                alertas.sort((a, b) => a.media - b.media);

                resultado.push({
                    departamento: dep,
                    gestor_nome: gestor ? gestor.gestor_nome : null,
                    satisfacao: estSat ? {
                        periodo_label: labelPeriodo(ultSat.ano, ultSat.trimestre, 'satisfacao'),
                        ano: ultSat.ano,
                        trimestre: ultSat.trimestre,
                        responderam: estSat.responderam,
                        total_colaboradores: estSat.total_colaboradores,
                        media_geral: estSat.media_geral,
                        topicos: estSat.topicos,
                        relatorio_texto: relSat ? relSat.relatorio_texto : null,
                        relatorio_updated_at: relSat ? relSat.updated_at : null
                    } : null,
                    desempenho: estDes ? {
                        periodo_label: labelPeriodo(ultDes.ano, ultDes.trimestre, 'desempenho'),
                        ano: ultDes.ano,
                        trimestre: ultDes.trimestre,
                        responderam: estDes.responderam,
                        total_colaboradores: estDes.total_colaboradores,
                        media_geral: estDes.media_geral,
                        topicos: estDes.topicos,
                        relatorio_texto: relDes ? relDes.relatorio_texto : null,
                        relatorio_updated_at: relDes ? relDes.updated_at : null
                    } : null,
                    alertas_treinamento: alertas
                });
            }

            res.json({ ok: true, departamentos: resultado });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
};
