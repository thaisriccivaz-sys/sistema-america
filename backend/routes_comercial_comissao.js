// routes_comercial_comissao.js — Comissão Comercial America Rental
'use strict';

const XLSX = require('xlsx');

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
            res.json({ ok: true, mes: mesNum, ano: anoNum, colaboradores: resumo });
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
                db.all('SELECT * FROM comissao_comercial WHERE mes=? AND ano=? ORDER BY contratos_liquidos DESC',
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
                const { detalhe_contratos, detalhe_estornos, ...pub } = c;
                return { ...pub, propostas_total: taxa ? taxa.total : null, propostas_aprovadas: taxa ? taxa.aprovadas : null, taxa_conversao: taxa && taxa.total > 0 ? ((taxa.aprovadas / taxa.total) * 100).toFixed(1) + '%' : null };
            });

            const metricasGestor = await carregarMetricasGestor(db);
            const gestor = calcularGestor(comissoes, metricasGestor);

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

    // GET /:ano/:mes/detalhe/:nome
    app.get('/api/comercial/comissao/:ano/:mes/detalhe/:nome', authenticateToken, async (req, res) => {
        try {
            const row = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM comissao_comercial WHERE mes=? AND ano=? AND colaborador_nome=?',
                    [parseInt(req.params.mes), parseInt(req.params.ano), decodeURIComponent(req.params.nome)],
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

    console.log('[Comissao Comercial] Rotas registradas com sucesso.');
};
