// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: RELATÓRIO IA POR DEPARTAMENTO E ENVIO AO GESTOR — PESQUISA DE SATISFAÇÃO
// Arquivo: backend/routes_satisfacao_ia.js
// ═══════════════════════════════════════════════════════════════════════════════
'use strict';

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

    const MES_TRIM = { 1: 'Fevereiro', 2: 'Maio', 3: 'Agosto', 4: 'Novembro' };
    const labelPeriodo = (ano, trim) => `${MES_TRIM[trim] || ('T' + trim)} (${trim}º Trim. ${ano})`;

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

    // Coleta estatísticas e observações 100% ANÔNIMAS do departamento no período
    async function coletarDadosAnonimosDepto(departamento, ano, trimestre) {
        const colabsDepto = await dbAll(
            `SELECT id, nome_completo, cargo, departamento
             FROM colaboradores
             WHERE status != 'Desligado'
               AND LOWER(TRIM(COALESCE(departamento, 'Sem Departamento'))) = LOWER(TRIM(?))`,
            [departamento]
        );
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

        const rows = await dbAll(
            `SELECT a.respostas_json, c.cargo
             FROM avaliacoes a
             JOIN colaboradores c ON c.id = a.colaborador_id
             WHERE a.tipo = 'satisfacao'
               AND a.ano = ?
               AND a.trimestre = ?
               AND LOWER(TRIM(COALESCE(c.departamento, 'Sem Departamento'))) = LOWER(TRIM(?))`,
            [Number(ano), Number(trimestre), departamento]
        );

        // Carregar templates do banco para mapear índice da pergunta -> texto da pergunta
        const templatesRows = await dbAll(`SELECT grupo_key, categorias_json FROM avaliacao_templates WHERE LOWER(tipo) = 'satisfacao'`).catch(() => []);
        const templatesMap = {};
        templatesRows.forEach(t => {
            try {
                const cats = JSON.parse(t.categorias_json || '{}');
                String(t.grupo_key || '').split(',').map(k => k.trim()).filter(Boolean).forEach(k => {
                    templatesMap[k] = cats;
                });
            } catch (e) { /* ignore */ }
        });

        const topicosNotas = {};      // { topico: [notas] }
        const perguntasNotas = {};    // { "Topico — Pergunta": [notas] }
        const observacoesAnonimas = []; // [{ contexto, texto }]

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

            // Formato legado { scores: { Topico: media } }
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

            // Extrair observações por pergunta e observação geral (100% sem nomes)
            if (resp.__obs__ && typeof resp.__obs__ === 'object') {
                Object.entries(resp.__obs__).forEach(([topico, obsMap]) => {
                    if (topico === 'info_adicional' && typeof obsMap === 'string' && obsMap.trim()) {
                        observacoesAnonimas.push({ contexto: 'Observação Geral', texto: anonimizarTexto(obsMap) });
                        return;
                    }
                    if (typeof obsMap === 'object' && obsMap !== null) {
                        Object.entries(obsMap).forEach(([idxStr, txtObs]) => {
                            if (txtObs && String(txtObs).trim()) {
                                const idx = parseInt(idxStr, 10);
                                const qTxt = snapCats && snapCats[topico] && !isNaN(idx) && snapCats[topico][idx] ? snapCats[topico][idx] : topico;
                                const notaDada = resp[topico] ? (resp[topico][idxStr] ?? resp[topico][idx] ?? null) : null;
                                observacoesAnonimas.push({
                                    contexto: `${topico}${qTxt !== topico ? ' (' + qTxt + ')' : ''}${notaDada ? ' [Nota ' + notaDada + '/5]' : ''}`,
                                    texto: anonimizarTexto(txtObs)
                                });
                            }
                        });
                    }
                });
            }
            if (resp.__obs_gerais__ && String(resp.__obs_gerais__).trim()) {
                const ja = observacoesAnonimas.some(o => o.texto === anonimizarTexto(resp.__obs_gerais__));
                if (!ja) observacoesAnonimas.push({ contexto: 'Observação Geral', texto: anonimizarTexto(resp.__obs_gerais__) });
            }
        });

        const resumoTopicos = Object.entries(topicosNotas).map(([topico, arr]) => {
            const media = arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;
            return { topico, media, qtd_notas: arr.length };
        }).filter(t => t.media !== null).sort((a, b) => b.media - a.media);

        const resumoPerguntas = Object.entries(perguntasNotas).map(([pergunta, arr]) => {
            const media = arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null;
            const qtdBaixas = arr.filter(n => n <= 3).length;
            return { pergunta, media, qtd_respostas: arr.length, qtd_baixas: qtdBaixas };
        }).filter(p => p.media !== null).sort((a, b) => a.media - b.media);

        const todasMediasTopicos = resumoTopicos.map(t => t.media);
        const mediaGeral = todasMediasTopicos.length
            ? parseFloat((todasMediasTopicos.reduce((a, b) => a + b, 0) / todasMediasTopicos.length).toFixed(2))
            : null;

        return {
            total_colaboradores: colabsDepto.length,
            responderam: rows.length,
            media_geral: mediaGeral,
            topicos: resumoTopicos,
            perguntas: resumoPerguntas,
            observacoes: observacoesAnonimas
        };
    }

    function gerarRelatorioFallbackEstruturado(departamento, ano, trimestre, est) {
        const fortes = est.topicos.filter(t => t.media >= 4.0);
        const fracos = est.topicos.filter(t => t.media < 4.0);
        const pergCriticas = est.perguntas.filter(p => p.media < 3.8 || p.qtd_baixas > 0).slice(0, 6);

        let linhas = [];
        linhas.push(`1. Visão Geral do Departamento (${departamento} — ${labelPeriodo(ano, trimestre)})`);
        linhas.push(`Na pesquisa de satisfação referente a ${labelPeriodo(ano, trimestre)}, o departamento ${departamento} contou com a participação de ${est.responderam} de ${est.total_colaboradores} colaborador(es), alcançando média geral de satisfação de ${est.media_geral != null ? est.media_geral.toFixed(2) : '—'} em uma escala de 1 a 5.`);
        linhas.push('');
        linhas.push('2. Pontos Fortes Identificados');
        if (fortes.length) {
            fortes.forEach(f => {
                linhas.push(`• ${f.topico} (Média ${f.media.toFixed(2)}/5): percepção positiva da equipe quanto a este pilar.`);
            });
        } else {
            linhas.push('• Nenhum tópico atingiu média igual ou superior a 4.0 neste ciclo, indicando oportunidade de fortalecimento geral das práticas da área.');
        }
        linhas.push('');
        linhas.push('3. Pontos Fracos e Oportunidades de Melhoria');
        if (fracos.length) {
            fracos.forEach(f => {
                linhas.push(`• ${f.topico} (Média ${f.media.toFixed(2)}/5): requer acompanhamento próximo da gestão para elevação do nível de satisfação.`);
            });
        } else if (pergCriticas.length) {
            pergCriticas.forEach(p => {
                linhas.push(`• ${p.pergunta} (Média ${p.media.toFixed(2)}/5): apresentou avaliações abaixo do ideal entre parte dos respondentes.`);
            });
        } else {
            linhas.push('• Todos os tópicos mantiveram médias acima de 4.0. Recomenda-se manter a consistência e o diálogo aberto com a equipe.');
        }
        linhas.push('');
        linhas.push('4. Pontos de Atenção Importantes e Síntese das Observações (Anônimo)');
        if (est.observacoes.length) {
            linhas.push(`Foram registrados ${est.observacoes.length} apontamento(s) qualitativo(s) pela equipe (preservando o anonimato dos participantes):`);
            est.observacoes.forEach(o => {
                linhas.push(`• [${o.contexto}]: "${o.texto}"`);
            });
        } else {
            linhas.push('• Não houve observações escritas adicionais neste período. Recomenda-se realizar roda de conversa com o setor para aprofundar os indicadores numéricos.');
        }
        return linhas.join('\n');
    }

    // GET /api/avaliacoes/satisfacao/relatorio-ia
    app.get('/api/avaliacoes/satisfacao/relatorio-ia', authenticateToken, async (req, res) => {
        try {
            const departamento = String(req.query.departamento || '').trim();
            const ano = parseInt(req.query.ano, 10);
            const trimestre = parseInt(req.query.trimestre, 10);
            if (!departamento || !ano || !trimestre) {
                return res.status(400).json({ error: 'departamento, ano e trimestre são obrigatórios.' });
            }
            const [gestor, salvo, estatisticas] = await Promise.all([
                buscarGestorDepartamento(departamento),
                dbGet(`SELECT * FROM satisfacao_relatorios_ia WHERE LOWER(TRIM(departamento)) = LOWER(TRIM(?)) AND ano = ? AND trimestre = ?`, [departamento, ano, trimestre]),
                coletarDadosAnonimosDepto(departamento, ano, trimestre)
            ]);
            res.json({
                ok: true,
                departamento,
                ano,
                trimestre,
                periodo_label: labelPeriodo(ano, trimestre),
                gestor,
                relatorio: salvo || null,
                estatisticas
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // POST /api/avaliacoes/satisfacao/relatorio-ia — Gera análise anônima via Gemini IA
    app.post('/api/avaliacoes/satisfacao/relatorio-ia', authenticateToken, async (req, res) => {
        try {
            const departamento = String(req.body.departamento || '').trim();
            const ano = parseInt(req.body.ano, 10);
            const trimestre = parseInt(req.body.trimestre, 10);
            if (!departamento || !ano || !trimestre) {
                return res.status(400).json({ error: 'departamento, ano e trimestre são obrigatórios.' });
            }

            const est = await coletarDadosAnonimosDepto(departamento, ano, trimestre);
            if (est.responderam === 0) {
                return res.status(400).json({ error: `Nenhuma pesquisa respondida encontrada para o departamento "${departamento}" em ${labelPeriodo(ano, trimestre)}.` });
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

                    const topicosStr = est.topicos.map(t => `- Tópico "${t.topico}": Média ${t.media.toFixed(2)}/5`).join('\n');
                    const perguntasStr = est.perguntas.map(p => `- ${p.pergunta}: Média ${p.media.toFixed(2)}/5 (${p.qtd_baixas} nota(s) <= 3 de ${p.qtd_respostas} respostas)`).join('\n');
                    const obsStr = est.observacoes.length
                        ? est.observacoes.map((o, i) => `${i + 1}. [${o.contexto}]: "${o.texto}"`).join('\n')
                        : 'Nenhuma observação escrita adicional foi registrada pelos colaboradores.';

                    const prompt = `Você é um Consultor Sênior de Recursos Humanos e Clima Organizacional.
Analise os resultados consolidados da Pesquisa de Satisfação do departamento "${departamento}" referente ao período "${labelPeriodo(ano, trimestre)}" e elabore um relatório executivo claro, objetivo e construtivo para ser entregue ao Gestor do Departamento.

REGRA ABSOLUTA DE ANONIMATO (OBRIGATÓRIA):
- NUNCA mencione o nome de nenhum colaborador e jamais tente identificar quem deu determinada nota ou escreveu determinada observação.
- Refira-se sempre no coletivo ou de forma impessoal ("a equipe apontou", "observou-se nos relatos do departamento", "os indicadores mostram").
- Não utilize formatação Markdown com asteriscos (**) ou hashtags (#). Escreva o texto em português natural (com letras maiúsculas e minúsculas normais, NUNCA tudo em caixa alta) e use marcadores simples com "•".

ESTRUTURA OBRIGATÓRIA DO RELATÓRIO:
1. Visão Geral da Satisfação do Departamento
(Síntese da adesão: ${est.responderam} de ${est.total_colaboradores} colaboradores responderam, média geral de ${est.media_geral != null ? est.media_geral.toFixed(2) : '—'}/5 e leitura geral do clima da área)

2. Pontos Fortes
(Levantamento dos tópicos e perguntas mais bem avaliados pela equipe e aspectos positivos destacados nas observações)

3. Pontos Fracos e Oportunidades de Melhoria
(Levantamento objetivo dos tópicos e critérios com menores médias ou maior incidência de notas baixas <= 3)

4. Pontos de Atenção Importantes e Recomendações para a Gestão
(Análise cuidadosa das observações abertas registradas pelos colaboradores e recomendações práticas de liderança para o gestor atuar no próximo trimestre)

DADOS CONSOLIDADOS DO DEPARTAMENTO "${departamento}":
- Total de colaboradores ativos no setor: ${est.total_colaboradores}
- Colaboradores que responderam: ${est.responderam}
- Média geral do departamento: ${est.media_geral != null ? est.media_geral.toFixed(2) : '—'} / 5.00

MÉDIAS POR TÓPICO:
${topicosStr}

DETALHAMENTO POR PERGUNTA (da menor média para a maior):
${perguntasStr}

OBSERVAÇÕES ANÔNIMAS REGISTRADAS PELOS COLABORADORES:
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
                            console.warn(`[Satisfacao IA] Falha no modelo ${modelName}:`, errModel.message);
                        }
                    }
                } catch (errGemini) {
                    console.warn('[Satisfacao IA] Erro Gemini, usando síntese estruturada:', errGemini.message);
                }
            }

            if (!textoGerado) {
                textoGerado = gerarRelatorioFallbackEstruturado(departamento, ano, trimestre, est);
            }

            await dbRun(
                `INSERT INTO satisfacao_relatorios_ia (departamento, ano, trimestre, relatorio_texto, resumo_json, updated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(departamento, ano, trimestre)
                 DO UPDATE SET relatorio_texto = excluded.relatorio_texto, resumo_json = excluded.resumo_json, updated_at = CURRENT_TIMESTAMP`,
                [departamento, ano, trimestre, textoGerado, JSON.stringify(est)]
            );

            const salvo = await dbGet(`SELECT * FROM satisfacao_relatorios_ia WHERE LOWER(TRIM(departamento)) = LOWER(TRIM(?)) AND ano = ? AND trimestre = ?`, [departamento, ano, trimestre]);
            const gestor = await buscarGestorDepartamento(departamento);

            res.json({
                ok: true,
                relatorio: salvo,
                relatorio_texto: textoGerado,
                estatisticas: est,
                gestor
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // PUT /api/avaliacoes/satisfacao/relatorio-ia — Salvar edição manual do relatório antes de enviar
    app.put('/api/avaliacoes/satisfacao/relatorio-ia', authenticateToken, async (req, res) => {
        try {
            const departamento = String(req.body.departamento || '').trim();
            const ano = parseInt(req.body.ano, 10);
            const trimestre = parseInt(req.body.trimestre, 10);
            const relatorio_texto = String(req.body.relatorio_texto || '').trim();
            if (!departamento || !ano || !trimestre || !relatorio_texto) {
                return res.status(400).json({ error: 'Preencha o texto do relatório.' });
            }
            const est = await coletarDadosAnonimosDepto(departamento, ano, trimestre);
            await dbRun(
                `INSERT INTO satisfacao_relatorios_ia (departamento, ano, trimestre, relatorio_texto, resumo_json, updated_at)
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

    // POST /api/avaliacoes/satisfacao/enviar-gestor — Envia avaliação por e-mail e notificação interna ao Gestor do Departamento
    app.post('/api/avaliacoes/satisfacao/enviar-gestor', authenticateToken, async (req, res) => {
        try {
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

            const est = await coletarDadosAnonimosDepto(departamento, ano, trimestre);
            const perStr = labelPeriodo(ano, trimestre);

            // Salvar versão enviada no banco
            await dbRun(
                `INSERT INTO satisfacao_relatorios_ia (departamento, ano, trimestre, relatorio_texto, resumo_json, enviado_gestor_em, enviado_para_email, updated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(departamento, ano, trimestre)
                 DO UPDATE SET relatorio_texto = excluded.relatorio_texto, resumo_json = excluded.resumo_json,
                               enviado_gestor_em = CURRENT_TIMESTAMP, enviado_para_email = excluded.enviado_para_email, updated_at = CURRENT_TIMESTAMP`,
                [departamento, ano, trimestre, relatorio_texto, JSON.stringify(est), emailDestino]
            );

            // Montar linhas da tabela de tópicos (sem nomes de colaboradores)
            const topicosHtml = est.topicos.map(t => {
                const cor = t.media >= 4 ? '#16a34a' : (t.media >= 3 ? '#d97706' : '#dc2626');
                return `<tr>
                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-weight:600;">${t.topico}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;color:${cor};">${t.media.toFixed(2)} / 5.0</td>
                </tr>`;
            }).join('');

            const relatorioHtml = relatorio_texto
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');

            const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
            const htmlEmail = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#ffffff;">
                <div style="text-align:center;background:#fff;border-bottom:1px solid #eee;">
                    <img src="cid:empresa-logo" alt="América Rental" style="width:100%;max-width:680px;height:auto;display:block;">
                </div>
                <div style="padding:24px 28px;">
                    <div style="background:#7c3aed;color:#fff;padding:16px 20px;border-radius:10px;margin-bottom:20px;">
                        <h2 style="margin:0;font-size:1.25rem;">Relatório de Satisfação do Departamento — ${departamento}</h2>
                        <div style="font-size:0.9rem;opacity:0.9;margin-top:4px;">Período: ${perStr} · Resultados Consolidados e Anônimos</div>
                    </div>
                    <p style="color:#334155;font-size:0.95rem;">Olá${gestor && gestor.gestor_nome ? `, <strong>${gestor.gestor_nome}</strong>` : ''},</p>
                    <p style="color:#475569;font-size:0.92rem;line-height:1.5;">
                        Compartilhamos abaixo o consolidado da <strong>Pesquisa de Satisfação</strong> do departamento <strong>${departamento}</strong> referente a <strong>${perStr}</strong>, acompanhado do levantamento analítico de pontos fortes, pontos de melhoria e pontos de atenção.
                    </p>
                    <div style="display:flex;gap:12px;margin:16px 0;background:#f8fafc;padding:14px;border-radius:8px;border:1px solid #e2e8f0;">
                        <div style="flex:1;text-align:center;">
                            <div style="font-size:0.75rem;color:#64748b;text-transform:uppercase;font-weight:700;">Adesão do Setor</div>
                            <div style="font-size:1.35rem;font-weight:800;color:#7c3aed;">${est.responderam}/${est.total_colaboradores}</div>
                        </div>
                        <div style="flex:1;text-align:center;">
                            <div style="font-size:0.75rem;color:#64748b;text-transform:uppercase;font-weight:700;">Média Geral do Setor</div>
                            <div style="font-size:1.35rem;font-weight:800;color:#16a34a;">${est.media_geral != null ? est.media_geral.toFixed(2) : '—'} / 5.0</div>
                        </div>
                    </div>
                    ${topicosHtml ? `
                    <h3 style="font-size:0.95rem;color:#1e293b;margin:20px 0 8px;">Médias por Tópico (${perStr})</h3>
                    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:0.88rem;margin-bottom:20px;">
                        <thead>
                            <tr style="background:#f1f5f9;">
                                <th style="padding:8px 12px;text-align:left;color:#475569;">Tópico Avaliado</th>
                                <th style="padding:8px 12px;text-align:center;color:#475569;">Média do Departamento</th>
                            </tr>
                        </thead>
                        <tbody>${topicosHtml}</tbody>
                    </table>` : ''}
                    <h3 style="font-size:0.95rem;color:#1e293b;margin:20px 0 8px;">Análise Consolidada (Pontos Fortes, Fracos e Pontos de Atenção)</h3>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #7c3aed;border-radius:8px;padding:16px;color:#1e293b;font-size:0.9rem;line-height:1.6;">
                        ${relatorioHtml}
                    </div>
                    <p style="font-size:0.78rem;color:#94a3b8;margin-top:20px;text-align:center;">
                        Nota: Em respeito à confidencialidade da Pesquisa de Satisfação, este relatório consolida as percepções do departamento de forma 100% anônima, sem identificação individual de colaboradores.
                    </p>
                </div>
            </div>`;

            await sendMailHelper({
                to: emailDestino,
                subject: `Relatório de Satisfação — Depto. ${departamento} (${perStr})`,
                html: htmlEmail,
                attachments: [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }]
            });

            // Também criar notificação interna no sistema para o gestor, se tiver usuário vinculado
            if (gestor && gestor.usuario_id) {
                const msgNotif = `📊 O Relatório da Pesquisa de Satisfação do departamento <strong>${departamento}</strong> (${perStr}) foi gerado e enviado para seu e-mail (${emailDestino}). Média do setor: <strong>${est.media_geral != null ? est.media_geral.toFixed(2) : '—'}/5</strong>.`;
                await dbRun(
                    `INSERT INTO notificacoes_usuarios (usuario_id, tipo, mensagem, dados) VALUES (?, ?, ?, ?)`,
                    [gestor.usuario_id, 'pesquisa_satisfacao', msgNotif, JSON.stringify({ departamento, ano, trimestre, media_geral: est.media_geral })]
                ).catch(() => {});
            }

            res.json({ ok: true, enviado_para: emailDestino, gestor_nome: gestor ? gestor.gestor_nome : null });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
};
