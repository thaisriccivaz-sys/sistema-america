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
    // Ordem oficial solicitada dos quadros de estoque (sempre Obra seguido de Evento para os que separam):
    // 1. STD (Obra / Evento)
    { codigo: 'STD OBRA',           icone: '💙', label: '💙 STD OBRA',           categoria: 'OBRA',   ordem: 1 },
    { codigo: 'STD EVENTO',         icone: '💜', label: '💜 STD EVENTO',         categoria: 'EVENTO', ordem: 2 },
    // 2. LUXO (Obra / Evento)
    { codigo: 'LX OBRA',            icone: '🟦', label: '🟦 LX OBRA',            categoria: 'OBRA',   ordem: 3 },
    { codigo: 'LX EVENTO',          icone: '🟣', label: '🟣 LX EVENTO',          categoria: 'EVENTO', ordem: 4 },
    // 3. EXL (Obra / Evento)
    { codigo: 'EXL OBRA',           icone: '🔵', label: '🔵 EXL OBRA',           categoria: 'OBRA',   ordem: 5 },
    { codigo: 'EXL EVENTO',         icone: '🟣', label: '🟣 EXL EVENTO',         categoria: 'EVENTO', ordem: 6 },
    // 4. PCD (Obra / Evento)
    { codigo: 'PCD OBRA',           icone: '♿', label: '♿ PCD OBRA',           categoria: 'OBRA',   ordem: 7 },
    { codigo: 'PCD EVENTO',         icone: '♿', label: '♿ PCD EVENTO',         categoria: 'EVENTO', ordem: 8 },
    // 5. Mictório (Estoque Único)
    { codigo: 'MICTÓRIO',           icone: '💦', label: '💦 MICTÓRIO',           categoria: 'UNICO',  ordem: 9 },
    // 6. PBII (Estoque Único)
    { codigo: 'PBII',               icone: '🧼', label: '🧼 PBII',               categoria: 'UNICO',  ordem: 10 },
    // 7. PBIII (Estoque Único)
    { codigo: 'PBIII',              icone: '🧼', label: '🧼 PBIII',              categoria: 'UNICO',  ordem: 11 },
    // 8. Chuveiro (Obra / Evento)
    { codigo: 'CHUVEIRO OBRA',      icone: '🚿', label: '🚿 CHUVEIRO OBRA',      categoria: 'OBRA',   ordem: 12 },
    { codigo: 'CHUVEIRO EVENTO',    icone: '🚿', label: '🚿 CHUVEIRO EVENTO',    categoria: 'EVENTO', ordem: 13 },
    // 9. Hidráulico (Estoque Único)
    { codigo: 'HIDRÁULICO',         icone: '🚽', label: '🚽 HIDRÁULICO',         categoria: 'UNICO',  ordem: 14 },
    // 10. Guarita Individual (Estoque Único)
    { codigo: 'GUARITA INDIVIDUAL', icone: '⬜', label: '⬜ GUARITA INDIVIDUAL', categoria: 'UNICO',  ordem: 15 },
    // 11. Guarita Dupla (Estoque Único)
    { codigo: 'GUARITA DUPLA',      icone: '⚪', label: '⚪ GUARITA DUPLA',      categoria: 'UNICO',  ordem: 16 },
    // 12. Grade de Aço (Estoque Único)
    { codigo: 'GRADE DE AÇO',       icone: '🚧', label: '🚧 GRADE DE AÇO',       categoria: 'UNICO',  ordem: 17 }
];

