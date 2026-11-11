// ═══════════════════════════════════════════════════════════════════════════════
// APP › Liderança › Entregas
// Conferência operacional (mobile-first) dos equipamentos de OS de ENTREGA no
// Pipeline Logística, com checklist por modelo (joinha OK / avaria), foto
// obrigatória por item e vídeo opcional por equipamento no Cloudflare R2.
// ═══════════════════════════════════════════════════════════════════════════════

const crypto = require('crypto');

const PAGE_ID = 'app-lideranca-entregas';
const INICIO_PADRAO = '2026-11-10'; // ontem (referência: 11/11/2026)

// Modelos e itens oficiais definidos pela operação
const MODELOS_CHECKLIST = {
    STD: {
        nome: 'Banheiro Modelo STD',
        curto: 'STD',
        itens: [
            { key: 'porta', label: 'Porta' },
            { key: 'dobradica', label: 'Dobradiça' },
            { key: 'cabo_aco_porta', label: 'Cabo de aço porta' },
            { key: 'laterais', label: 'Laterais' },
            { key: 'teto', label: 'Teto' },
            { key: 'fechadura', label: 'Fechadura' },
            { key: 'telas', label: 'Telas' },
            { key: 'assento_sanitario', label: 'Assento sanitário' },
            { key: 'placa_adesivo', label: 'Placa/adesivo' },
            { key: 'tubo_respiro', label: 'Tubo de respiro' },
            { key: 'piso', label: 'Piso' },
            { key: 'caixa_dejetos', label: 'Caixa de dejetos' },
            { key: 'mictorio', label: 'Mictório' }
        ]
    },
    LX: {
        nome: 'Banheiro Modelo LX',
        curto: 'LX',
        itens: [
            { key: 'porta', label: 'Porta' },
            { key: 'dobradica', label: 'Dobradiça' },
            { key: 'cabo_aco_porta', label: 'Cabo de aço porta' },
            { key: 'laterais', label: 'Laterais' },
            { key: 'teto', label: 'Teto' },
            { key: 'fechadura', label: 'Fechadura' },
            { key: 'telas', label: 'Telas' },
            { key: 'assento_sanitario', label: 'Assento sanitário' },
            { key: 'placa_adesivo', label: 'Placa/adesivo' },
            { key: 'tubo_respiro', label: 'Tubo de respiro' },
            { key: 'piso', label: 'Piso' },
            { key: 'caixa_dejetos', label: 'Caixa de dejetos' },
            { key: 'mictorio', label: 'Mictório' },
            { key: 'cuba', label: 'Cuba' },
            { key: 'bomba_descarga', label: 'Bomba de descarga' }
        ]
    },
    ELX: {
        nome: 'Banheiro Modelo ELX',
        curto: 'ELX',
        itens: [
            { key: 'porta', label: 'Porta' },
            { key: 'dobradica', label: 'Dobradiça' },
            { key: 'cabo_aco_porta', label: 'Cabo de aço porta' },
            { key: 'laterais', label: 'Laterais' },
            { key: 'teto', label: 'Teto' },
            { key: 'fechadura', label: 'Fechadura' },
            { key: 'telas', label: 'Telas' },
            { key: 'assento_sanitario', label: 'Assento sanitário' },
            { key: 'placa_adesivo', label: 'Placa/adesivo' },
            { key: 'tubo_respiro', label: 'Tubo de respiro' },
            { key: 'piso', label: 'Piso' },
            { key: 'caixa_dejetos', label: 'Caixa de dejetos' },
            { key: 'mictorio', label: 'Mictório' },
            { key: 'cuba', label: 'Cuba' },
            { key: 'bomba_descarga', label: 'Bomba de descarga' },
            { key: 'pia_lavatorio', label: 'Pia/lavatório' },
            { key: 'torneira', label: 'Torneira' },
            { key: 'dispensers', label: 'Dispensers' }
        ]
    },
    GUARITA: {
        nome: 'Guarita',
        curto: 'Guarita',
        itens: [
            { key: 'porta', label: 'Porta' },
            { key: 'lateral', label: 'Lateral' },
            { key: 'teto', label: 'Teto' },
            { key: 'pintura', label: 'Pintura' },
            { key: 'fechadura', label: 'Fechadura' },
            { key: 'chave', label: 'Chave' },
            { key: 'vidros_janelas', label: 'Vidros/janelas' },
            { key: 'piso', label: 'Piso' },
            { key: 'soquete', label: 'Soquete' },
            { key: 'interruptor', label: 'Interruptor' },
            { key: 'balcao', label: 'Balcão' }
        ]
    },
    MICTORIO: {
        nome: 'Mictório (Kros)',
        curto: 'Mictório',
        itens: [
            { key: 'tampinhas', label: 'Tampinhas' },
            { key: 'parte_cima', label: 'Parte de cima' },
            { key: 'parte_baixo', label: 'Parte de baixo' }
        ]
    },
    PIA: {
        nome: 'Pia PBII / PBIII',
        curto: 'Pia',
        itens: [
            { key: 'torneiras', label: 'Torneiras' },
            { key: 'dispensers', label: 'Dispensers' },
            { key: 'reservatorio_limpa', label: 'Reservatório de água limpa' },
            { key: 'reservatorio_suja', label: 'Reservatório de água suja' },
            { key: 'bomba', label: 'Bomba' },
            { key: 'chicotes', label: 'Chicotes' }
        ]
    },
    HIDRAULICO: {
        nome: 'Hidráulico',
        curto: 'Hidráulico',
        itens: [
            { key: 'porta', label: 'Porta' },
            { key: 'dobradica', label: 'Dobradiça' },
            { key: 'cabo_aco_porta', label: 'Cabo de aço porta' },
            { key: 'laterais', label: 'Laterais' },
            { key: 'teto', label: 'Teto' },
            { key: 'fechadura', label: 'Fechadura' },
            { key: 'telas', label: 'Telas' },
            { key: 'assento_sanitario', label: 'Assento sanitário' },
            { key: 'placa_adesivo', label: 'Placa/adesivo' },
            { key: 'piso', label: 'Piso' },
            { key: 'vaso_sanitario', label: 'Vaso sanitário' },
            { key: 'caixa_descarga', label: 'Caixa de descarga' },
            { key: 'tubo_descarga', label: 'Tubo para descarga' },
            { key: 'pia_lavatorio', label: 'Pia/lavatório' },
            { key: 'torneira', label: 'Torneira' },
            { key: 'chicotes', label: 'Chicotes' },
            { key: 'dispensers', label: 'Dispensers' }
        ]
    },
    CHUVEIRO: {
        nome: 'Chuveiro',
        curto: 'Chuveiro',
        itens: [
            { key: 'porta', label: 'Porta' },
            { key: 'dobradica', label: 'Dobradiça' },
            { key: 'cabo_aco_porta', label: 'Cabo de aço porta' },
            { key: 'laterais', label: 'Laterais' },
            { key: 'teto', label: 'Teto' },
            { key: 'fechadura', label: 'Fechadura' },
            { key: 'telas', label: 'Telas' },
            { key: 'placa_adesivo', label: 'Placa/adesivo' },
            { key: 'piso', label: 'Piso' },
            { key: 'encanamentos', label: 'Encanamentos' },
            { key: 'ralo', label: 'Ralo' }
        ]
    },
    PCD: {
        nome: 'Banheiro PCD',
        curto: 'PCD',
        itens: [
            { key: 'porta', label: 'Porta' },
            { key: 'dobradica', label: 'Dobradiça' },
            { key: 'cabo_aco_porta', label: 'Cabo de aço porta' },
            { key: 'laterais', label: 'Laterais' },
            { key: 'teto', label: 'Teto' },
            { key: 'fechadura', label: 'Fechadura' },
            { key: 'telas', label: 'Telas' },
            { key: 'assento_sanitario', label: 'Assento sanitário' },
            { key: 'placa_adesivo', label: 'Placa/adesivo' },
            { key: 'tubo_respiro', label: 'Tubo de respiro' },
            { key: 'piso', label: 'Piso' },
            { key: 'caixa_dejetos', label: 'Caixa de dejetos' },
            { key: 'barras_apoio', label: 'Barras de apoio' }
        ]
    }
};

