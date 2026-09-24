// routes_comercial_comissao.js — Comissão Comercial America Rental
'use strict';

const XLSX = require('xlsx');
const r2 = require('./utils/r2');
const path = require('path');
const nodemailer = require('nodemailer');

const MOTIVOS_ESTORNO = {
    '01': 'CONTRATO',        '1': 'CONTRATO',
    '02': 'SEM ASSINATURA',  '2': 'SEM ASSINATURA',
    '03': 'CONTATOS',        '3': 'CONTATOS',
    '04': 'DATAS',           '4': 'DATAS',
    '05': 'ENDERECO',        '5': 'ENDERECO',
    '06': 'VALORES',         '6': 'VALORES',
    '07': 'ERRO PREVENTIVO', '7': 'ERRO PREVENTIVO',
    '08': 'REL. COMISSAO PESSOAL', '8': 'REL. COMISSAO PESSOAL',
};

const ABAS_IGNORAR = ['fechamento comercial', 'fechamento sup', 'sheet1', 'plan1'];


const DEFAULT_METRICAS = [
    { label: 'maxima', qtd: 75, valor: 15, bonus: 375 },
    { label: 'media',  qtd: 55, valor: 12, bonus: 210 },
    { label: 'minima', qtd: 40, valor: 10, bonus: 100 }
];

async function carregarMetricas(db) {
    return new Promise(resolve => {
        db.get("SELECT valor FROM configuracoes_sistema WHERE chave='comissao_metricas'", [], (err, row) => {
            if (row && row.valor) {
                try { resolve(JSON.parse(row.valor)); return; } catch (e) {}
            }
            resolve(DEFAULT_METRICAS);
        });
    });
}

function aplicarMetrica(liquidos, metricas) {
    const mSorted = [...metricas].sort((a, b) => b.qtd - a.qtd);
    for (const m of mSorted) {
        if (liquidos >= m.qtd) return { label: m.label, valor: m.valor, bonus: m.bonus };
    }
    return { label: null, valor: 0, bonus: 0 };
}

function normName(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase();
}
const DEFAULT_METRICAS_GESTOR = {
    minima: { label: 'minima', qtd: 140, valor: 300 },
    media:  { label: 'media',  qtd: 180, valor: 600 },
    alta:   { label: 'alta',   qtd: 200, valor: 800 },
    bonus_equipe_max:   { valor: 250, descricao: 'Todos na meta maxima individual' },
    bonus_meta_equipe:  { valor: 350, qtd: 220, descricao: 'Equipe com 220+ contratos' }
};

async function carregarMetricasGestor(db) {
    return new Promise(resolve => {
        db.get("SELECT valor FROM configuracoes_sistema WHERE chave='comissao_metricas_gestor'", [], (err, row) => {
            if (row && row.valor) {
                try { resolve(JSON.parse(row.valor)); return; } catch (e) {}
            }
            resolve(DEFAULT_METRICAS_GESTOR);
        });
    });
}

function calcularGestor(comissoes, metricasGestor) {
    // Contagem bruta = soma dos brutos de todos os vendedores
    const totalBrutos = comissoes.reduce((s, c) => s + (c.contratos_brutos || 0), 0);

    // Estornos do gestor: todos exceto motivo 7 (ERRO PREVENTIVO)
    let totalEstornosGestor = 0;
    for (const c of comissoes) {
        let estornos = [];
        try { estornos = JSON.parse(c.detalhe_estornos || '[]'); } catch (e) {}
        for (const e of estornos) {
            const cod = String(e.motivo_cod || '').trim();
            if (cod === '07' || cod === '7') continue; // pula erro preventivo
            totalEstornosGestor++;
        }
    }

    const liquidos = Math.max(0, totalBrutos - totalEstornosGestor);

    // Aplicar meta do gestor
    let metaLabel = null;
    let valorMeta = 0;
    const mets = [
        { label: 'alta',   qtd: metricasGestor.alta?.qtd   || 200, valor: metricasGestor.alta?.valor   || 800  },
        { label: 'media',  qtd: metricasGestor.media?.qtd  || 180, valor: metricasGestor.media?.valor  || 600  },
        { label: 'minima', qtd: metricasGestor.minima?.qtd || 140, valor: metricasGestor.minima?.valor || 300  },
    ];
    for (const m of mets) {
        if (liquidos >= m.qtd) { metaLabel = m.label; valorMeta = m.valor; break; }
    }

    // Bônus: todos na meta máxima individual?
    const metMaxIndividualQtd = metricasGestor.bonus_equipe_max?.qtd_individual || 0; // não usado, verificamos via metrica
    const todosNaMaxima = comissoes.length > 0 && comissoes.every(c => c.metrica === 'maxima');
    const bonusEquipe = todosNaMaxima ? (metricasGestor.bonus_equipe_max?.valor || 250) : 0;

    // Bônus: equipe >= 220 contratos líquidos do gestor?
    const qtdBonus = metricasGestor.bonus_meta_equipe?.qtd || 220;
    const bonusMeta220 = liquidos >= qtdBonus ? (metricasGestor.bonus_meta_equipe?.valor || 350) : 0;

    const totalGestor = valorMeta + bonusEquipe + bonusMeta220;

    return {
        contratos_brutos: totalBrutos,
        contratos_estornos_gestor: totalEstornosGestor,
        contratos_liquidos: liquidos,
        meta: metaLabel,
        valor_meta: valorMeta,
        bonus_equipe: bonusEquipe,
        bonus_meta220: bonusMeta220,
        total: totalGestor,
        todos_na_maxima: todosNaMaxima,
        meta_220_atingida: liquidos >= qtdBonus,
    };
}