function limparEmojiModeloOs(s) {
    return String(s || '')
        .replace(/^[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF\uFE0F\s]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizarCodigoModeloOs(raw, corOpcional, vinculoOpcional) {
    const semEmoji = limparEmojiModeloOs(raw);
    if (!semEmoji) return '';
    const n = normStr(semEmoji);

    // 1. Produtos excluídos da vinculação (Limpa Fossa, Carrinho, Caixa D'água)
    if (n.includes('limpa fossa') || n === 'carrinho' || (n.includes('caixa') && n.includes('agua'))) {
        return '';
    }

    // 2. Produtos de Estoque Único (sem separação Obra / Evento)
    if (n.includes('hidraulic')) return 'HIDRÁULICO';
    if (n.includes('mictorio') || n.includes('kros')) return 'MICTÓRIO';
    if (n.includes('pbiii') || n.includes('pia iii') || n.includes('pia 3')) return 'PBIII';
    if (n.includes('pbii') || n.includes('pia ii') || n.includes('pia 2') || n === 'pia' || n.includes('lavatorio')) return 'PBII';
    if (n.includes('guarita') && n.includes('dupla')) return 'GUARITA DUPLA';
    if (n.includes('guarita')) return 'GUARITA INDIVIDUAL';
    if (n.includes('grade') && (n.includes('aco') || n.includes('isolamento') || n.includes('conten'))) return 'GRADE DE AÇO';
    if (n === 'grade' || n === 'grade de aco') return 'GRADE DE AÇO';

    // 3. Match direto no catálogo
    const achado = EQUIPAMENTOS_OS_LOGISTICA_CATALOGO.find(item =>
        normStr(item.codigo) === n || normStr(item.label) === normStr(raw)
    );
    if (achado) return achado.codigo;

    // 4. Banheiros e Chuveiro com diferenciação Obra / Evento (ex: "Banheiro Standard - STD", "STD", "LUXO", "EXTRA LUXO", "PCD", "CHUVEIRO")
    const vincNorm = normStr(vinculoOpcional || '');
    const corNorm = normStr(corOpcional || '');
    let sufixo = '';
    if (n.includes('evento')) sufixo = 'EVENTO';
    else if (n.includes('obra')) sufixo = 'OBRA';
    else if (/\bo0\d/i.test(vincNorm) || vincNorm.includes('obra')) sufixo = 'OBRA';
    else if (corNorm.includes('roxo') || corNorm.includes('lilas')) sufixo = 'EVENTO';
    else sufixo = 'OBRA';

    if (n.includes('chuveiro')) return 'CHUVEIRO ' + sufixo;
    if (n.includes('extra lux') || /\b(exl|elx)\b/.test(n)) return 'EXL ' + sufixo;
    if (n.includes('luxo') || /\blx\b/.test(n)) return 'LX ' + sufixo;
    if (n.includes('pcd') || n.includes('pne')) return 'PCD ' + sufixo;
    if (n.includes('standard') || n.includes('standart') || /\bstd\b/.test(n)) return 'STD ' + sufixo;

    return semEmoji.toUpperCase();
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
                    const dataDe = String(req.query.data_de || req.query.data || '').trim();
                    const dataAte = String(req.query.data_ate || '').trim();
                    const temFiltroData = Boolean(dataDe || dataAte);

                    // Uma reserva de contrato ocupa o equipamento entre data_entrega e data_retirada (se houver)
                    const reservaOcupaNoPeriodo = (r) => {
                        const dtIni = String(r?.data_entrega || '').trim().slice(0, 10);
                        const dtFimRaw = String(r?.data_retirada || '').trim().slice(0, 10);
                        const dtFim = (dtFimRaw && dtFimRaw >= dtIni) ? dtFimRaw : dtIni;
                        if (!dtIni) return false;
                        if (dataDe && dataAte) {
                            return dtIni <= dataAte && dtFim >= dataDe;
                        }
                        if (dataDe) {
                            if (dtFimRaw && dtFimRaw >= dtIni) return dtIni <= dataDe && dtFimRaw >= dataDe;
                            return dtIni === dataDe;
                        }
                        if (dataAte) {
                            return dtIni <= dataAte;
                        }
                        return true;
                    };

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

                    // Agrupar resumo por modelo (sempre inicializa todos os 17 quadros oficiais mesmo com estoque 0)
                    const mapModelos = new Map();
                    const garantirModelo = (modName) => {
                        const codNorm = normalizarCodigoModeloOs(modName);
                        const key = String(codNorm || modName || '').trim().toUpperCase();
                        if (!key) return null;
                        if (!mapModelos.has(key)) {
                            const catItem = EQUIPAMENTOS_OS_LOGISTICA_CATALOGO.find(x => x.codigo === key);
                            mapModelos.set(key, {
                                modelo: key,
                                categoria: catItem ? catItem.categoria : (key.includes('EVENTO') ? 'EVENTO' : (key.includes('OBRA') ? 'OBRA' : 'UNICO')),
                                ordem: catItem ? catItem.ordem : 999,
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

                    // Garante que todos os modelos do catálogo oficial existam mesmo com estoque 0
                    EQUIPAMENTOS_OS_LOGISTICA_CATALOGO.forEach(cat => {
                        garantirModelo(cat.codigo);
                    });

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
                        if (temFiltroData && reservaOcupaNoPeriodo(r)) {
                            m.reservado_na_data += qRes;
                        }
                    });

                    const modelosResumo = Array.from(mapModelos.values()).map(m => ({
                        modelo: m.modelo,
                        categoria: m.categoria,
                        ordem: m.ordem,
                        quantidade_total: m.quantidade_total,
                        quantidade_reservada: m.quantidade_reservada,
                        reservado_total: m.reservado_total,
                        reservado_na_data: m.reservado_na_data,
                        quantidade_disponivel: m.quantidade_total - (temFiltroData ? m.reservado_na_data : m.reservado_total),
                        registros_count: m.registros_count,
                        cores: Array.from(m.cores),
                        equipamentos_comercial: Array.from(m.equipamentos_comercial.values())
                    })).sort((a, b) => (a.ordem !== b.ordem ? a.ordem - b.ordem : a.modelo.localeCompare(b.modelo, 'pt-BR')));

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

    // GET /api/logistica/estoque/modelo-xlsx — Planilha modelo para importação em massa do estoque da logística (1 por 1 por Série, sem ícone)
    app.get('/api/logistica/estoque/modelo-xlsx', authenticateToken, (req, res) => {
        db.all('SELECT * FROM logistica_estoque_equipamentos ORDER BY modelo ASC, CAST(numero_serie AS INTEGER) ASC, id ASC', [], (err, rows) => {
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
                            'Série': r.numero_serie || '',
                            'Modelo': limparEmojiModeloOs(r.modelo || ''),
                            'Cor': r.cor || '',
                            'Vinculo com equipamentos': nomesCom
                        };
                    })
                    : [
                        {
                            'Série': 1,
                            'Modelo': 'STD OBRA',
                            'Cor': 'Azul',
                            'Vinculo com equipamentos': 'BANHEIRO QUÍMICO STANDARD O01XZV | BANHEIRO QUÍMICO STANDARD O02XZV | BANHEIRO QUÍMICO STANDARD O03XZV'
                        },
                        {
                            'Série': 2,
                            'Modelo': 'STD OBRA',
                            'Cor': 'Azul',
                            'Vinculo com equipamentos': 'BANHEIRO QUÍMICO STANDARD O01XZV | BANHEIRO QUÍMICO STANDARD O02XZV | BANHEIRO QUÍMICO STANDARD O03XZV'
                        },
                        {
                            'Série': 3,
                            'Modelo': 'STD OBRA',
                            'Cor': 'Azul',
                            'Vinculo com equipamentos': 'BANHEIRO QUÍMICO STANDARD O01XZV | BANHEIRO QUÍMICO STANDARD O02XZV | BANHEIRO QUÍMICO STANDARD O03XZV'
                        }
                    ];

                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(lista);
                ws['!cols'] = [
                    { wch: 12 },
                    { wch: 26 },
                    { wch: 16 },
                    { wch: 85 }
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

    // POST /api/logistica/estoque/importar — Importação em massa via planilha .xlsx (cadastrado 1 por 1 por Série)
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
                    const cor = String(lerCol(row, ['cor', 'cores']) || '').trim();
                    const numero_serie = String(lerCol(row, ['serie', 'numero de serie', 'n de serie', 'num serie', 'serial']) || '').trim();
                    const medidas = String(lerCol(row, ['medidas', 'medida', 'dimensoes', 'tamanho']) || '').trim();
                    const vincRaw = String(lerCol(row, ['vinculo com equipamentos', 'vinculo com equipamento do comercial', 'vinculo comercial', 'equipamento comercial', 'vinculo', 'produto comercial']) || '').trim();
                    const modeloRaw = String(lerCol(row, ['modelo', 'equipamento', 'tipo', 'nome', 'produto']) || '').trim();
                    const modelo = normalizarCodigoModeloOs(modeloRaw, cor, vincRaw);
                    if (!modelo) return;

                    // Cada linha da planilha representa 1 unidade individual com seu Número de Série
                    const quantidade = 1;

                    const equipsVinc = [];
                    if (vincRaw) {
                        vincRaw.split(/[|;,]/).map(s => s.trim()).filter(Boolean).forEach(token => {
                            const tNorm = normStr(token);
                            const mNum = token.match(/^(\d{1,6})$/);
                            const codPad = mNum ? String(parseInt(mNum[1], 10)).padStart(5, '0') : '';
                            const found = mapComPorNome.get(tNorm) ||
                                          mapComPorCod.get(tNorm) ||
                                          (codPad ? mapComPorCod.get(codPad) : null) ||
                                          listaCom.find(c => normStr(c.nome) === tNorm);
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
                    return res.status(400).json({ error: 'Nenhum registro válido encontrado na planilha. Preencha as colunas "Série" e "Modelo".' });
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
                    // Se já existir o mesmo Modelo + Número de Série (quando Série foi informada), atualiza em vez de duplicar
                    if (item.numero_serie) {
                        db.get(
                            'SELECT id FROM logistica_estoque_equipamentos WHERE UPPER(TRIM(modelo)) = UPPER(TRIM(?)) AND TRIM(numero_serie) = TRIM(?)',
                            [item.modelo, item.numero_serie],
                            (errExist, rowExist) => {
                                if (!errExist && rowExist && rowExist.id) {
                                    db.run(
                                        `UPDATE logistica_estoque_equipamentos
                                         SET quantidade = 1, cor = ?, medidas = ?, equipamentos_comercial_json = ?, atualizado_em = ?
                                         WHERE id = ?`,
                                        [item.cor, item.medidas, JSON.stringify(item.equipsVinc), agora, rowExist.id],
                                        () => {
                                            importados++;
                                            sincronizarVinculosComercialParaModelo(item.modelo, item.equipsVinc, () => inserirProx());
                                        }
                                    );
                                } else {
                                    db.run(
                                        `INSERT INTO logistica_estoque_equipamentos (
                                            modelo, quantidade, cor, numero_serie, medidas,
                                            equipamentos_comercial_json, observacoes, criado_por, criado_em, atualizado_em
                                        ) VALUES (?, 1, ?, ?, ?, ?, '', ?, ?, ?)`,
                                        [
                                            item.modelo, item.cor, item.numero_serie, item.medidas,
                                            JSON.stringify(item.equipsVinc), criado_por, agora, agora
                                        ],
                                        function (errIns) {
                                            if (!errIns) importados++;
                                            sincronizarVinculosComercialParaModelo(item.modelo, item.equipsVinc, () => inserirProx());
                                        }
                                    );
                                }
                            }
                        );
                    } else {
                        db.run(
                            `INSERT INTO logistica_estoque_equipamentos (
                                modelo, quantidade, cor, numero_serie, medidas,
                                equipamentos_comercial_json, observacoes, criado_por, criado_em, atualizado_em
                            ) VALUES (?, 1, ?, ?, ?, ?, '', ?, ?, ?)`,
                            [
                                item.modelo, item.cor, item.numero_serie, item.medidas,
                                JSON.stringify(item.equipsVinc), criado_por, agora, agora
                            ],
                            function (errIns) {
                                if (!errIns) importados++;
                                sincronizarVinculosComercialParaModelo(item.modelo, item.equipsVinc, () => inserirProx());
                            }
                        );
                    }
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