// Mapeia uma descrição de produto da OS (ex.: "ELX C/ PIA", "KROS", "PBII") para um modelo
function mapearModelo(descricao) {
    const s = String(descricao || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    if (!s) return null;
    if (/CARRINHO|LIMPA\s*FOSSA|VISITA\s*TECNICA|CAMINHAO|FRETE|HIGIENIZ|SUC(?:C|Ç)AO/.test(s)) return null;
    if (/\bPCD\b|PNE/.test(s)) return 'PCD';
    if (/GUARITA/.test(s)) return 'GUARITA';
    if (/CHUVEIRO/.test(s)) return 'CHUVEIRO';
    if (/HIDR[AÁ]ULIC/.test(s)) return 'HIDRAULICO';
    if (/KROS|MICT[OÓ]RIO/.test(s)) return 'MICTORIO';
    if (/\bPB\s*I{2,3}\b|\bPB[23]\b|\bPIA\b|LAVAT[OÓ]RIO\s*PORT/.test(s)) return 'PIA';
    if (/\bS\s*ELX\b|\bELX\b|EXTRA\s*LUXO/.test(s)) return 'ELX';
    if (/\bLX\b|\bLUXO\b/.test(s)) return 'LX';
    if (/\bSTD\b|STANDARD/.test(s)) return 'STD';
    return null;
}

// Expande itens_json de uma OS em unidades individuais conferíveis (ex.: 3 STD → STD_1, STD_2, STD_3)
function explodirUnidades(itensJson) {
    let arr = [];
    try { arr = JSON.parse(itensJson || '[]'); } catch (_) { arr = []; }
    if (!Array.isArray(arr)) arr = [];

    const porModelo = {};
    const semChecklist = [];
    for (const raw of arr) {
        const desc = (raw && (raw.descricao || raw.produto || raw.nome)) ? String(raw.descricao || raw.produto || raw.nome).trim() : '';
        const qtd = Math.max(1, parseInt(raw && (raw.qtd ?? raw.quantidade), 10) || 1);
        if (!desc) continue;
        const modelo = mapearModelo(desc);
        if (!modelo) {
            semChecklist.push({ descricao: desc, qtd });
            continue;
        }
        if (!porModelo[modelo]) porModelo[modelo] = [];
        for (let i = 0; i < qtd; i++) porModelo[modelo].push(desc);
    }

    const unidades = [];
    for (const modelo of Object.keys(porModelo)) {
        const lista = porModelo[modelo];
        const total = lista.length;
        lista.forEach((desc, idx) => {
            const indice = idx + 1;
            unidades.push({
                unidade_key: `${modelo}_${indice}`,
                modelo,
                modelo_nome: MODELOS_CHECKLIST[modelo].nome,
                modelo_curto: MODELOS_CHECKLIST[modelo].curto,
                indice,
                total_modelo: total,
                rotulo: total > 1 ? `${MODELOS_CHECKLIST[modelo].curto} ${indice}/${total}` : MODELOS_CHECKLIST[modelo].curto,
                descricao_item: desc
            });
        });
    }
    return { unidades, semChecklist };
}

function parseDataOS(str) {
    const s = String(str || '').trim();
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
}

function hojeISO() {
    const agora = new Date(Date.now() - 3 * 3600 * 1000);
    return agora.toISOString().slice(0, 10);
}

module.exports = function registerAppEntregasRoutes(app, db, authenticateToken, r2) {
    const run = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function (err) { if (err) reject(err); else resolve(this); });
    });
    const get = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
    });
    const all = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows || []); });
    });

    // ── Migração idempotente ──────────────────────────────────────────────────
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS entregas_checklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            os_id INTEGER NOT NULL,
            numero_os TEXT,
            data_entrega TEXT,
            unidade_key TEXT NOT NULL,
            modelo TEXT NOT NULL,
            indice INTEGER DEFAULT 1,
            total_modelo INTEGER DEFAULT 1,
            descricao_item TEXT,
            checklist_json TEXT DEFAULT '{}',
            status TEXT DEFAULT 'em_andamento',
            tem_avaria INTEGER DEFAULT 0,
            conferido_por_id INTEGER,
            conferido_por_nome TEXT,
            conferido_por_foto TEXT,
            conferido_em DATETIME,
            reaberto_por_id INTEGER,
            reaberto_em DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(os_id, unidade_key)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS entregas_checklist_midias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            os_id INTEGER NOT NULL,
            unidade_key TEXT NOT NULL,
            tipo TEXT NOT NULL,
            item_key TEXT,
            r2_key TEXT NOT NULL,
            mime TEXT,
            nome_original TEXT,
            tamanho INTEGER DEFAULT 0,
            criado_por_id INTEGER,
            criado_por_nome TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE INDEX IF NOT EXISTS idx_ent_chk_os ON entregas_checklist(os_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ent_chk_data ON entregas_checklist(data_entrega)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_ent_mid_os ON entregas_checklist_midias(os_id, unidade_key)`);

        db.run(`CREATE TABLE IF NOT EXISTS app_lideranca_config (
            chave TEXT PRIMARY KEY,
            valor TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            db.run(`INSERT OR IGNORE INTO app_lideranca_config (chave, valor) VALUES ('entregas_inicio_controle', ?)`, [INICIO_PADRAO]);
        });
    });

    // ── Controle de acesso (mesmo padrão da tela Candidatos / Retiradas) ──────
    function isAdmin(user) {
        if (!user) return false;
        const r = String(user.role || '').toLowerCase();
        return r === 'admin' || r === 'rh' || r === 'master';
    }
    async function temPermissao(user) {
        if (!user) return false;
        if (isAdmin(user)) return true;
        if (user.perfil_id) {
            const p = await get(`SELECT permitido FROM perfis_permissoes WHERE perfil_id = ? AND pagina_id = ?`, [user.perfil_id, PAGE_ID]);
            if (p) return p.permitido === 1;
        }
        const u = await get(`SELECT permitido FROM usuarios_permissoes WHERE usuario_id = ? AND pagina_id = ?`, [user.id, PAGE_ID]);
        return !!(u && u.permitido === 1);
    }
    function exigirAcesso(req, res, next) {
        temPermissao(req.user).then(ok => {
            if (!ok) return res.status(403).json({ error: 'Acesso negado à tela Liderança › Entregas.' });
            next();
        }).catch(err => res.status(500).json({ error: err.message }));
    }

    async function getInicioControle() {
        const r = await get(`SELECT valor FROM app_lideranca_config WHERE chave = 'entregas_inicio_controle'`);
        return (r && r.valor) ? r.valor : INICIO_PADRAO;
    }

    // Resolve foto e nome completo do usuário logado (vinculando com colaboradores se possível)
    async function dadosLider(user) {
        const u = await get(`SELECT id, username, email, avatar_url, colaborador_id FROM usuarios WHERE id = ?`, [user.id]);
        let nome = (u && u.username) || user.username || 'Líder';
        let foto = (u && u.avatar_url) || null;
        if (u && u.colaborador_id) {
            const c = await get(`SELECT nome_completo, avatar_url FROM colaboradores WHERE id = ?`, [u.colaborador_id]);
            if (c) {
                if (c.nome_completo) nome = c.nome_completo;
                if (!foto && c.avatar_url) foto = c.avatar_url;
            }
        }
        return { id: user.id, nome, foto };
    }

    // ── Mapa de motorista/veículo a partir do Resumo de Rota ──────────────────
    async function montarMapaResumo(datasIso) {
        if (!datasIso.length) return {};
        const unicas = Array.from(new Set(datasIso));
        const placeholders = unicas.map(() => '?').join(',');
        const rows = await all(`SELECT data_rota, cards_json FROM logistica_resumo_rota WHERE data_rota IN (${placeholders})`, unicas);
        const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        const porData = {};
        for (const r of rows) {
            let cards = [];
            try { cards = JSON.parse(r.cards_json || '[]'); } catch (_) { cards = []; }
            if (!Array.isArray(cards)) continue;
            const lista = [];
            for (const c of cards) {
                const veiculo = c.veiculo || '';
                const motorista = c.motorista || '';
                const ajudante = c.ajudante || '';
                const itens = Array.isArray(c.itens) ? c.itens : [];
                itens.forEach((it, idx) => {
                    const tipo = String(it.tipo || '').toUpperCase();
                    if (!/ENTREGA/.test(tipo)) return;
                    lista.push({
                        veiculo,
                        motorista,
                        ajudante,
                        clienteNorm: norm(it.cliente),
                        enderecoNorm: norm(it.endereco),
                        cidadeNorm: norm(it.cidade),
                        horario: it.horario || '',
                        ordem: idx + 1,
                        totalParadas: itens.length
                    });
                });
            }
            porData[r.data_rota] = lista;
        }
        return { porData, norm };
    }

    function casarRota(osRow, dataIso, mapa) {
        if (!mapa || !mapa.porData || !mapa.porData[dataIso]) return null;
        const lista = mapa.porData[dataIso];
        if (!lista.length) return null;
        const cliOs = mapa.norm(osRow.cliente);
        const endOs = mapa.norm(osRow.endereco);
        for (const it of lista) {
            if (cliOs && it.clienteNorm && (cliOs.includes(it.clienteNorm) || it.clienteNorm.includes(cliOs))) return it;
        }
        for (const it of lista) {
            if (endOs && it.enderecoNorm && endOs.slice(0, 18) === it.enderecoNorm.slice(0, 18)) return it;
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. LISTAGEM DA AGENDA + FILTROS + PENDÊNCIAS
    // ═══════════════════════════════════════════════════════════════════════════
    app.get('/api/app/entregas', authenticateToken, exigirAcesso, async (req, res) => {
        try {
            const inicioControle = await getInicioControle();
            const hoje = hojeISO();
            const de = /^\d{4}-\d{2}-\d{2}$/.test(req.query.de || '') ? req.query.de : '2020-01-01';
            const ate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.ate || '') ? req.query.ate : '2099-12-31';

            const osRows = await all(`
                SELECT id, numero_os, cliente, contrato, data_os, endereco, complemento,
                       responsavel, telefone, diurno, noturno, horario_ini, horario_fim,
                       tipo_servico, obs_internas, obs_motoristas, itens_json, coluna,
                       veiculo_id, motorista_id, usuario_nome
                  FROM os_logistica
                 WHERE LOWER(tipo_servico) LIKE '%entrega%'
                 ORDER BY id DESC
            `);

            const filtradas = [];
            const datasParaRota = [];
            const osIds = [];
            for (const o of osRows) {
                const dataIso = parseDataOS(o.data_os);
                if (!dataIso) continue;
                const noPeriodo = dataIso >= de && dataIso <= ate;
                const noControle = dataIso >= inicioControle && dataIso <= hoje;
                if (!noPeriodo && !noControle) continue;
                o._dataIso = dataIso;
                filtradas.push(o);
                datasParaRota.push(dataIso);
                osIds.push(o.id);
            }

            const chkPorOs = {};
            const midCountPorOs = {};
            if (osIds.length) {
                const ph = osIds.map(() => '?').join(',');
                const chks = await all(`SELECT * FROM entregas_checklist WHERE os_id IN (${ph})`, osIds);
                for (const c of chks) {
                    if (!chkPorOs[c.os_id]) chkPorOs[c.os_id] = {};
                    chkPorOs[c.os_id][c.unidade_key] = c;
                }
                const mids = await all(`SELECT os_id, unidade_key, tipo, COUNT(*) AS qtd FROM entregas_checklist_midias WHERE os_id IN (${ph}) GROUP BY os_id, unidade_key, tipo`, osIds);
                for (const m of mids) {
                    const k = `${m.os_id}:${m.unidade_key}`;
                    if (!midCountPorOs[k]) midCountPorOs[k] = { foto: 0, video: 0 };
                    midCountPorOs[k][m.tipo] = m.qtd;
                }
            }

            const mapaRota = await montarMapaResumo(datasParaRota);

            const itens = filtradas.map(o => {
                const { unidades, semChecklist } = explodirUnidades(o.itens_json);
                const chks = chkPorOs[o.id] || {};
                let concluidas = 0;
                let comAvaria = 0;
                let emAndamento = 0;
                let ultimoConferente = null;

                const unidadesResumo = unidades.map(u => {
                    const reg = chks[u.unidade_key];
                    const totalItens = MODELOS_CHECKLIST[u.modelo].itens.length;
                    let respondidos = 0;
                    let avariasUnidade = 0;
                    if (reg && reg.checklist_json) {
                        try {
                            const obj = JSON.parse(reg.checklist_json);
                            for (const it of MODELOS_CHECKLIST[u.modelo].itens) {
                                const v = obj[it.key];
                                if (v && (v.status === 'ok' || v.status === 'avaria')) {
                                    respondidos++;
                                    if (v.status === 'avaria') avariasUnidade++;
                                }
                            }
                        } catch (_) {}
                    }
                    const status = reg ? reg.status : 'pendente';
                    if (status === 'concluido') concluidas++;
                    else if (respondidos > 0) emAndamento++;
                    if ((reg && reg.tem_avaria) || avariasUnidade > 0) comAvaria++;
                    if (reg && reg.conferido_por_nome && (!ultimoConferente || (reg.conferido_em || '') >= (ultimoConferente.em || ''))) {
                        ultimoConferente = {
                            id: reg.conferido_por_id,
                            nome: reg.conferido_por_nome,
                            foto: reg.conferido_por_foto,
                            em: reg.conferido_em
                        };
                    }
                    const mc = midCountPorOs[`${o.id}:${u.unidade_key}`] || { foto: 0, video: 0 };
                    return {
                        unidade_key: u.unidade_key,
                        modelo: u.modelo,
                        rotulo: u.rotulo,
                        descricao_item: u.descricao_item,
                        status,
                        tem_avaria: !!((reg && reg.tem_avaria) || avariasUnidade > 0),
                        avarias: avariasUnidade,
                        respondidos,
                        total_itens: totalItens,
                        fotos: mc.foto || 0,
                        videos: mc.video || 0,
                        conferido_por_nome: reg ? reg.conferido_por_nome : null,
                        conferido_por_foto: reg ? reg.conferido_por_foto : null,
                        conferido_em: reg ? reg.conferido_em : null
                    };
                });

                const totalUnidades = unidades.length;
                const tudoConcluido = totalUnidades > 0 && concluidas === totalUnidades;
                const pendente = totalUnidades > 0 && !tudoConcluido && o._dataIso >= inicioControle && o._dataIso <= hoje;

                let situacao = 'pendente';
                if (totalUnidades === 0) situacao = 'sem_checklist';
                else if (tudoConcluido && comAvaria > 0) situacao = 'avaria';
                else if (tudoConcluido) situacao = 'ok';
                else if (emAndamento > 0 || concluidas > 0) situacao = 'andamento';

                const rota = casarRota(o, o._dataIso, mapaRota);

                return {
                    os_id: o.id,
                    numero_os: o.numero_os || String(o.id),
                    cliente: o.cliente || 'Cliente não informado',
                    contrato: o.contrato || '',
                    data_iso: o._dataIso,
                    data_br: o.data_os,
                    endereco: o.endereco || '',
                    complemento: o.complemento || '',
                    horario_ini: o.horario_ini || '',
                    horario_fim: o.horario_fim || '',
                    turno: o.noturno ? 'noturno' : 'diurno',
                    tipo_servico: o.tipo_servico || '',
                    coluna_pipeline: o.coluna || '',
                    motorista: (rota && rota.motorista) || o.motorista_id || '',
                    ajudante: (rota && rota.ajudante) || '',
                    veiculo: (rota && rota.veiculo) || o.veiculo_id || '',
                    ordem_rota: rota ? `${rota.ordem}/${rota.totalParadas}` : '',
                    horario_rota: rota ? rota.horario : '',
                    total_unidades: totalUnidades,
                    unidades_concluidas: concluidas,
                    unidades_com_avaria: comAvaria,
                    tem_avaria: comAvaria > 0,
                    situacao,
                    pendente,
                    futura: o._dataIso > hoje,
                    conferente: ultimoConferente,
                    unidades: unidadesResumo,
                    sem_checklist: semChecklist
                };
            });

            res.json({
                inicio_controle: inicioControle,
                hoje,
                itens
            });
        } catch (err) {
            console.error('[APP-ENTREGAS] Erro na listagem:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. DETALHE COMPLETO DE UMA OS DE ENTREGA + TODAS AS UNIDADES E MÍDIAS
    // ═══════════════════════════════════════════════════════════════════════════
    app.get('/api/app/entregas/os/:id', authenticateToken, exigirAcesso, async (req, res) => {
        try {
            const osId = Number(req.params.id);
            const o = await get(`SELECT * FROM os_logistica WHERE id = ? AND LOWER(tipo_servico) LIKE '%entrega%'`, [osId]);
            if (!o) return res.status(404).json({ error: 'OS de entrega não encontrada.' });

            const dataIso = parseDataOS(o.data_os) || hojeISO();
            const mapaRota = await montarMapaResumo([dataIso]);
            const rota = casarRota(o, dataIso, mapaRota);
            const { unidades, semChecklist } = explodirUnidades(o.itens_json);

            const chks = await all(`SELECT * FROM entregas_checklist WHERE os_id = ?`, [osId]);
            const chkMap = {};
            for (const c of chks) chkMap[c.unidade_key] = c;

            const mids = await all(`SELECT id, os_id, unidade_key, tipo, item_key, mime, nome_original, tamanho, criado_por_nome, created_at FROM entregas_checklist_midias WHERE os_id = ? ORDER BY id ASC`, [osId]);
            const midPorUnidade = {};
            for (const m of mids) {
                if (!midPorUnidade[m.unidade_key]) midPorUnidade[m.unidade_key] = [];
                midPorUnidade[m.unidade_key].push({
                    ...m,
                    url: `/api/app/entregas/midia/${m.id}`
                });
            }

            const unidadesDetalhe = unidades.map(u => {
                const reg = chkMap[u.unidade_key];
                let respostas = {};
                if (reg && reg.checklist_json) {
                    try { respostas = JSON.parse(reg.checklist_json) || {}; } catch (_) { respostas = {}; }
                }
                const midiasUnidade = midPorUnidade[u.unidade_key] || [];
                const fotosPorItem = {};
                const videos = [];
                for (const m of midiasUnidade) {
                    if (m.tipo === 'video') videos.push(m);
                    else if (m.item_key) fotosPorItem[m.item_key] = m;
                }
                const itensModelo = MODELOS_CHECKLIST[u.modelo].itens.map(it => {
                    const r = respostas[it.key] || {};
                    return {
                        key: it.key,
                        label: it.label,
                        status: r.status || null,
                        obs: r.obs || '',
                        foto: fotosPorItem[it.key] || null
                    };
                });
                return {
                    ...u,
                    status: reg ? reg.status : 'pendente',
                    tem_avaria: !!(reg && reg.tem_avaria),
                    conferido_por_id: reg ? reg.conferido_por_id : null,
                    conferido_por_nome: reg ? reg.conferido_por_nome : null,
                    conferido_por_foto: reg ? reg.conferido_por_foto : null,
                    conferido_em: reg ? reg.conferido_em : null,
                    itens: itensModelo,
                    videos
                };
            });

            res.json({
                os: {
                    id: o.id,
                    numero_os: o.numero_os || String(o.id),
                    cliente: o.cliente || '',
                    contrato: o.contrato || '',
                    data_iso: dataIso,
                    data_br: o.data_os,
                    endereco: o.endereco || '',
                    complemento: o.complemento || '',
                    responsavel: o.responsavel || '',
                    telefone: o.telefone || '',
                    horario_ini: o.horario_ini || '',
                    horario_fim: o.horario_fim || '',
                    turno: o.noturno ? 'noturno' : 'diurno',
                    tipo_servico: o.tipo_servico || '',
                    obs_internas: o.obs_internas || '',
                    obs_motoristas: o.obs_motoristas || '',
                    motorista: (rota && rota.motorista) || o.motorista_id || '',
                    ajudante: (rota && rota.ajudante) || '',
                    veiculo: (rota && rota.veiculo) || o.veiculo_id || '',
                    ordem_rota: rota ? `${rota.ordem}/${rota.totalParadas}` : '',
                    horario_rota: rota ? rota.horario : ''
                },
                unidades: unidadesDetalhe,
                sem_checklist: semChecklist,
                pode_reabrir: isAdmin(req.user)
            });
        } catch (err) {
            console.error('[APP-ENTREGAS] Erro no detalhe:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. AUTOSAVE DO CHECKLIST DE UMA UNIDADE (joinha 👍/👎 + observação por item)
    // ═══════════════════════════════════════════════════════════════════════════
    app.put('/api/app/entregas/os/:id/unidades/:key/checklist', authenticateToken, exigirAcesso, async (req, res) => {
        try {
            const osId = Number(req.params.id);
            const unidadeKey = String(req.params.key || '').trim();
            const o = await get(`SELECT id, numero_os, data_os, itens_json FROM os_logistica WHERE id = ?`, [osId]);
            if (!o) return res.status(404).json({ error: 'OS não encontrada.' });

            const { unidades } = explodirUnidades(o.itens_json);
            const u = unidades.find(x => x.unidade_key === unidadeKey);
            if (!u) return res.status(404).json({ error: 'Unidade não encontrada nesta OS.' });

            const existente = await get(`SELECT * FROM entregas_checklist WHERE os_id = ? AND unidade_key = ?`, [osId, unidadeKey]);
            if (existente && existente.status === 'concluido') {
                return res.status(409).json({ error: 'Checklist já concluído. Reabra para editar.' });
            }

            let atual = {};
            if (existente && existente.checklist_json) {
                try { atual = JSON.parse(existente.checklist_json) || {}; } catch (_) { atual = {}; }
            }

            const itensPermitidos = new Set(MODELOS_CHECKLIST[u.modelo].itens.map(i => i.key));
            const entrada = req.body && req.body.itens ? req.body.itens : {};
            for (const k of Object.keys(entrada)) {
                if (!itensPermitidos.has(k)) continue;
                const v = entrada[k] || {};
                const st = v.status === 'ok' || v.status === 'avaria' ? v.status : null;
                const obs = typeof v.obs === 'string' ? v.obs.slice(0, 1000) : (atual[k] ? atual[k].obs || '' : '');
                atual[k] = { status: st, obs };
            }

            let temAvaria = 0;
            for (const k of Object.keys(atual)) {
                if (atual[k] && atual[k].status === 'avaria') { temAvaria = 1; break; }
            }

            const dataIso = parseDataOS(o.data_os) || hojeISO();
            const jsonStr = JSON.stringify(atual);

            if (!existente) {
                await run(`
                    INSERT INTO entregas_checklist
                        (os_id, numero_os, data_entrega, unidade_key, modelo, indice, total_modelo, descricao_item, checklist_json, status, tem_avaria)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'em_andamento', ?)
                `, [osId, o.numero_os || String(o.id), dataIso, unidadeKey, u.modelo, u.indice, u.total_modelo, u.descricao_item, jsonStr, temAvaria]);
            } else {
                await run(`
                    UPDATE entregas_checklist
                       SET checklist_json = ?, tem_avaria = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?
                `, [jsonStr, temAvaria, existente.id]);
            }

            res.json({ ok: true, tem_avaria: !!temAvaria, checklist: atual });
        } catch (err) {
            console.error('[APP-ENTREGAS] Erro ao salvar checklist:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. UPLOAD DE FOTO (por item) OU VÍDEO (por equipamento) NO CLOUDFLARE R2
    // ═══════════════════════════════════════════════════════════════════════════
    app.post('/api/app/entregas/os/:id/unidades/:key/midia', authenticateToken, exigirAcesso, async (req, res) => {
        try {
            if (!r2 || !r2.isReady()) {
                return res.status(503).json({ error: 'Cloudflare R2 não está configurado no servidor.' });
            }
            const osId = Number(req.params.id);
            const unidadeKey = String(req.params.key || '').trim();
            const { tipo, item_key, base64, mime, nome } = req.body || {};

            if (tipo !== 'foto' && tipo !== 'video') {
                return res.status(400).json({ error: 'Tipo de mídia inválido (use foto ou video).' });
            }
            const o = await get(`SELECT id, numero_os, data_os, itens_json FROM os_logistica WHERE id = ?`, [osId]);
            if (!o) return res.status(404).json({ error: 'OS não encontrada.' });

            const { unidades } = explodirUnidades(o.itens_json);
            const u = unidades.find(x => x.unidade_key === unidadeKey);
            if (!u) return res.status(404).json({ error: 'Unidade não encontrada nesta OS.' });

            const existente = await get(`SELECT status FROM entregas_checklist WHERE os_id = ? AND unidade_key = ?`, [osId, unidadeKey]);
            if (existente && existente.status === 'concluido') {
                return res.status(409).json({ error: 'Checklist já concluído. Reabra para alterar mídias.' });
            }

            if (tipo === 'foto') {
                const valido = MODELOS_CHECKLIST[u.modelo].itens.some(i => i.key === item_key);
                if (!valido) return res.status(400).json({ error: 'Item do checklist inválido para foto.' });
            }

            const limpo = String(base64 || '').replace(/^data:[^;]+;base64,/, '');
            if (!limpo) return res.status(400).json({ error: 'Arquivo vazio.' });
            const buffer = Buffer.from(limpo, 'base64');

            const ehVideo = tipo === 'video';
            const limite = ehVideo ? 60 * 1024 * 1024 : 15 * 1024 * 1024;
            if (buffer.length > limite) {
                return res.status(413).json({ error: ehVideo ? 'Vídeo acima do limite de 60 MB.' : 'Foto acima do limite de 15 MB.' });
            }

            const contentType = mime || (ehVideo ? 'video/mp4' : 'image/jpeg');
            const ext = ehVideo
                ? (contentType.includes('webm') ? 'webm' : contentType.includes('quicktime') ? 'mov' : 'mp4')
                : (contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg');

            const dataIso = parseDataOS(o.data_os) || hojeISO();
            const [y, m, d] = dataIso.split('-');
            const hash = crypto.randomBytes(4).toString('hex');
            const r2Key = `entregas-checklist/${y}/${m}/${d}/OS${o.numero_os || osId}_${u.modelo}${u.indice}_${ehVideo ? 'video' : item_key}_${Date.now()}_${hash}.${ext}`;

            // Se for foto de item e já existir uma foto anterior para o mesmo item, remove do R2 e do banco
            if (tipo === 'foto' && item_key) {
                const ant = await all(`SELECT id, r2_key FROM entregas_checklist_midias WHERE os_id = ? AND unidade_key = ? AND tipo = 'foto' AND item_key = ?`, [osId, unidadeKey, item_key]);
                for (const a of ant) {
                    if (a.r2_key) await r2.deleteFromR2(a.r2_key).catch(() => {});
                    await run(`DELETE FROM entregas_checklist_midias WHERE id = ?`, [a.id]);
                }
            }

            await r2.uploadToR2(r2Key, buffer, contentType);
            const lider = await dadosLider(req.user);

            const ins = await run(`
                INSERT INTO entregas_checklist_midias
                    (os_id, unidade_key, tipo, item_key, r2_key, mime, nome_original, tamanho, criado_por_id, criado_por_nome)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [osId, unidadeKey, tipo, ehVideo ? null : item_key, r2Key, contentType, nome || `${tipo}.${ext}`, buffer.length, lider.id, lider.nome]);

            res.json({
                ok: true,
                midia: {
                    id: ins.lastID,
                    os_id: osId,
                    unidade_key: unidadeKey,
                    tipo,
                    item_key: ehVideo ? null : item_key,
                    mime: contentType,
                    tamanho: buffer.length,
                    url: `/api/app/entregas/midia/${ins.lastID}`
                }
            });
        } catch (err) {
            console.error('[APP-ENTREGAS] Erro no upload de mídia:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Stream privado de foto/vídeo a partir do R2
    app.get('/api/app/entregas/midia/:id', authenticateToken, exigirAcesso, async (req, res) => {
        try {
            const m = await get(`SELECT r2_key, mime, nome_original FROM entregas_checklist_midias WHERE id = ?`, [Number(req.params.id)]);
            if (!m || !m.r2_key) return res.status(404).send('Mídia não encontrada.');
            const { stream, contentType, contentLength } = await r2.downloadStreamFromR2(m.r2_key);
            res.setHeader('Content-Type', m.mime || contentType || 'application/octet-stream');
            if (contentLength) res.setHeader('Content-Length', String(contentLength));
            res.setHeader('Cache-Control', 'private, max-age=3600');
            stream.pipe(res);
        } catch (err) {
            console.error('[APP-ENTREGAS] Erro ao baixar mídia:', err.message);
            res.status(404).send('Arquivo não encontrado no storage.');
        }
    });

    // Exclusão de mídia (deleta do R2 antes do banco)
    app.delete('/api/app/entregas/midia/:id', authenticateToken, exigirAcesso, async (req, res) => {
        try {
            const m = await get(`SELECT * FROM entregas_checklist_midias WHERE id = ?`, [Number(req.params.id)]);
            if (!m) return res.status(404).json({ error: 'Mídia não encontrada.' });
            const chk = await get(`SELECT status FROM entregas_checklist WHERE os_id = ? AND unidade_key = ?`, [m.os_id, m.unidade_key]);
            if (chk && chk.status === 'concluido') {
                return res.status(409).json({ error: 'Checklist concluído. Reabra para remover mídias.' });
            }
            if (m.r2_key && r2 && r2.isReady()) {
                await r2.deleteFromR2(m.r2_key).catch(() => {});
            }
            await run(`DELETE FROM entregas_checklist_midias WHERE id = ?`, [m.id]);
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. CONCLUIR E REABRIR CONFERÊNCIA DA UNIDADE
    //    Regras: todos os itens com 👍 ou 👎, 1 foto por item, observação se 👎
    // ═══════════════════════════════════════════════════════════════════════════
    app.post('/api/app/entregas/os/:id/unidades/:key/concluir', authenticateToken, exigirAcesso, async (req, res) => {
        try {
            const osId = Number(req.params.id);
            const unidadeKey = String(req.params.key || '').trim();
            const o = await get(`SELECT id, numero_os, data_os, itens_json FROM os_logistica WHERE id = ?`, [osId]);
            if (!o) return res.status(404).json({ error: 'OS não encontrada.' });

            const { unidades } = explodirUnidades(o.itens_json);
            const u = unidades.find(x => x.unidade_key === unidadeKey);
            if (!u) return res.status(404).json({ error: 'Unidade não encontrada nesta OS.' });

            const chk = await get(`SELECT * FROM entregas_checklist WHERE os_id = ? AND unidade_key = ?`, [osId, unidadeKey]);
            let respostas = {};
            if (chk && chk.checklist_json) {
                try { respostas = JSON.parse(chk.checklist_json) || {}; } catch (_) { respostas = {}; }
            }

            const fotos = await all(`SELECT item_key FROM entregas_checklist_midias WHERE os_id = ? AND unidade_key = ? AND tipo = 'foto'`, [osId, unidadeKey]);
            const itensComFoto = new Set(fotos.map(f => f.item_key));

            const faltandoResposta = [];
            const faltandoFoto = [];
            const faltandoObs = [];
            let temAvaria = 0;

            for (const it of MODELOS_CHECKLIST[u.modelo].itens) {
                const r = respostas[it.key] || {};
                if (r.status !== 'ok' && r.status !== 'avaria') {
                    faltandoResposta.push(it.label);
                } else if (r.status === 'avaria') {
                    temAvaria = 1;
                    if (!String(r.obs || '').trim()) faltandoObs.push(it.label);
                }
                if (!itensComFoto.has(it.key)) {
                    faltandoFoto.push(it.label);
                }
            }

            if (faltandoResposta.length || faltandoFoto.length || faltandoObs.length) {
                const partes = [];
                if (faltandoResposta.length) partes.push(`Marque 👍 ou 👎 em: ${faltandoResposta.join(', ')}`);
                if (faltandoFoto.length) partes.push(`Tire a foto obrigatória de: ${faltandoFoto.join(', ')}`);
                if (faltandoObs.length) partes.push(`Descreva a avaria (👎) em: ${faltandoObs.join(', ')}`);
                return res.status(400).json({
                    error: partes.join(' · '),
                    faltando_resposta: faltandoResposta,
                    faltando_foto: faltandoFoto,
                    faltando_obs: faltandoObs
                });
            }

            const lider = await dadosLider(req.user);
            const dataIso = parseDataOS(o.data_os) || hojeISO();

            if (!chk) {
                await run(`
                    INSERT INTO entregas_checklist
                        (os_id, numero_os, data_entrega, unidade_key, modelo, indice, total_modelo, descricao_item,
                         checklist_json, status, tem_avaria, conferido_por_id, conferido_por_nome, conferido_por_foto, conferido_em)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'concluido', ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `, [osId, o.numero_os || String(o.id), dataIso, unidadeKey, u.modelo, u.indice, u.total_modelo, u.descricao_item,
                    JSON.stringify(respostas), temAvaria, lider.id, lider.nome, lider.foto]);
            } else {
                await run(`
                    UPDATE entregas_checklist
                       SET status = 'concluido',
                           tem_avaria = ?,
                           conferido_por_id = ?,
                           conferido_por_nome = ?,
                           conferido_por_foto = ?,
                           conferido_em = CURRENT_TIMESTAMP,
                           updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?
                `, [temAvaria, lider.id, lider.nome, lider.foto, chk.id]);
            }

            res.json({ ok: true, tem_avaria: !!temAvaria, conferente: lider });
        } catch (err) {
            console.error('[APP-ENTREGAS] Erro ao concluir:', err);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/app/entregas/os/:id/unidades/:key/reabrir', authenticateToken, exigirAcesso, async (req, res) => {
        try {
            if (!isAdmin(req.user)) {
                return res.status(403).json({ error: 'Somente administradores podem reabrir um checklist concluído.' });
            }
            const osId = Number(req.params.id);
            const unidadeKey = String(req.params.key || '').trim();
            await run(`
                UPDATE entregas_checklist
                   SET status = 'em_andamento',
                       reaberto_por_id = ?,
                       reaberto_em = CURRENT_TIMESTAMP,
                       updated_at = CURRENT_TIMESTAMP
                 WHERE os_id = ? AND unidade_key = ?
            `, [req.user.id, osId, unidadeKey]);
            res.json({ ok: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
};