function parseComissaoAba(ws) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const contratos = [];
    const estornos  = [];

    for (let r = 1; r <= range.e.r; r++) {
        const cellA = ws[XLSX.utils.encode_cell({ r, c: 0 })];
        const valA  = cellA ? String(cellA.v || '').trim().toUpperCase() : '';
        if (valA === 'TOTAL' || valA === 'TOTAIS') break;
        if (!cellA || !valA) continue;

        const cellB = ws[XLSX.utils.encode_cell({ r, c: 1 })];
        const cellC = ws[XLSX.utils.encode_cell({ r, c: 2 })];
        const cellD = ws[XLSX.utils.encode_cell({ r, c: 3 })];

        if (!isNaN(Number(cellA.v))) {
            contratos.push({
                seq:    Number(cellA.v),
                data:   cellB ? (cellB.w || String(cellB.v || '')) : '',
                numero: cellC ? String(cellC.v || '') : '',
                valor:  cellD ? (Number(cellD.v) || 0) : 0,
            });
        }

        const cellF = ws[XLSX.utils.encode_cell({ r, c: 5 })];
        const cellG = ws[XLSX.utils.encode_cell({ r, c: 6 })];
        const cellH = ws[XLSX.utils.encode_cell({ r, c: 7 })];
        const cellI = ws[XLSX.utils.encode_cell({ r, c: 8 })];
        const cellJ = ws[XLSX.utils.encode_cell({ r, c: 9 })];

        const valF = cellF ? String(cellF.v || '').trim().toUpperCase() : '';
        if (cellF && valF && valF !== 'TOTAL' && !isNaN(Number(cellF.v))) {
            const motCod  = cellI ? String(cellI.v || '').trim() : '';
            const motNome = MOTIVOS_ESTORNO[motCod] || ('CODIGO ' + motCod);
            estornos.push({
                seq:         Number(cellF.v),
                data:        cellG ? (cellG.w || String(cellG.v || '')) : '',
                numero:      cellH ? String(cellH.v || '') : '',
                motivo_cod:  motCod,
                motivo_nome: motNome,
                valor:       cellJ ? Math.abs(Number(cellJ.v) || 0) : 0,
            });
        }
    }
    return { contratos, estornos };
}

async function recalcularPrimeiroLugar(db, mes, ano, taxaMap, metricasArr) {
    if (!metricasArr) metricasArr = await carregarMetricas(db);
    const todos = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM comissao_comercial WHERE mes=? AND ano=?',
            [mes, ano], (err, rows) => err ? reject(err) : resolve(rows || []));
    });
    if (!todos.length) return;

    const maxLiq = Math.max(...todos.map(c => c.contratos_liquidos));
    if (maxLiq < 40) return;

    let candidatos = todos.filter(c => c.contratos_liquidos === maxLiq);

    if (candidatos.length > 1) {
        const minEst = Math.min(...candidatos.map(c => c.contratos_estorno));
        candidatos = candidatos.filter(c => c.contratos_estorno === minEst);
    }

    if (candidatos.length > 1 && taxaMap) {
        const getTaxa = (nome) => {
            const pn = normName((nome || '').split(/\s+/)[0]);
            for (const [rep, t] of Object.entries(taxaMap)) {
                if (normName(rep).startsWith(pn))
                    return t.total > 0 ? t.aprovadas / t.total : 0;
            }
            return 0;
        };
        const maxTaxa = Math.max(...candidatos.map(c => getTaxa(c.colaborador_nome)));
        candidatos = candidatos.filter(c => getTaxa(c.colaborador_nome) === maxTaxa);
    }

    // Zerar todos antes
    await new Promise((resolve, reject) => {
        db.run('UPDATE comissao_comercial SET bonus_primeiro=0, liquido=comissao_bruta, primeiro_lugar=0 WHERE mes=? AND ano=?',
            [mes, ano], err => err ? reject(err) : resolve());
    });

    // Dar bonus aos vencedores
    for (const cand of candidatos) {
        const met = aplicarMetrica(cand.contratos_liquidos, metricasArr);
        await new Promise((resolve, reject) => {
            db.run('UPDATE comissao_comercial SET bonus_primeiro=?, liquido=comissao_bruta+?, primeiro_lugar=1, updated_at=CURRENT_TIMESTAMP WHERE mes=? AND ano=? AND colaborador_nome=?',
                [met.bonus, met.bonus, mes, ano, cand.colaborador_nome],
                err => err ? reject(err) : resolve());
        });
    }
}

