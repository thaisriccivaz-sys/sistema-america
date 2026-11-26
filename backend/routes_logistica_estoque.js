'use strict';

const multer = require('multer');
const XLSX = require('xlsx');

const uploadEstoqueLogistica = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }
});

function normStr(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

const EQUIPAMENTOS_OS_LOGISTICA_CATALOGO = [
    // OBRA
    { codigo: 'STD OBRA',                icone: '💙', label: '💙 STD OBRA',                categoria: 'OBRA' },
    { codigo: 'LX OBRA',                 icone: '🟦', label: '🟦 LX OBRA',                 categoria: 'OBRA' },
    { codigo: 'EXL OBRA',                icone: '🔵', label: '🔵 EXL OBRA',                categoria: 'OBRA' },
    { codigo: 'PCD OBRA',                icone: '♿', label: '♿ PCD OBRA',                categoria: 'OBRA' },
    { codigo: 'CHUVEIRO OBRA',           icone: '🚿', label: '🚿 CHUVEIRO OBRA',           categoria: 'OBRA' },
    { codigo: 'HIDRÁULICO OBRA',         icone: '🚽', label: '🚽 HIDRÁULICO OBRA',         categoria: 'OBRA' },
    { codigo: 'MICTÓRIO OBRA',           icone: '💦', label: '💦 MICTÓRIO OBRA',           categoria: 'OBRA' },
    { codigo: 'PBII OBRA',               icone: '🧼', label: '🧼 PBII OBRA',               categoria: 'OBRA' },
    { codigo: 'PBIII OBRA',              icone: '🧼', label: '🧼 PBIII OBRA',              categoria: 'OBRA' },
    { codigo: 'GUARITA INDIVIDUAL OBRA', icone: '⬜', label: '⬜ GUARITA INDIVIDUAL OBRA', categoria: 'OBRA' },
    { codigo: 'GUARITA DUPLA OBRA',      icone: '⚪', label: '⚪ GUARITA DUPLA OBRA',      categoria: 'OBRA' },
    { codigo: 'LIMPA FOSSA OBRA',        icone: '💧', label: '💧 LIMPA FOSSA OBRA',        categoria: 'OBRA' },
    // EVENTO
    { codigo: 'STD EVENTO',                icone: '💜', label: '💜 STD EVENTO',                categoria: 'EVENTO' },
    { codigo: 'LX EVENTO',                 icone: '🟣', label: '🟣 LX EVENTO',                 categoria: 'EVENTO' },
    { codigo: 'EXL EVENTO',                icone: '🟣', label: '🟣 EXL EVENTO',                categoria: 'EVENTO' },
    { codigo: 'PCD EVENTO',                icone: '♿', label: '♿ PCD EVENTO',                categoria: 'EVENTO' },
    { codigo: 'CHUVEIRO EVENTO',           icone: '🚿', label: '🚿 CHUVEIRO EVENTO',           categoria: 'EVENTO' },
    { codigo: 'HIDRÁULICO EVENTO',         icone: '🚽', label: '🚽 HIDRÁULICO EVENTO',         categoria: 'EVENTO' },
    { codigo: 'MICTÓRIO EVENTO',           icone: '💦', label: '💦 MICTÓRIO EVENTO',           categoria: 'EVENTO' },
    { codigo: 'PBII EVENTO',               icone: '🧼', label: '🧼 PBII EVENTO',               categoria: 'EVENTO' },
    { codigo: 'PBIII EVENTO',              icone: '🧼', label: '🧼 PBIII EVENTO',              categoria: 'EVENTO' },
    { codigo: 'GUARITA INDIVIDUAL EVENTO', icone: '⬜', label: '⬜ GUARITA INDIVIDUAL EVENTO', categoria: 'EVENTO' },
    { codigo: 'GUARITA DUPLA EVENTO',      icone: '⚪', label: '⚪ GUARITA DUPLA EVENTO',      categoria: 'EVENTO' },
    { codigo: 'LIMPA FOSSA EVENTO',        icone: '💧', label: '💧 LIMPA FOSSA EVENTO',        categoria: 'EVENTO' },
    // GERAL
    { codigo: 'CARRINHO',                  icone: '🛤', label: '🛤 CARRINHO',                  categoria: 'GERAL' },
    { codigo: 'CAIXA DAGUA',               icone: '🧊', label: '🧊 CAIXA DAGUA',               categoria: 'GERAL' }
];

function limparEmojiModeloOs(s) {
    return String(s || '')
        .replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF\uFE0F\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizarCodigoModeloOs(raw) {
    const semEmoji = limparEmojiModeloOs(raw);
    if (!semEmoji) return '';
    const alvo = normStr(semEmoji);
    const achado = EQUIPAMENTOS_OS_LOGISTICA_CATALOGO.find(item =>
        normStr(item.codigo) === alvo || normStr(item.label) === normStr(raw)
    );
    return achado ? achado.codigo : semEmoji.toUpperCase();
}


function classificarContratoAtivoParaReserva(p) {
    if (!p) return false;
    const tipoNorm = String(p.tipo || '').trim().toUpperCase().replace(/^PROPOSTA\s+/i, '');
    if (tipoNorm === 'ADITIVO') return false;

    const faseUp = String(p.fase_negociacao || '').trim().toUpperCase();
    const temNumContrato = Boolean(p.contrato && String(p.contrato).trim());
    if (faseUp !== 'APROVADA' || !temNumContrato) {
        return false; // Apenas reservar quando virar contrato (nunca para proposta)
    }

    const sitNorm = normStr(p.situacao_contrato || 'EM ELABORAÇÃO').toUpperCase();
    if (
        sitNorm.includes('ESTORNAD') ||
        sitNorm.includes('CANCELAD') ||
        sitNorm.includes('REPROVAD')
    ) {
        return false;
    }
    return true;
}

function extrairDataEntregaContrato(p) {
    if (!p) return '';
    const jsonRaw = p.os_comercial_dados_json || p.os_comercial_json;
    if (jsonRaw) {
        try {
            const osObj = typeof jsonRaw === 'string' ? JSON.parse(jsonRaw) : jsonRaw;
            if (osObj && osObj.data_entrega && String(osObj.data_entrega).trim()) {
                return String(osObj.data_entrega).trim().slice(0, 10);
            }
        } catch (_) {}
    }
    if (p.periodo_inicio && String(p.periodo_inicio).trim()) {
        return String(p.periodo_inicio).trim().slice(0, 10);
    }
    if (p.aprovado_em && String(p.aprovado_em).trim()) {
        return String(p.aprovado_em).trim().slice(0, 10);
    }
    if (p.data_cadastro && String(p.data_cadastro).trim()) {
        return String(p.data_cadastro).trim().slice(0, 10);
    }
    return '';
}

function extrairDataRetiradaContrato(p) {
    if (!p) return '';
    const jsonRaw = p.os_comercial_dados_json || p.os_comercial_json;
    if (jsonRaw) {
        try {
            const osObj = typeof jsonRaw === 'string' ? JSON.parse(jsonRaw) : jsonRaw;
            if (osObj && osObj.data_retirada && String(osObj.data_retirada).trim()) {
                return String(osObj.data_retirada).trim().slice(0, 10);
            }
        } catch (_) {}
    }
    if (p.periodo_fim && String(p.periodo_fim).trim()) {
        return String(p.periodo_fim).trim().slice(0, 10);
    }
    return '';
}

function parseItensProposta(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function sincronizarReservasEstoqueDoContrato(db, propostaId, cb) {
    const done = typeof cb === 'function' ? cb : () => {};
    const idNum = Number(propostaId);
    if (!idNum) return done();

    db.get('SELECT * FROM propostas WHERE id = ?', [idNum], (errP, p) => {
        if (errP || !p) {
            return db.run('DELETE FROM logistica_estoque_reservas WHERE proposta_id = ?', [idNum], () => done());
        }

        const ehContratoAtivo = classificarContratoAtivoParaReserva(p);
        if (!ehContratoAtivo) {
            return db.run('DELETE FROM logistica_estoque_reservas WHERE proposta_id = ?', [idNum], () => done());
        }

        db.all('SELECT id, codigo, nome, logistica_estoque_modelo FROM estoque_equipamentos', [], (errEq, equipsCom) => {
            if (errEq) return done(errEq);

            db.all('SELECT id, modelo, equipamentos_comercial_json FROM logistica_estoque_equipamentos', [], (errEst, itensEst) => {
                if (errEst) return done(errEst);

                // Mapa de vínculo Comercial -> Modelo de Estoque da Logística
                const mapById = new Map();
                const mapByNomeNorm = new Map();
                const mapByCodigoNorm = new Map();

                (equipsCom || []).forEach(eq => {
                    const mod = normalizarCodigoModeloOs(eq.logistica_estoque_modelo);
                    const nNorm = normStr(eq.nome);
                    const cNorm = normStr(eq.codigo);
                    if (nNorm) mapByNomeNorm.set(nNorm, { eq, modelo: mod });
                    if (cNorm) mapByCodigoNorm.set(cNorm, { eq, modelo: mod });
                    mapById.set(Number(eq.id), { eq, modelo: mod });
                });

                // Complementa com vínculos salvos em logistica_estoque_equipamentos.equipamentos_comercial_json
                (itensEst || []).forEach(st => {
                    const mod = normalizarCodigoModeloOs(st.modelo);
                    if (!mod) return;
                    let vincs = [];
                    try { vincs = JSON.parse(st.equipamentos_comercial_json || '[]'); } catch (_) { vincs = []; }
                    if (!Array.isArray(vincs)) return;
                    vincs.forEach(v => {
                        const vid = Number(typeof v === 'object' ? v.id : v);
                        if (vid && mapById.has(vid)) {
                            const entry = mapById.get(vid);
                            if (!entry.modelo) {
                                entry.modelo = mod;
                                const nNorm = normStr(entry.eq.nome);
                                if (nNorm) mapByNomeNorm.set(nNorm, entry);
                            }
                        }
                        if (typeof v === 'object' && v && v.nome) {
                            const vn = normStr(v.nome);
                            if (vn && (!mapByNomeNorm.has(vn) || !mapByNomeNorm.get(vn).modelo)) {
                                mapByNomeNorm.set(vn, {
                                    eq: { id: vid || null, codigo: v.codigo || '', nome: v.nome },
                                    modelo: mod
                                });
                            }
                        }
                    });
                });

                const itensContrato = parseItensProposta(p.itens);
                const dataEntrega = extrairDataEntregaContrato(p);
                const dataRetirada = extrairDataRetiradaContrato(p);
                const numContrato = String(p.contrato || p.codigo || p.id).trim();
                const sitContrato = String(p.situacao_contrato || 'EM ELABORAÇÃO').trim();
                const agora = new Date(Date.now() - 3 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);

                const novasReservas = [];
                itensContrato.forEach(item => {
                    const nomeProdRaw = String(item.produto || item.descricao || item.nome || '').trim();
                    if (!nomeProdRaw) return;
                    const qtd = Math.max(1, parseInt(item.quantidade ?? item.qtde ?? 1, 10) || 1);
                    const nNorm = normStr(nomeProdRaw);

                    // Remove possível prefixo "00084 - " caso exista no texto do item
                    const nSemCod = normStr(nomeProdRaw.replace(/^\d+\s*[-–]\s*/, ''));

                    let match = mapByNomeNorm.get(nNorm) || mapByNomeNorm.get(nSemCod) || null;
                    if (!match && item.equipamento_id && mapById.has(Number(item.equipamento_id))) {
                        match = mapById.get(Number(item.equipamento_id));
                    }
                    if (!match && item.codigo && mapByCodigoNorm.has(normStr(item.codigo))) {
                        match = mapByCodigoNorm.get(normStr(item.codigo));
                    }

                    if (match && match.modelo) {
                        novasReservas.push({
                            proposta_id: idNum,
                            numero_contrato: numContrato,
                            cliente_nome: p.cliente_nome || '',
                            tipo_contrato: p.tipo || '',
                            situacao_contrato: sitContrato,
                            data_entrega: dataEntrega,
                            data_retirada: dataRetirada,
                            equipamento_comercial_id: (match.eq && match.eq.id) || null,
                            equipamento_comercial_codigo: (match.eq && match.eq.codigo) || '',
                            equipamento_comercial_nome: (match.eq && match.eq.nome) || nomeProdRaw,
                            modelo_estoque: match.modelo,
                            quantidade_reservada: qtd
                        });
                    }
                });

                db.run('DELETE FROM logistica_estoque_reservas WHERE proposta_id = ?', [idNum], () => {
                    if (!novasReservas.length) return done();
                    let idx = 0;
                    const inserirProx = () => {
                        if (idx >= novasReservas.length) return done();
                        const r = novasReservas[idx++];
                        db.run(
                            `INSERT INTO logistica_estoque_reservas (
                                proposta_id, numero_contrato, cliente_nome, tipo_contrato, situacao_contrato,
                                data_entrega, data_retirada, equipamento_comercial_id, equipamento_comercial_codigo,
                                equipamento_comercial_nome, modelo_estoque, quantidade_reservada, criado_em, atualizado_em
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                r.proposta_id, r.numero_contrato, r.cliente_nome, r.tipo_contrato, r.situacao_contrato,
                                r.data_entrega, r.data_retirada, r.equipamento_comercial_id, r.equipamento_comercial_codigo,
                                r.equipamento_comercial_nome, r.modelo_estoque, r.quantidade_reservada, agora, agora
                            ],
                            () => inserirProx()
                        );
                    };
                    inserirProx();
                });
            });
        });
    });
}

function recalcularTodasReservasContratosAtivos(db, cb) {
    const done = typeof cb === 'function' ? cb : () => {};
    db.all("SELECT id FROM propostas WHERE contrato IS NOT NULL AND TRIM(contrato) != ''", [], (err, rows) => {
        if (err) return done(err);
        const lista = rows || [];
        // Remove reservas de propostas que não têm mais contrato
        db.run("DELETE FROM logistica_estoque_reservas WHERE proposta_id NOT IN (SELECT id FROM propostas WHERE contrato IS NOT NULL AND TRIM(contrato) != '')", [], () => {
            let idx = 0;
            const next = () => {
                if (idx >= lista.length) return done();
                const row = lista[idx++];
                sincronizarReservasEstoqueDoContrato(db, row.id, () => next());
            };
            next();
        });
    });
}

function registerLogisticaEstoqueRoutes(app, db, authenticateToken) {
    // 1. Migrations
    db.run("ALTER TABLE estoque_equipamentos ADD COLUMN logistica_estoque_modelo TEXT", (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('[MIGRATION estoque_equipamentos.logistica_estoque_modelo]', err.message);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS logistica_estoque_equipamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        modelo TEXT NOT NULL,
        quantidade INTEGER DEFAULT 1,
        cor TEXT DEFAULT '',
        numero_serie TEXT DEFAULT '',
        medidas TEXT DEFAULT '',
        equipamentos_comercial_json TEXT DEFAULT '[]',
        observacoes TEXT DEFAULT '',
        criado_por TEXT DEFAULT '',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('[LOGISTICA-ESTOQUE] Erro ao criar tabela logistica_estoque_equipamentos:', err.message);
    });

    db.run(`CREATE TABLE IF NOT EXISTS logistica_estoque_reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposta_id INTEGER NOT NULL,
        numero_contrato TEXT,
        cliente_nome TEXT,
        tipo_contrato TEXT,
        situacao_contrato TEXT,
        data_entrega TEXT,
        data_retirada TEXT,
        equipamento_comercial_id INTEGER,
        equipamento_comercial_codigo TEXT,
        equipamento_comercial_nome TEXT,
        modelo_estoque TEXT NOT NULL,
        quantidade_reservada INTEGER NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('[LOGISTICA-ESTOQUE] Erro ao criar tabela logistica_estoque_reservas:', err.message);
        else setTimeout(() => recalcularTodasReservasContratosAtivos(db), 1800);
    });

    // Sincroniza a lista de equipamentos do comercial vinculados a um modelo de estoque da logística
    const sincronizarVinculosComercialParaModelo = (modeloRaw, equipamentosComercialIds, cb) => {
        const done = typeof cb === 'function' ? cb : () => {};
        const mod = String(modeloRaw || '').trim();
        if (!mod || !Array.isArray(equipamentosComercialIds)) return done();

        const idsNum = equipamentosComercialIds.map(x => Number(typeof x === 'object' ? x.id : x)).filter(Boolean);
        if (!idsNum.length) return done();

        const placeholders = idsNum.map(() => '?').join(',');
        db.run(
            `UPDATE estoque_equipamentos SET logistica_estoque_modelo = ? WHERE id IN (${placeholders})`,
            [mod, ...idsNum],
            () => done()
        );
    };

    // GET /api/logistica/estoque — Retorna itens de estoque, equipamentos do comercial, reservas e resumo por modelo
    app.get('/api/logistica/estoque', authenticateToken, (req, res) => {
        db.all('SELECT * FROM logistica_estoque_equipamentos ORDER BY modelo ASC, id DESC', [], (errEst, itens) => {
            if (errEst) return res.status(500).json({ error: errEst.message });

            db.all('SELECT id, codigo, nome, unidade_medida, fonte_fornecimento, grupo_produto, logistica_estoque_modelo FROM estoque_equipamentos ORDER BY CAST(REPLACE(REPLACE(UPPER(codigo), "EQ-", ""), "EQ", "") AS INTEGER) ASC, id ASC', [], (errCom, equipsCom) => {
                if (errCom) return res.status(500).json({ error: errCom.message });

                db.all('SELECT * FROM logistica_estoque_reservas ORDER BY data_entrega ASC, id DESC', [], (errRes, reservas) => {
                    if (errRes) return res.status(500).json({ error: errRes.message });

                    const dataFiltro = String(req.query.data || '').trim();
                    const listaItens = (itens || []).map(it => {
                        let vincs = [];
                        try { vincs = JSON.parse(it.equipamentos_comercial_json || '[]'); } catch (_) { vincs = []; }
                        return Object.assign({}, it, {
                            modelo: normalizarCodigoModeloOs(it.modelo) || it.modelo,
                            equipamentos_comercial: Array.isArray(vincs) ? vincs : []
                        });
                    });
                    const listaCom = (equipsCom || []).map(c => Object.assign({}, c, {
                        logistica_estoque_modelo: normalizarCodigoModeloOs(c.logistica_estoque_modelo) || c.logistica_estoque_modelo || ''
                    }));
                    const listaRes = (reservas || []).map(r => Object.assign({}, r, {
                        modelo_estoque: normalizarCodigoModeloOs(r.modelo_estoque) || r.modelo_estoque,
                        contrato_numero: r.numero_contrato || '',
                        quantidade: Number(r.quantidade_reservada ?? 0) || 0
                    }));

                    // Agrupar resumo por modelo
                    const mapModelos = new Map();
                    const garantirModelo = (modName) => {
                        const codNorm = normalizarCodigoModeloOs(modName);
                        const key = String(codNorm || modName || '').trim().toUpperCase();
                        if (!key) return null;
                        if (!mapModelos.has(key)) {
                            mapModelos.set(key, {
                                modelo: key,
                                quantidade_total: 0,
                                quantidade_reservada: 0,
                                reservado_total: 0,
                                reservado_na_data: 0,
                                quantidade_disponivel: 0,
                                registros_count: 0,
                                cores: new Set(),
                                equipamentos_comercial: new Map()
                            });
                        }
                        return mapModelos.get(key);
                    };

                    listaItens.forEach(it => {
                        const m = garantirModelo(it.modelo);
                        if (!m) return;
                        m.quantidade_total += Math.max(0, parseInt(it.quantidade ?? 0, 10) || 0);
                        m.registros_count += 1;
                        if (it.cor && String(it.cor).trim()) m.cores.add(String(it.cor).trim());
                        (it.equipamentos_comercial || []).forEach(v => {
                            const vid = Number(typeof v === 'object' ? v.id : v);
                            const eqObj = listaCom.find(c => Number(c.id) === vid) || (typeof v === 'object' ? v : null);
                            if (eqObj && eqObj.nome) {
                                m.equipamentos_comercial.set(Number(eqObj.id || vid), {
                                    id: Number(eqObj.id || vid),
                                    codigo: eqObj.codigo || '',
                                    nome: eqObj.nome
                                });
                            }
                        });
                    });

                    listaCom.forEach(c => {
                        if (c.logistica_estoque_modelo && String(c.logistica_estoque_modelo).trim()) {
                            const m = garantirModelo(c.logistica_estoque_modelo);
                            if (m) {
                                m.equipamentos_comercial.set(Number(c.id), {
                                    id: Number(c.id),
                                    codigo: c.codigo || '',
                                    nome: c.nome
                                });
                            }
                        }
                    });

                    listaRes.forEach(r => {
                        const m = garantirModelo(r.modelo_estoque);
                        if (!m) return;
                        const qRes = Math.max(0, parseInt(r.quantidade_reservada ?? 0, 10) || 0);
                        m.quantidade_reservada += qRes;
                        m.reservado_total += qRes;
                        if (dataFiltro && String(r.data_entrega || '') === dataFiltro) {
                            m.reservado_na_data += qRes;
                        }
                    });

                    const modelosResumo = Array.from(mapModelos.values()).map(m => ({
                        modelo: m.modelo,
                        quantidade_total: m.quantidade_total,
                        quantidade_reservada: m.quantidade_reservada,
                        reservado_total: m.reservado_total,
                        reservado_na_data: m.reservado_na_data,
                        quantidade_disponivel: m.quantidade_total - (dataFiltro ? m.reservado_na_data : m.reservado_total),
                        registros_count: m.registros_count,
                        cores: Array.from(m.cores),
                        equipamentos_comercial: Array.from(m.equipamentos_comercial.values())
                    })).sort((a, b) => a.modelo.localeCompare(b.modelo, 'pt-BR'));

                    res.json({
                        catalogo_os_logistica: EQUIPAMENTOS_OS_LOGISTICA_CATALOGO,
                        itens: listaItens,
                        equipamentos_comercial: listaCom,
                        reservas: listaRes,
                        modelos: modelosResumo,
                        modelos_resumo: modelosResumo
                    });
                });
            });
        });
    });

    // POST /api/logistica/estoque — Adicionar equipamento manualmente no estoque da logística
    app.post('/api/logistica/estoque', authenticateToken, (req, res) => {
        const d = req.body || {};
        const modelo = normalizarCodigoModeloOs(d.modelo);
        if (!modelo) return res.status(400).json({ error: 'Informe o Modelo do equipamento de estoque.' });

        const quantidade = Math.max(1, parseInt(d.quantidade ?? 1, 10) || 1);
        const cor = String(d.cor || '').trim();
        const numero_serie = String(d.numero_serie || '').trim();
        const medidas = String(d.medidas || '').trim();
        const observacoes = String(d.observacoes || '').trim();
        const equipsComArr = Array.isArray(d.equipamentos_comercial) ? d.equipamentos_comercial : [];
        const criado_por = (req.user && (req.user.nome || req.user.username)) || 'Logística';
        const agora = new Date(Date.now() - 3 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);

        db.run(
            `INSERT INTO logistica_estoque_equipamentos (
                modelo, quantidade, cor, numero_serie, medidas,
                equipamentos_comercial_json, observacoes, criado_por, criado_em, atualizado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                modelo, quantidade, cor, numero_serie, medidas,
                JSON.stringify(equipsComArr), observacoes, criado_por, agora, agora
            ],
            function (errIns) {
                if (errIns) return res.status(500).json({ error: errIns.message });
                const newId = this.lastID;
                sincronizarVinculosComercialParaModelo(modelo, equipsComArr, () => {
                    recalcularTodasReservasContratosAtivos(db, () => {
                        res.json({ success: true, id: newId });
                    });
                });
            }
        );
    });

    // PUT /api/logistica/estoque/:id — Editar equipamento de estoque da logística
    app.put('/api/logistica/estoque/:id', authenticateToken, (req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID inválido.' });

        const d = req.body || {};
        const modelo = normalizarCodigoModeloOs(d.modelo);
        if (!modelo) return res.status(400).json({ error: 'Informe o Modelo do equipamento de estoque.' });

        const quantidade = Math.max(1, parseInt(d.quantidade ?? 1, 10) || 1);
        const cor = String(d.cor || '').trim();
        const numero_serie = String(d.numero_serie || '').trim();
        const medidas = String(d.medidas || '').trim();
        const observacoes = String(d.observacoes || '').trim();
        const equipsComArr = Array.isArray(d.equipamentos_comercial) ? d.equipamentos_comercial : [];
        const agora = new Date(Date.now() - 3 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);

        db.run(
            `UPDATE logistica_estoque_equipamentos
             SET modelo = ?, quantidade = ?, cor = ?, numero_serie = ?, medidas = ?,
                 equipamentos_comercial_json = ?, observacoes = ?, atualizado_em = ?
             WHERE id = ?`,
            [
                modelo, quantidade, cor, numero_serie, medidas,
                JSON.stringify(equipsComArr), observacoes, agora, id
            ],
            function (errUp) {
                if (errUp) return res.status(500).json({ error: errUp.message });
                sincronizarVinculosComercialParaModelo(modelo, equipsComArr, () => {
                    recalcularTodasReservasContratosAtivos(db, () => {
                        res.json({ success: true, id });
                    });
                });
            }
        );
    });

    // DELETE /api/logistica/estoque/:id — Excluir item do estoque da logística
    app.delete('/api/logistica/estoque/:id', authenticateToken, (req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID inválido.' });

        db.run('DELETE FROM logistica_estoque_equipamentos WHERE id = ?', [id], function (errDel) {
            if (errDel) return res.status(500).json({ error: errDel.message });
            res.json({ success: true });
        });
    });

    // PATCH /api/estoque-equipamentos/:id/vincular-logistica — Vincular equipamento do Comercial a um modelo do estoque da Logística
    app.patch('/api/estoque-equipamentos/:id/vincular-logistica', authenticateToken, (req, res) => {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: 'ID inválido.' });
        const modelo = normalizarCodigoModeloOs(req.body && req.body.logistica_estoque_modelo);

        db.get('SELECT id, codigo, nome FROM estoque_equipamentos WHERE id = ?', [id], (errEq, rowEq) => {
            if (errEq) return res.status(500).json({ error: errEq.message });
            if (!rowEq) return res.status(404).json({ error: 'Equipamento comercial não encontrado.' });

            db.run(
                'UPDATE estoque_equipamentos SET logistica_estoque_modelo = ? WHERE id = ?',
                [modelo || null, id],
                function (errUp) {
                    if (errUp) return res.status(500).json({ error: errUp.message });

                    // Também atualiza equipamentos_comercial_json nos itens do modelo correspondente na logística
                    db.all('SELECT id, modelo, equipamentos_comercial_json FROM logistica_estoque_equipamentos', [], (errAll, rowsEst) => {
                        if (!errAll && Array.isArray(rowsEst)) {
                            rowsEst.forEach(st => {
                                let arr = [];
                                try { arr = JSON.parse(st.equipamentos_comercial_json || '[]'); } catch (_) { arr = []; }
                                if (!Array.isArray(arr)) arr = [];
                                const ehMesmoMod = modelo && normStr(st.modelo) === normStr(modelo);
                                const jaTem = arr.some(x => Number(typeof x === 'object' ? x.id : x) === id);
                                if (ehMesmoMod && !jaTem) {
                                    arr.push({ id: rowEq.id, codigo: rowEq.codigo || '', nome: rowEq.nome });
                                    db.run('UPDATE logistica_estoque_equipamentos SET equipamentos_comercial_json = ? WHERE id = ?', [JSON.stringify(arr), st.id]);
                                } else if (!ehMesmoMod && jaTem) {
                                    const filtrado = arr.filter(x => Number(typeof x === 'object' ? x.id : x) !== id);
                                    db.run('UPDATE logistica_estoque_equipamentos SET equipamentos_comercial_json = ? WHERE id = ?', [JSON.stringify(filtrado), st.id]);
                                }
                            });
                        }
                        recalcularTodasReservasContratosAtivos(db, () => {
                            res.json({ success: true, id, logistica_estoque_modelo: modelo || null });
                        });
                    });
                }
            );
        });
    });

    // POST /api/logistica/estoque/recalcular-reservas
    app.post('/api/logistica/estoque/recalcular-reservas', authenticateToken, (req, res) => {
        recalcularTodasReservasContratosAtivos(db, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });

    // GET /api/logistica/estoque/modelo-xlsx — Planilha modelo para importação em massa do estoque da logística
    app.get('/api/logistica/estoque/modelo-xlsx', authenticateToken, (req, res) => {
        db.all('SELECT * FROM logistica_estoque_equipamentos ORDER BY modelo ASC, id ASC', [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            try {
                const lista = Array.isArray(rows) && rows.length > 0
                    ? rows.map(r => {
                        let vincs = [];
                        try { vincs = JSON.parse(r.equipamentos_comercial_json || '[]'); } catch (_) { vincs = []; }
                        const nomesCom = Array.isArray(vincs)
                            ? vincs.map(v => (typeof v === 'object' && v ? (v.nome || v.codigo || '') : String(v))).filter(Boolean).join(' | ')
                            : '';
                        return {
                            'Modelo': r.modelo || '',
                            'Quantidade': Number(r.quantidade || 1),
                            'Cor': r.cor || '',
                            'Número de Série': r.numero_serie || '',
                            'Medidas': r.medidas || '',
                            'Vínculo com Equipamento do Comercial': nomesCom
                        };
                    })
                    : [
                        {
                            'Modelo': '💙 STD OBRA',
                            'Quantidade': 50,
                            'Cor': 'Azul',
                            'Número de Série': 'STD-001 a STD-050',
                            'Medidas': '2,20m x 1,10m x 1,20m',
                            'Vínculo com Equipamento do Comercial': 'BANHEIRO QUÍMICO STANDARD O04XZA | BANHEIRO QUÍMICO STANDARD O05XZA'
                        },
                        {
                            'Modelo': '💜 STD EVENTO',
                            'Quantidade': 30,
                            'Cor': 'Roxo',
                            'Número de Série': 'STDE-001 a STDE-030',
                            'Medidas': '2,20m x 1,10m x 1,20m',
                            'Vínculo com Equipamento do Comercial': 'BANHEIRO QUÍMICO STANDARD'
                        }
                    ];

                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(lista);
                ws['!cols'] = [
                    { wch: 18 },
                    { wch: 14 },
                    { wch: 16 },
                    { wch: 24 },
                    { wch: 24 },
                    { wch: 55 }
                ];
                XLSX.utils.book_append_sheet(wb, ws, 'Estoque_Logistica');
                const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename="estoque_logistica_modelo.xlsx"');
                res.send(buf);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    });

    // POST /api/logistica/estoque/importar — Importação em massa via planilha .xlsx
    app.post('/api/logistica/estoque/importar', authenticateToken, uploadEstoqueLogistica.single('arquivo'), (req, res) => {
        try {
            let fileBuffer = req.file && req.file.buffer ? req.file.buffer : null;
            if (!fileBuffer && req.body && req.body.file_base64) {
                const b64Clean = String(req.body.file_base64).replace(/^data:[^;]+;base64,/, '');
                fileBuffer = Buffer.from(b64Clean, 'base64');
            }
            if (!fileBuffer) {
                return res.status(400).json({ error: 'Selecione um arquivo Excel (.xlsx) válido para importar.' });
            }

            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) return res.status(400).json({ error: 'A planilha enviada não possui abas.' });

            const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
            if (!rawRows || !rawRows.length) {
                return res.status(400).json({ error: 'A planilha enviada está vazia.' });
            }

            const lerCol = (rowObj, candidatos) => {
                const keys = Object.keys(rowObj || {});
                for (const k of keys) {
                    const kn = normStr(k);
                    if (candidatos.includes(kn)) return rowObj[k];
                }
                for (const k of keys) {
                    const kn = normStr(k);
                    if (candidatos.some(c => kn.includes(c))) return rowObj[k];
                }
                return '';
            };

            db.all('SELECT id, codigo, nome FROM estoque_equipamentos', [], (errEq, equipsCom) => {
                if (errEq) return res.status(500).json({ error: errEq.message });

                const listaCom = equipsCom || [];
                const mapComPorNome = new Map();
                const mapComPorCod = new Map();
                listaCom.forEach(c => {
                    if (c.nome) mapComPorNome.set(normStr(c.nome), c);
                    if (c.codigo) {
                        mapComPorCod.set(normStr(c.codigo), c);
                        const m = String(c.codigo).match(/(\d+)/);
                        if (m) mapComPorCod.set(String(parseInt(m[1], 10)).padStart(5, '0'), c);
                    }
                });

                const criado_por = (req.user && (req.user.nome || req.user.username)) || 'Logística';
                const agora = new Date(Date.now() - 3 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);

                const registrosParaInserir = [];
                rawRows.forEach(row => {
                    const modelo = normalizarCodigoModeloOs(lerCol(row, ['modelo', 'equipamento', 'tipo', 'nome']));
                    if (!modelo) return;
                    const qtdRaw = lerCol(row, ['quantidade', 'qtd', 'qtde', 'quantidade de cada']);
                    const quantidade = Math.max(1, parseInt(qtdRaw || '1', 10) || 1);
                    const cor = String(lerCol(row, ['cor', 'cores']) || '').trim();
                    const numero_serie = String(lerCol(row, ['numero de serie', 'n de serie', 'serie', 'num serie', 'serial']) || '').trim();
                    const medidas = String(lerCol(row, ['medidas', 'medida', 'dimensoes', 'tamanho']) || '').trim();
                    const vincRaw = String(lerCol(row, ['vinculo com equipamento do comercial', 'vinculo comercial', 'equipamento comercial', 'vinculo', 'produto comercial']) || '').trim();

                    const equipsVinc = [];
                    if (vincRaw) {
                        vincRaw.split(/[|;,]/).map(s => s.trim()).filter(Boolean).forEach(token => {
                            const tNorm = normStr(token);
                            const mNum = token.match(/^(\d{1,6})$/);
                            const codPad = mNum ? String(parseInt(mNum[1], 10)).padStart(5, '0') : '';
                            const found = mapComPorNome.get(tNorm) ||
                                          mapComPorCod.get(tNorm) ||
                                          (codPad ? mapComPorCod.get(codPad) : null) ||
                                          listaCom.find(c => normStr(c.nome).includes(tNorm));
                            if (found && !equipsVinc.some(x => Number(x.id) === Number(found.id))) {
                                equipsVinc.push({ id: found.id, codigo: found.codigo || '', nome: found.nome });
                            }
                        });
                    }

                    registrosParaInserir.push({
                        modelo,
                        quantidade,
                        cor,
                        numero_serie,
                        medidas,
                        equipsVinc
                    });
                });

                if (!registrosParaInserir.length) {
                    return res.status(400).json({ error: 'Nenhum registro válido encontrado na planilha. Preencha a coluna "Modelo".' });
                }

                let idx = 0;
                let importados = 0;
                const inserirProx = () => {
                    if (idx >= registrosParaInserir.length) {
                        return recalcularTodasReservasContratosAtivos(db, () => {
                            res.json({ success: true, importados, inseridos: importados });
                        });
                    }
                    const item = registrosParaInserir[idx++];
                    db.run(
                        `INSERT INTO logistica_estoque_equipamentos (
                            modelo, quantidade, cor, numero_serie, medidas,
                            equipamentos_comercial_json, observacoes, criado_por, criado_em, atualizado_em
                        ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?)`,
                        [
                            item.modelo, item.quantidade, item.cor, item.numero_serie, item.medidas,
                            JSON.stringify(item.equipsVinc), criado_por, agora, agora
                        ],
                        function (errIns) {
                            if (!errIns) importados++;
                            sincronizarVinculosComercialParaModelo(item.modelo, item.equipsVinc, () => inserirProx());
                        }
                    );
                };
                inserirProx();
            });
        } catch (e) {
            res.status(500).json({ error: 'Erro ao importar planilha de estoque: ' + e.message });
        }
    });
}

module.exports = {
    registerLogisticaEstoqueRoutes,
    sincronizarReservasEstoqueDoContrato,
    recalcularTodasReservasContratosAtivos
};