module.exports = function registerComercialComissaoRoutes(app, db, authenticateToken, multerMemory) {

    // Migrations
    db.run(`CREATE TABLE IF NOT EXISTS comissao_planilhas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        nome_arquivo TEXT,
        r2_key TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(mes, ano, tipo)
    )`, (err) => { if (err && !err.message.includes('already exists')) console.error('[Migration] comissao_planilhas:', err.message); });


    db.run(`CREATE TABLE IF NOT EXISTS comissao_comercial (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mes INTEGER NOT NULL, ano INTEGER NOT NULL,
        colaborador_id INTEGER, colaborador_nome TEXT NOT NULL,
        contratos_brutos INTEGER DEFAULT 0, contratos_estorno INTEGER DEFAULT 0,
        contratos_liquidos INTEGER DEFAULT 0, metrica TEXT,
        valor_unitario REAL DEFAULT 0, comissao_bruta REAL DEFAULT 0,
        bonus_primeiro REAL DEFAULT 0, total_estorno REAL DEFAULT 0,
        liquido REAL DEFAULT 0, primeiro_lugar INTEGER DEFAULT 0,
        detalhe_contratos TEXT DEFAULT '[]', detalhe_estornos TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(mes, ano, colaborador_nome)
    )`, (err) => { if (err && !err.message.includes('already exists')) console.error('[Migration] comissao_comercial:', err.message); });

    db.run(`CREATE TABLE IF NOT EXISTS comissao_propostas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mes INTEGER NOT NULL, ano INTEGER NOT NULL,
        proposta_num TEXT, fase TEXT, motivo TEXT,
        cliente_id TEXT, cliente_nome TEXT, contato TEXT,
        representante TEXT, data_cadastro TEXT,
        previsao_fechamento TEXT, contrato TEXT, tipo TEXT, valor REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => { if (err && !err.message.includes('already exists')) console.error('[Migration] comissao_propostas:', err.message); });

    
    // GET /api/comercial/comissao/metricas
    app.get('/api/comercial/comissao/metricas', authenticateToken, async (req, res) => {
        try {
            const metricas = await carregarMetricas(db);
            res.json({ ok: true, metricas });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // PUT /api/comercial/comissao/metricas
    app.put('/api/comercial/comissao/metricas', authenticateToken, async (req, res) => {
        try {
            const { metricas } = req.body;
            if (!Array.isArray(metricas)) return res.status(400).json({ error: 'metricas deve ser array' });
            await new Promise((resolve, reject) => {
                db.run("INSERT OR REPLACE INTO configuracoes_sistema (chave, valor) VALUES ('comissao_metricas', ?)", [JSON.stringify(metricas)], err => err ? reject(err) : resolve());
            });
            res.json({ ok: true });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    
    // GET /api/comercial/comissao/metricas-gestor
    app.get('/api/comercial/comissao/metricas-gestor', authenticateToken, async (req, res) => {
        try {
            const mg = await carregarMetricasGestor(db);
            res.json({ ok: true, metricas: mg });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // PUT /api/comercial/comissao/metricas-gestor
    app.put('/api/comercial/comissao/metricas-gestor', authenticateToken, async (req, res) => {
        try {
            const { metricas } = req.body;
            if (!metricas || typeof metricas !== 'object') return res.status(400).json({ error: 'metricas invalido' });
            await new Promise((resolve, reject) => {
                db.run("INSERT OR REPLACE INTO configuracoes_sistema (chave, valor) VALUES ('comissao_metricas_gestor', ?)", [JSON.stringify(metricas)], err => err ? reject(err) : resolve());
            });
            res.json({ ok: true });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // POST upload-comissao
    app.post('/api/comercial/comissao/upload-comissao', authenticateToken, multerMemory.single('arquivo'), async (req, res) => {
        try {
            const { mes, ano } = req.body;
            if (!mes || !ano || !req.file) return res.status(400).json({ error: 'Campos obrigatorios: mes, ano, arquivo.' });
            const mesNum = parseInt(mes), anoNum = parseInt(ano);

            const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
            const metricasArr = await carregarMetricas(db);
            const abasColab = wb.SheetNames.filter(n => !ABAS_IGNORAR.includes(n.toLowerCase().trim()));
            if (!abasColab.length) return res.status(400).json({ error: 'Nenhuma aba de colaborador encontrada.' });

            const colabosMercial = await new Promise((resolve, reject) => {
                db.all("SELECT id, nome_completo FROM colaboradores WHERE LOWER(departamento) LIKE '%comercial%' AND (status IS NULL OR LOWER(status) != 'demitido')",
                    [], (err, rows) => err ? reject(err) : resolve(rows || []));
            });

            const resultados = [];
            for (const nomAba of abasColab) {
                const ws = wb.Sheets[nomAba];
                if (!ws || !ws['!ref']) continue;

                const { contratos, estornos } = parseComissaoAba(ws);
                const brutos   = contratos.length;
                const estCount = estornos.length;
                const liquidos = Math.max(0, brutos - estCount);
                const met      = aplicarMetrica(liquidos, metricasArr);
                const comBruta = liquidos * met.valor;
                const totEst   = estornos.reduce((s, e) => s + e.valor, 0);

                const pnAba = nomAba.trim().split(/\s+/)[0].toLowerCase();
                const colab = colabosMercial.find(c => (c.nome_completo || '').trim().split(/\s+/)[0].toLowerCase() === pnAba);

                resultados.push({
                    colaborador_id:    colab ? colab.id : null,
                    colaborador_nome:  nomAba.trim(),
                    contratos_brutos:  brutos,
                    contratos_estorno: estCount,
                    contratos_liquidos: liquidos,
                    metrica:           met.label,
                    valor_unitario:    met.valor,
                    comissao_bruta:    comBruta,
                    bonus_primeiro:    0,
                    total_estorno:     totEst,
                    liquido:           comBruta,
                    primeiro_lugar:    0,
                    detalhe_contratos: JSON.stringify(contratos),
                    detalhe_estornos:  JSON.stringify(estornos),
                    _estCount: estCount, _liquidos: liquidos, _bonusVal: met.bonus,
                });
            }

            // Excluir e reinserir
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM comissao_comercial WHERE mes=? AND ano=?', [mesNum, anoNum], err => err ? reject(err) : resolve());
            });

            const stmt = db.prepare('INSERT INTO comissao_comercial (mes,ano,colaborador_id,colaborador_nome,contratos_brutos,contratos_estorno,contratos_liquidos,metrica,valor_unitario,comissao_bruta,bonus_primeiro,total_estorno,liquido,primeiro_lugar,detalhe_contratos,detalhe_estornos) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            for (const r of resultados) {
                stmt.run(mesNum, anoNum, r.colaborador_id, r.colaborador_nome, r.contratos_brutos, r.contratos_estorno, r.contratos_liquidos, r.metrica, r.valor_unitario, r.comissao_bruta, r.bonus_primeiro, r.total_estorno, r.liquido, r.primeiro_lugar, r.detalhe_contratos, r.detalhe_estornos);
            }
            stmt.finalize();

            // Calcular 1o lugar (sem taxas de conversao ainda)
            await recalcularPrimeiroLugar(db, mesNum, anoNum, null);

            const resumo = resultados.map(({ _estCount, _liquidos, _bonusVal, detalhe_contratos, detalhe_estornos, ...pub }) => pub);

            // Salvar planilha no R2
            let planilhaComissaoKey = null;
            try {
                if (r2.isReady()) {
                    const ext = (req.file.originalname || 'planilha.xlsx').split('.').pop();
                    const r2Key = 'Comercial/Comissao/' + anoNum + '/' + String(mesNum).padStart(2, '0') + '/planilha_comissao_' + String(mesNum).padStart(2, '0') + anoNum + '.' + ext;
                    await r2.uploadToR2(r2Key, req.file.buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    planilhaComissaoKey = r2Key;
                    await new Promise((resolve, reject) => {
                        db.run('INSERT OR REPLACE INTO comissao_planilhas (mes, ano, tipo, nome_arquivo, r2_key) VALUES (?, ?, ?, ?, ?)',
                            [mesNum, anoNum, 'comissao', req.file.originalname || 'planilha.xlsx', r2Key],
                            err => err ? reject(err) : resolve());
                    });
                    console.log('[Comissao] Planilha comissao salva no R2:', r2Key);
                }
            } catch (r2Err) {
                console.warn('[Comissao] Falha ao salvar planilha no R2:', r2Err.message);
            }

            res.json({ ok: true, mes: mesNum, ano: anoNum, colaboradores: resumo, planilha_r2_key: planilhaComissaoKey });
        } catch (err) {
            console.error('[Comissao] upload-comissao:', err);
            res.status(500).json({ error: 'Erro ao processar planilha de comissao.', detalhe: err.message });
        }
    });

    // POST upload-propostas
    app.post('/api/comercial/comissao/upload-propostas', authenticateToken, multerMemory.single('arquivo'), async (req, res) => {
        try {
            const { mes, ano } = req.body;
            if (!mes || !ano || !req.file) return res.status(400).json({ error: 'Campos obrigatorios: mes, ano, arquivo.' });
            const mesNum = parseInt(mes), anoNum = parseInt(ano);

            const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            if (!ws || !ws['!ref']) return res.status(400).json({ error: 'Planilha invalida.' });

            const range = XLSX.utils.decode_range(ws['!ref']);
            const linhas = [];
            for (let r = 1; r <= range.e.r; r++) {
                const get    = (c) => { const cell = ws[XLSX.utils.encode_cell({r,c})]; return cell ? String(cell.v || '').trim() : ''; };
                const getNum = (c) => { const cell = ws[XLSX.utils.encode_cell({r,c})]; return cell ? (Number(cell.v) || 0) : 0; };
                if (!get(0)) continue;
                linhas.push({ proposta_num: get(0), fase: get(1), motivo: get(2), cliente_id: get(3), cliente_nome: get(4), contato: get(5), representante: get(6), data_cadastro: get(7), previsao_fechamento: get(8), contrato: get(9), tipo: get(10), valor: getNum(11) });
            }

            await new Promise((resolve, reject) => {
                db.run('DELETE FROM comissao_propostas WHERE mes=? AND ano=?', [mesNum, anoNum], err => err ? reject(err) : resolve());
            });

            if (linhas.length > 0) {
                const stmtP = db.prepare('INSERT INTO comissao_propostas (mes,ano,proposta_num,fase,motivo,cliente_id,cliente_nome,contato,representante,data_cadastro,previsao_fechamento,contrato,tipo,valor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
                for (const l of linhas) stmtP.run(mesNum, anoNum, l.proposta_num, l.fase, l.motivo, l.cliente_id, l.cliente_nome, l.contato, l.representante, l.data_cadastro, l.previsao_fechamento, l.contrato, l.tipo, l.valor);
                stmtP.finalize();
            }

            const taxas = {};
            for (const l of linhas) {
                const rep = l.representante || 'DESCONHECIDO';
                if (!taxas[rep]) taxas[rep] = { total: 0, aprovadas: 0 };
                taxas[rep].total++;
                if (l.fase.toUpperCase() === 'PROPOSTA APROVADA') taxas[rep].aprovadas++;
            }

            const metricasArr = await carregarMetricas(db);
            await recalcularPrimeiroLugar(db, mesNum, anoNum, taxas, metricasArr);

            const totalG  = linhas.length;
            const aprovG  = linhas.filter(l => l.fase.toUpperCase() === 'PROPOSTA APROVADA').length;
            // Salvar planilha no R2
            let planilhaPropostasKey = null;
            try {
                if (r2.isReady()) {
                    const extP = (req.file.originalname || 'planilha.xlsx').split('.').pop();
                    const r2KeyP = 'Comercial/Comissao/' + anoNum + '/' + String(mesNum).padStart(2, '0') + '/planilha_propostas_' + String(mesNum).padStart(2, '0') + anoNum + '.' + extP;
                    await r2.uploadToR2(r2KeyP, req.file.buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    planilhaPropostasKey = r2KeyP;
                    await new Promise((resolve, reject) => {
                        db.run('INSERT OR REPLACE INTO comissao_planilhas (mes, ano, tipo, nome_arquivo, r2_key) VALUES (?, ?, ?, ?, ?)',
                            [mesNum, anoNum, 'propostas', req.file.originalname || 'planilha.xlsx', r2KeyP],
                            err => err ? reject(err) : resolve());
                    });
                    console.log('[Comissao] Planilha propostas salva no R2:', r2KeyP);
                }
            } catch (r2ErrP) {
                console.warn('[Comissao] Falha ao salvar planilha propostas no R2:', r2ErrP.message);
            }

            res.json({
                ok: true, total_linhas: linhas.length,
                taxa_geral: totalG > 0 ? ((aprovG / totalG) * 100).toFixed(1) + '%' : '0.0%',
                por_representante: Object.entries(taxas).map(([nome, t]) => ({
                    representante: nome, total: t.total, aprovadas: t.aprovadas,
                    taxa: t.total > 0 ? ((t.aprovadas / t.total) * 100).toFixed(1) + '%' : '0.0%',
                })),
            });
        } catch (err) {
            console.error('[Comissao] upload-propostas:', err);
            res.status(500).json({ error: 'Erro ao processar planilha de propostas.', detalhe: err.message });
        }
    });

    // GET /:ano/:mes
    app.get('/api/comercial/comissao/:ano/:mes', authenticateToken, async (req, res) => {
        try {
            const { ano, mes } = req.params;
            const comissoes = await new Promise((resolve, reject) => {
                db.all('SELECT c.*, colab.nome_completo as nome_completo_db, colab.foto_base64, colab.foto_path FROM comissao_comercial c LEFT JOIN colaboradores colab ON colab.id = c.colaborador_id WHERE mes=? AND ano=? ORDER BY contratos_liquidos DESC',
                    [parseInt(mes), parseInt(ano)], (err, rows) => err ? reject(err) : resolve(rows || []));
            });
            const propStats = await new Promise((resolve, reject) => {
                db.all("SELECT representante, COUNT(*) as total, SUM(CASE WHEN UPPER(fase)='PROPOSTA APROVADA' THEN 1 ELSE 0 END) as aprovadas FROM comissao_propostas WHERE mes=? AND ano=? GROUP BY representante",
                    [parseInt(mes), parseInt(ano)], (err, rows) => err ? reject(err) : resolve(rows || []));
            });

            const taxaMap = {};
            let tpg = 0, tag = 0;
            for (const p of propStats) { taxaMap[p.representante] = p; tpg += p.total; tag += p.aprovadas; }

            const enriq = comissoes.map(c => {
                const pn = normName((c.colaborador_nome || '').split(/\s+/)[0]);
                let taxa = null;
                for (const [rep, t] of Object.entries(taxaMap)) {
                    if (normName(rep).startsWith(pn)) { taxa = t; break; }
                }
                const { detalhe_contratos, detalhe_estornos, nome_completo_db, foto_base64, foto_path, ...pub } = c;
                pub.colaborador_nome = nome_completo_db || pub.colaborador_nome;
                pub.foto_url = foto_base64 || (foto_path ? '/api/colaboradores/foto/' + pub.colaborador_id : null);
                return { ...pub, propostas_total: taxa ? taxa.total : null, propostas_aprovadas: taxa ? taxa.aprovadas : null, taxa_conversao: taxa && taxa.total > 0 ? ((taxa.aprovadas / taxa.total) * 100).toFixed(1) + '%' : null };
            });

            const metricasGestor = await carregarMetricasGestor(db);
            const gestor = calcularGestor(comissoes, metricasGestor);
            
            // Buscar nome e foto do gestor comercial
            const gestorInfo = await new Promise((resolve) => {
                db.get("SELECT COALESCE(c.nome_completo, d.responsavel_nome, 'Gestor (equipe)') as gestor_nome, c.foto_base64, c.foto_path, c.id as gestor_id FROM departamentos d LEFT JOIN colaboradores c ON c.id = d.responsavel_id WHERE LOWER(TRIM(d.nome)) = 'comercial'", [], (err, row) => {
                    resolve(row || { gestor_nome: 'Gestor (equipe)' });
                });
            });
            gestor.nome = gestorInfo.gestor_nome;
            gestor.foto_url = gestorInfo.foto_base64 || (gestorInfo.foto_path ? '/api/colaboradores/foto/' + gestorInfo.gestor_id : null);

            res.json({ ok: true, mes: parseInt(mes), ano: parseInt(ano), colaboradores: enriq, gestor, totais: {
                total_bruto:   comissoes.reduce((s,c)=>s+c.comissao_bruta,0),
                total_bonus:   comissoes.reduce((s,c)=>s+c.bonus_primeiro,0),
                total_estorno: comissoes.reduce((s,c)=>s+c.total_estorno,0),
                total_liquido: comissoes.reduce((s,c)=>s+c.liquido,0),
                propostas_total_geral: tpg, propostas_aprovadas_geral: tag,
                taxa_conversao_geral: tpg > 0 ? ((tag/tpg)*100).toFixed(1)+'%' : null,
            }});
        } catch (err) { res.status(500).json({ error: 'Erro ao buscar comissoes.', detalhe: err.message }); }
    });

    // GET /:ano/:mes/propostas
    app.get('/api/comercial/comissao/:ano/:mes/propostas', authenticateToken, async (req, res) => {
        try {
            const rows = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM comissao_propostas WHERE mes=? AND ano=? ORDER BY representante, proposta_num',
                    [parseInt(req.params.mes), parseInt(req.params.ano)], (err, rows) => err ? reject(err) : resolve(rows || []));
            });
            res.json({ ok: true, propostas: rows });
        } catch (err) { res.status(500).json({ error: 'Erro ao buscar propostas.', detalhe: err.message }); }
    });

    // GET /:ano/:mes/detalhe-id/:id
    app.get('/api/comercial/comissao/:ano/:mes/detalhe-id/:id', authenticateToken, async (req, res) => {
        try {
            const row = await new Promise((resolve, reject) => {
                db.get('SELECT c.* FROM comissao_comercial c WHERE c.id=?',
                    [parseInt(req.params.id)],
                    (err, row) => err ? reject(err) : resolve(row));
            });
            if (!row) return res.status(404).json({ error: 'Colaborador nao encontrado.' });
            res.json({ ok: true, ...row, detalhe_contratos: JSON.parse(row.detalhe_contratos || '[]'), detalhe_estornos: JSON.parse(row.detalhe_estornos || '[]') });
        } catch (err) { res.status(500).json({ error: 'Erro ao buscar detalhe.', detalhe: err.message }); }
    });

    // DELETE /:ano/:mes
    app.delete('/api/comercial/comissao/:ano/:mes', authenticateToken, async (req, res) => {
        try {
            await new Promise((resolve, reject) => { db.run('DELETE FROM comissao_comercial WHERE mes=? AND ano=?', [parseInt(req.params.mes), parseInt(req.params.ano)], err => err ? reject(err) : resolve()); });
            await new Promise((resolve, reject) => { db.run('DELETE FROM comissao_propostas WHERE mes=? AND ano=?',  [parseInt(req.params.mes), parseInt(req.params.ano)], err => err ? reject(err) : resolve()); });
            res.json({ ok: true });
        } catch (err) { res.status(500).json({ error: 'Erro ao limpar mes.', detalhe: err.message }); }
    });

    // GET /:ano/:mes/planilhas — retorna r2_keys das planilhas do mes
    app.get('/api/comercial/comissao/:ano/:mes/planilhas', authenticateToken, async (req, res) => {
        try {
            const rows = await new Promise((resolve, reject) => {
                db.all('SELECT tipo, nome_arquivo, r2_key FROM comissao_planilhas WHERE mes=? AND ano=?',
                    [parseInt(req.params.mes), parseInt(req.params.ano)],
                    (err, rows) => err ? reject(err) : resolve(rows || []));
            });
            const result = {};
            for (const r of rows) result[r.tipo] = { nome_arquivo: r.nome_arquivo, r2_key: r.r2_key };
            res.json({ ok: true, planilhas: result });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // GET /:ano/:mes/download-planilha/:tipo — stream da planilha do R2
    app.get('/api/comercial/comissao/:ano/:mes/download-planilha/:tipo', authenticateToken, async (req, res) => {
        try {
            const row = await new Promise((resolve, reject) => {
                db.get('SELECT nome_arquivo, r2_key FROM comissao_planilhas WHERE mes=? AND ano=? AND tipo=?',
                    [parseInt(req.params.mes), parseInt(req.params.ano), req.params.tipo],
                    (err, row) => err ? reject(err) : resolve(row));
            });
            if (!row || !row.r2_key) return res.status(404).json({ error: 'Planilha nao encontrada.' });
            if (!r2.isReady()) return res.status(503).json({ error: 'Storage R2 nao configurado.' });
            const { stream, contentType } = await r2.downloadStreamFromR2(row.r2_key);
            res.setHeader('Content-Type', contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="' + (row.nome_arquivo || 'planilha.xlsx') + '"');
            stream.pipe(res);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    // POST /:ano/:mes/enviar-conferencia — envia e-mail de conferencia de comissao ao colaborador
    app.post('/api/comercial/comissao/:ano/:mes/enviar-conferencia', authenticateToken, async (req, res) => {
        try {
            const { colaborador_id } = req.body;
            const ano = parseInt(req.params.ano);
            const mes = parseInt(req.params.mes);
            if (!colaborador_id) return res.status(400).json({ error: 'colaborador_id obrigatorio.' });

            // Buscar dados da comissao
            const row = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM comissao_comercial WHERE id=?', [colaborador_id], (err, r) => err ? reject(err) : resolve(r));
            });
            if (!row) return res.status(404).json({ error: 'Dados de comissao nao encontrados.' });

            // Buscar e-mail do colaborador
            const colab = await new Promise((resolve, reject) => {
                db.get('SELECT nome_completo, email_corporativo, email FROM colaboradores WHERE id=?', [row.colaborador_id], (err, r) => err ? reject(err) : resolve(r));
            });
            const emailDest = (colab && (colab.email_corporativo || colab.email)) || null;
            if (!emailDest) return res.status(400).json({ error: 'Colaborador nao possui e-mail cadastrado.' });

            const nomeColab = (colab && colab.nome_completo) || row.colaborador_nome;
            const contratos = JSON.parse(row.detalhe_contratos || '[]');
            const estornos  = JSON.parse(row.detalhe_estornos  || '[]');

            const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
            const mesNome = MESES[mes - 1] || mes;

            const fmtBrl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // Formata data para DD/MM/AA (suporta 'd/m/yy', 'd/m/yyyy', 'yyyy-mm-dd', 'mm/dd/yy', etc.)
            const fmtData = (d) => {
                if (!d || d === '—') return '—';
                const s = String(d).trim();
                // Formato yyyy-mm-dd
                const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (isoMatch) {
                    const yy = isoMatch[1].slice(2);
                    return isoMatch[3] + '/' + isoMatch[2] + '/' + yy;
                }
                // Formato d/m/yyyy ou d/m/yy ou m/d/yyyy
                const parts = s.split('/');
                if (parts.length === 3) {
                    const y = parts[2].length === 4 ? parts[2].slice(2) : parts[2];
                    return parts[0].padStart(2,'0') + '/' + parts[1].padStart(2,'0') + '/' + y;
                }
                return s;
            };
            // HTML do e-mail — padrao America Rental com logo cid:empresa-logo
            const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">' +
                '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">' +
                '<tr><td align="center">' +
                '<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">' +
                // Header com logo
                '<tr><td style="padding:0;">' +
                '<img src="cid:empresa-logo" alt="América Rental" width="620" style="display:block;width:100%;max-width:620px;height:auto;" />' +
                '</td></tr>' +
                // Titulo
                '<tr><td style="padding:32px 32px 16px;text-align:center;">' +
                '<div style="font-size:28px;">📊</div>' +
                '<h2 style="margin:8px 0 4px;color:#0d6efd;font-size:20px;">Conferência de Comissão</h2>' +
                '<p style="margin:0;color:#6b7280;font-size:14px;">' + mesNome + ' de ' + ano + '</p>' +
                '</td></tr>' +
                // Saudacao
                '<tr><td style="padding:0 32px 16px;">' +
                '<p style="margin:0;font-size:15px;color:#374151;">Olá <strong>' + nomeColab.split(' ')[0] + '</strong>,</p>' +
                '<p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Segue abaixo o resumo da conferência de comissão referente ao mês de <strong>' + mesNome + ' de ' + ano + '</strong>. Por favor, verifique as informações e em caso de divergência, entre em contato com o departamento de RH.</p>' +
                '</td></tr>' +
                // Resumo cards
                '<tr><td style="padding:0 32px 24px;">' +
                '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px;">' +
                '<tr>' +
                '<td style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;width:33%;">' +
                '<div style="font-size:22px;font-weight:700;color:#1d4ed8;">' + row.contratos_brutos + '</div>' +
                '<div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Contratos Brutos</div>' +
                '</td>' +
                '<td style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center;width:33%;">' +
                '<div style="font-size:22px;font-weight:700;color:#dc2626;">' + row.contratos_estorno + '</div>' +
                '<div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Estornos</div>' +
                '</td>' +
                '<td style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;width:33%;">' +
                '<div style="font-size:22px;font-weight:700;color:#16a34a;">' + row.contratos_liquidos + '</div>' +
                '<div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Contratos Líquidos</div>' +
                '</td>' +
                '</tr>' +
                '</table>' +
                '</td></tr>' +
                // (tabela de valores removida a pedido)
                // Tabela contratos
                (contratos.length > 0 ? '<tr><td style="padding:0 32px 8px;"><h4 style="margin:0 0 8px;font-size:14px;color:#374151;font-weight:700;">Contratos Entregues (' + contratos.length + ')</h4>' +
                '<table width="100%" cellpadding="8" style="border-collapse:collapse;font-size:12px;border:1px solid #e2e8f0;border-radius:6px;">' +
                '<thead><tr style="background:#f1f5f9;"><th style="text-align:left;color:#6b7280;font-weight:600;">Nº</th><th style="color:#6b7280;font-weight:600;">Data</th><th style="color:#6b7280;font-weight:600;">Contrato</th></tr></thead>' +
                '<tbody>' +
                contratos.map((c, i) => '<tr style="border-top:1px solid #f1f5f9;background:' + (i % 2 === 1 ? '#f8fafc' : '#fff') + ';"><td>' + (c.seq || i + 1) + '</td><td style="text-align:center;">' + fmtData(c.data) + '</td><td style="text-align:center;font-family:monospace;">' + (c.numero || '—') + '</td></tr>').join('') +
                '</tbody></table></td></tr>' : '') +
                // Tabela estornos
                (estornos.length > 0 ? '<tr><td style="padding:16px 32px 8px;"><h4 style="margin:0 0 8px;font-size:14px;color:#dc2626;font-weight:700;">Estornos (' + estornos.length + ')</h4>' +
                '<table width="100%" cellpadding="8" style="border-collapse:collapse;font-size:12px;border:1px solid #fee2e2;border-radius:6px;">' +
                '<thead><tr style="background:#fef2f2;"><th style="text-align:left;color:#6b7280;font-weight:600;">Nº</th><th style="color:#6b7280;font-weight:600;">Data</th><th style="color:#6b7280;font-weight:600;">Contrato</th><th style="color:#6b7280;font-weight:600;">Motivo</th></tr></thead>' +
                '<tbody>' +
                estornos.map((e, i) => '<tr style="border-top:1px solid #fee2e2;background:' + (i % 2 === 1 ? '#fff5f5' : '#fff') + ';"><td>' + (e.seq || i + 1) + '</td><td style="text-align:center;">' + fmtData(e.data) + '</td><td style="text-align:center;font-family:monospace;">' + (e.numero || '—') + '</td><td style="text-align:center;font-weight:600;color:#dc2626;">' + (e.motivo_cod || e.motivo || '—') + '</td></tr>').join('') +
                '</tbody></table></td></tr>' : '') +
                // Rodape
                '<tr><td style="padding:32px;text-align:center;border-top:1px solid #f1f5f9;margin-top:24px;">' +
                '<p style="margin:0;font-size:12px;color:#9ca3af;">Este é um e-mail automático enviado pelo Sistema América Rental.<br>Em caso de dúvidas, entre em contato com o departamento de RH.</p>' +
                '</td></tr>' +
                '</table>' +
                '</td></tr></table>' +
                '</body></html>';

            const logoPath = path.join(__dirname, '..', 'frontend', 'assets', 'logo-header.png');
            const attachments = [{ filename: 'logo-header.png', path: logoPath, cid: 'empresa-logo' }];

            const SMTP_CONFIG = {
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: false,
                auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' }
            };
            const transporter = nodemailer.createTransport(SMTP_CONFIG);
            await transporter.sendMail({
                from: '"América Rental - Sistema" <' + (process.env.EMAIL_FROM || 'naoresponder@americarental.com.br') + '>',
                to: emailDest,
                subject: 'Conferência de comissão ' + mesNome + ' ' + ano,
                html,
                attachments
            });

            console.log('[Comissao] E-mail de conferencia enviado para ' + emailDest);
            res.json({ ok: true, enviado_para: emailDest });
        } catch (err) {
            console.error('[Comissao] Erro ao enviar e-mail de conferencia:', err.message);
            res.status(500).json({ error: 'Erro ao enviar e-mail.', detalhe: err.message });
        }
    });

    console.log('[Comissao Comercial] Rotas registradas com sucesso.');
};
