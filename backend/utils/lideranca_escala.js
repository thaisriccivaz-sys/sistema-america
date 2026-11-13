// ═══════════════════════════════════════════════════════════════════════════════
// UTILITÁRIO COMPARTILHADO: Escala dos 4 Líderes (2 Dia / 2 Noite) + Férias
// e Resolução de Usuário → Colaborador (Nome real + Foto, nunca username)
// Usado em: Resumo da Rota, Candidatos, Entregas e Retiradas (APP › Liderança)
// ═══════════════════════════════════════════════════════════════════════════════
"use strict";

const DIA_MAP = {
    dom: 0, domingo: 0,
    seg: 1, segunda: 1,
    ter: 2, terca: 2,
    qua: 3, quarta: 3,
    qui: 4, quinta: 4,
    sex: 5, sexta: 5,
    sab: 6, sabado: 6
};

// Os 2 líderes do turno Diurno por padrão (Vitor e Ana Paula são do Noturno)
const NOMES_DIURNO_PADRAO = ['eduardo', 'vivian'];
const NOMES_NOTURNO_PADRAO = ['vitor', 'ana paula'];

const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const normLow = s => norm(s).toLowerCase().replace(/\s+/g, ' ');

function isoDate(s) {
    const str = String(s || '').trim();
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const mBr = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (mBr) return `${mBr[3]}-${mBr[2]}-${mBr[1]}`;
    return null;
}

function nomeCurtoColab(nomeCompleto) {
    const limp = String(nomeCompleto || '').replace(/[._]+/g, ' ').trim();
    const partes = limp.split(/\s+/).filter(Boolean);
    if (partes.length <= 2) return partes.join(' ');
    const prep = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
    if (prep.has(partes[1].toLowerCase()) && partes[2]) {
        return `${partes[0]} ${partes[1]} ${partes[2]}`;
    }
    return `${partes[0]} ${partes[1]}`;
}

// Verifica se o colaborador está em período de férias na data `dateStr` (YYYY-MM-DD)
function colabEmFerias(c, dateStr) {
    if (!c || !dateStr) return false;
    const fi1 = isoDate(c.ferias_programadas_inicio);
    const ff1 = isoDate(c.ferias_programadas_fim);
    if (fi1 && ff1 && dateStr >= fi1 && dateStr <= ff1) return true;

    if (String(c.ferias_fracionadas || '') === 'Sim' && String(c.ferias_fracionadas_tipo || '') === 'Tirada') {
        const fi2 = isoDate(c.ferias_fracionadas_inicio2);
        const ff2 = isoDate(c.ferias_fracionadas_fim2);
        if (fi2 && ff2 && dateStr >= fi2 && dateStr <= ff2) return true;
    }

    const st = normLow(c.status);
    if (st === 'ferias') {
        if (ff1 && dateStr > ff1) return false;
        if (fi1 && dateStr < fi1) return false;
        return true;
    }
    return false;
}

// Verifica se o colaborador está de folga na escala normal na data `dateStr` (YYYY-MM-DD)
function colabDeFolgaNormal(c, dateStr) {
    if (colabEmFerias(c, dateStr)) return true;

    const escalaStr = String(c.escala_tipo || '').toLowerCase();
    let explicitas = [];
    try {
        const p = JSON.parse(c.escala_folgas || '[]');
        explicitas = Array.isArray(p) ? p.map(f => normLow(f)) : [normLow(p)];
    } catch (e) {
        explicitas = String(c.escala_folgas || '').split(/[,;]+/).map(f => normLow(f)).filter(Boolean);
    }
    const folgasDow = explicitas.map(f => DIA_MAP[f]).filter(v => v !== undefined);
    const temCiclo = !!c.escala_ciclo_inicio && escalaStr.includes('folga');
    const cicloBase = temCiclo ? new Date(c.escala_ciclo_inicio + 'T12:00:00') : null;
    const ultimoFolgaDow = folgasDow.length >= 2 ? folgasDow[0] : null;
    const dayMs = 1000 * 60 * 60 * 24;

    const isDomingoDeLei = ds => {
        if (!temCiclo || !cicloBase) return false;
        const d = new Date(ds + 'T12:00:00');
        if (d.getDay() !== 0) return false;
        const ref = new Date(cicloBase);
        while (ref.getDay() !== 0) ref.setDate(ref.getDate() + 1);
        const n = Math.round(Math.round((d - ref) / dayMs) / 7);
        return ((n % 3) + 3) % 3 === 0;
    };

    const d = new Date(dateStr + 'T12:00:00');
    const dow = d.getDay();
    if (escalaStr.includes('12x36')) {
        if (!c.escala_ciclo_inicio) return false;
        const diff = d - new Date(c.escala_ciclo_inicio + 'T12:00:00');
        if (diff < 0) return false;
        return Math.round(diff / dayMs) % 2 === 1;
    }
    if (dow === 0 && isDomingoDeLei(dateStr)) return true;
    if (ultimoFolgaDow !== null && dow === ultimoFolgaDow) {
        const dom = new Date(dateStr + 'T12:00:00');
        dom.setDate(dom.getDate() - dow);
        if (isDomingoDeLei(dom.toISOString().split('T')[0])) return false;
    }
    if (escalaStr.includes('escala_uma_folga') || escalaStr.includes('escala_duas_folgas')) {
        if (folgasDow.length > 0) return folgasDow.includes(dow);
    }
    if (escalaStr.includes('sab_alternado') || escalaStr.includes('sabado_alternado')) {
        if (dow === 0) return true;
        if (dow === 6 && c.escala_ciclo_inicio) {
            const diff = d - new Date(c.escala_ciclo_inicio + 'T12:00:00');
            if (diff < 0) return false;
            return Math.round(diff / (dayMs * 7)) % 2 === 1;
        }
        return false;
    }
    if (escalaStr.includes('seg_sexta') || escalaStr.includes('5x2') || escalaStr.includes('5 x 2')) return dow === 0 || dow === 6;
    if (escalaStr.includes('6x1') || escalaStr.includes('6 x 1')) return dow === 0;
    return dow === 0;
}

// Verifica se um colaborador pertence aos 4 líderes operacionais (excluindo Joaquim Santana)
function ehLiderOperacional(c) {
    if (!c) return false;
    const nome = normLow(c.nome_completo);
    if (!nome || nome.includes('joaquim')) return false;
    if (normLow(c.status) === 'desligado') return false;
    const dep = normLow(c.departamento);
    if (dep.includes('lider')) return true;
    // Fallback pelos 4 nomes conhecidos caso o departamento esteja grafado diferente
    if (
        nome.startsWith('vivian ') ||
        nome.startsWith('eduardo ') ||
        nome.startsWith('vitor ') ||
        nome.startsWith('ana paula ')
    ) {
        return true;
    }
    return false;
}

function turnoDoLider(l) {
    const nome = normLow(l.nome_completo);
    if (NOMES_DIURNO_PADRAO.some(p => nome === p || nome.startsWith(p + ' '))) return 'diurno';
    if (NOMES_NOTURNO_PADRAO.some(p => nome === p || nome.startsWith(p + ' '))) return 'noturno';
    if (l.plantao_dia !== null && l.plantao_dia !== undefined) {
        return Number(l.plantao_dia) === 1 ? 'diurno' : 'noturno';
    }
    if (String(l.escala_tipo || '').toLowerCase().includes('12x36')) return 'noturno';
    return 'diurno';
}

// Calcula a escala de um turno (Diurno ou Noturno) na data `iso` (YYYY-MM-DD)
// Regra de férias: Temos 4 líderes (2 de dia e 2 de noite). Quando um do dia está de férias,
// o outro do dia trabalha de seg a sex (folga apenas sáb/dom). O mesmo quando um da noite está de férias.
function calcularTurnoComRegraFerias(listaLideresTurno, iso) {
    const d = new Date(iso + 'T12:00:00');
    const dow = d.getDay(); // 0 = Dom, 1..5 = Seg..Sex, 6 = Sáb

    const comFeriasMarcadas = listaLideresTurno.map(l => Object.assign({}, l, {
        em_ferias: colabEmFerias(l, iso)
    }));

    const algumEmFerias = comFeriasMarcadas.some(l => l.em_ferias);

    const processados = comFeriasMarcadas.map(l => {
        let deFolga = false;
        let motivoAusencia = null;
        if (l.em_ferias) {
            deFolga = true;
            motivoAusencia = 'Férias';
        } else if (algumEmFerias) {
            // Parceiro de turno está de férias -> este líder trabalha de segunda a sexta
            deFolga = (dow === 0 || dow === 6);
            if (deFolga) motivoAusencia = 'Folga';
        } else {
            deFolga = colabDeFolgaNormal(l, iso);
            if (deFolga) motivoAusencia = 'Folga';
        }
        return Object.assign({}, l, {
            de_folga: deFolga,
            motivo_ausencia: motivoAusencia
        });
    });

    const escalados = processados.filter(l => !l.de_folga);
    const folga = processados.filter(l => l.de_folga && !l.em_ferias);
    const ferias = processados.filter(l => l.em_ferias);
    const ativosParaExibir = escalados.length ? escalados : processados.filter(l => !l.em_ferias);

    return {
        todos: processados,
        escalados: ativosParaExibir,
        folga,
        ferias,
        nomes: ativosParaExibir.map(l => l.nome_curto).join(' / ') || 'Sem líder escalado'
    };
}

async function carregarLideresBase(dbAll, dbRun) {
    if (dbRun) {
        try {
            await dbRun(`DELETE FROM app_lider_config WHERE colaborador_id IN (SELECT id FROM colaboradores WHERE LOWER(nome_completo) LIKE '%joaquim%')`);
        } catch (_) { /* ignora */ }
    }
    const rows = await dbAll(`
        SELECT c.id AS colab_id, c.nome_completo, c.cargo, c.departamento, c.status,
               c.escala_tipo, c.escala_folgas, c.escala_ciclo_inicio,
               c.ferias_programadas_inicio, c.ferias_programadas_fim,
               c.ferias_fracionadas, c.ferias_fracionadas_tipo,
               c.ferias_fracionadas_inicio2, c.ferias_fracionadas_fim2,
               c.foto_base64, c.foto_path,
               cfg.usuario_id, cfg.plantao_dia
        FROM colaboradores c
        LEFT JOIN app_lider_config cfg ON cfg.colaborador_id = c.id
        WHERE COALESCE(LOWER(TRIM(c.status)), '') != 'desligado'
    `);

    const lideres = rows.filter(ehLiderOperacional).map(l => {
        const turno = turnoDoLider(l);
        return {
            colab_id: l.colab_id,
            usuario_id: l.usuario_id || null,
            nome: l.nome_completo,
            nome_curto: nomeCurtoColab(l.nome_completo),
            turno,
            status: l.status,
            escala_tipo: l.escala_tipo,
            escala_folgas: l.escala_folgas,
            escala_ciclo_inicio: l.escala_ciclo_inicio,
            ferias_programadas_inicio: l.ferias_programadas_inicio,
            ferias_programadas_fim: l.ferias_programadas_fim,
            ferias_fracionadas: l.ferias_fracionadas,
            ferias_fracionadas_tipo: l.ferias_fracionadas_tipo,
            ferias_fracionadas_inicio2: l.ferias_fracionadas_inicio2,
            ferias_fracionadas_fim2: l.ferias_fracionadas_fim2,
            foto_url: `/api/colaboradores/foto/${l.colab_id}`
        };
    });

    return lideres;
}

function calcularEscalaDiaFromLideres(lideres, iso, uidLogado) {
    const diurnoBase = lideres.filter(l => l.turno === 'diurno');
    const noturnoBase = lideres.filter(l => l.turno === 'noturno');

    let turnoUsuario = null;
    if (uidLogado) {
        const achado = lideres.find(l => l.usuario_id && Number(l.usuario_id) === Number(uidLogado));
        if (achado) turnoUsuario = achado.turno;
    }

    const diurno = calcularTurnoComRegraFerias(diurnoBase, iso);
    const noturno = calcularTurnoComRegraFerias(noturnoBase, iso);

    return {
        turno_usuario: turnoUsuario,
        diurno,
        noturno
    };
}

async function obterEscalaLideresNoDia(dbAll, iso, uidLogado, dbRun) {
    const lideres = await carregarLideresBase(dbAll, dbRun);
    return calcularEscalaDiaFromLideres(lideres, iso, uidLogado);
}

// Resolve qualquer usuário/nome/username (ex: 'Thais.Ricci') para o colaborador real (nome + colab_id + foto_url)
function criarResolvedorColaborador(colabs, usuarios, configs) {
    const listaColabs = Array.isArray(colabs) ? colabs : [];
    const mapUserById = new Map();
    (usuarios || []).forEach(u => mapUserById.set(Number(u.id), u));
    const mapCfgByUser = new Map();
    (configs || []).forEach(c => { if (c.usuario_id) mapCfgByUser.set(Number(c.usuario_id), Number(c.colaborador_id)); });
    const mapColabById = new Map();
    listaColabs.forEach(c => mapColabById.set(Number(c.id), c));

    const stopTokens = new Set(['rh', 'logistica', 'comercial', 'adm', 'admin', 'diretoria', 'lider', 'lideranca', 'processos', 'sac', 'financeiro', 'operacional', 'da', 'de', 'do', 'das', 'dos']);

    function matchPorTexto(txt) {
        if (!txt) return null;
        const limpo = normLow(String(txt).replace(/[._-]+/g, ' '));
        if (!limpo) return null;

        // 1. Nome completo exato
        let c = listaColabs.find(col => normLow(col.nome_completo) === limpo);
        if (c) return c;

        // 2. Match por tokens (ex: 'thais.ricci' -> ['thais', 'ricci'] -> 'Thais Ricci Vaz')
        const tokens = limpo.split(/\s+/).filter(t => t.length >= 2 && !stopTokens.has(t));
        if (tokens.length >= 2) {
            c = listaColabs.find(col => {
                const cTokens = normLow(col.nome_completo).split(/\s+/);
                return tokens.every(t => cTokens.some(ct => ct === t || ct.startsWith(t)));
            });
            if (c) return c;
        }
        if (tokens.length >= 1) {
            const p = tokens[0];
            const cands = listaColabs.filter(col => {
                const cTokens = normLow(col.nome_completo).split(/\s+/);
                return cTokens[0] === p;
            });
            if (cands.length === 1) return cands[0];
        }
        return null;
    }

    return function resolverPessoa({ usuario_id, colab_id, nome }) {
        let colab = null;
        if (colab_id && mapColabById.has(Number(colab_id))) {
            colab = mapColabById.get(Number(colab_id));
        }
        if (!colab && usuario_id && mapCfgByUser.has(Number(usuario_id))) {
            colab = mapColabById.get(mapCfgByUser.get(Number(usuario_id))) || null;
        }
        const userRow = usuario_id ? mapUserById.get(Number(usuario_id)) : null;
        if (!colab && userRow && typeof global.matchUsuarioComColaborador === 'function') {
            colab = global.matchUsuarioComColaborador(userRow, listaColabs);
        }
        if (!colab && userRow) {
            colab = matchPorTexto(userRow.nome) || matchPorTexto(userRow.username);
        }
        if (!colab && nome) {
            colab = matchPorTexto(nome);
        }

        if (colab) {
            const nc = nomeCurtoColab(colab.nome_completo);
            return {
                colab_id: colab.id,
                nome: nc,
                nome_completo: colab.nome_completo,
                foto_url: `/api/colaboradores/foto/${colab.id}`
            };
        }

        // Fallback: limpar pontos de username (ex: 'Thais.Ricci' -> 'Thais Ricci')
        const fallbackRaw = (userRow && userRow.nome && !userRow.nome.includes('.') ? userRow.nome : (nome || (userRow && userRow.username) || 'Líder'));
        const fallbackLimpo = String(fallbackRaw)
            .replace(/[._]+/g, ' ')
            .trim()
            .replace(/\b\w/g, l => l.toUpperCase());
        return {
            colab_id: null,
            nome: nomeCurtoColab(fallbackLimpo),
            nome_completo: fallbackLimpo,
            foto_url: null
        };
    };
}

async function resolverLiderDoReq(dbGet, dbAll, req) {
    const uid = (req.user && req.user.id) || null;
    const colabs = await dbAll(`SELECT id, nome_completo, email, email_corporativo, departamento, cargo, status, foto_base64, foto_path FROM colaboradores`);
    const usuarios = uid ? await dbAll(`SELECT id, username, nome, email, departamento FROM usuarios WHERE id = ?`, [uid]) : [];
    const configs = uid ? await dbAll(`SELECT colaborador_id, usuario_id FROM app_lider_config WHERE usuario_id = ?`, [uid]) : [];
    const resolver = criarResolvedorColaborador(colabs, usuarios, configs);
    const r = resolver({ usuario_id: uid, nome: req.user && (req.user.nome || req.user.username) });
    return {
        id: uid,
        nome: r.nome,
        nome_completo: r.nome_completo,
        colabId: r.colab_id,
        foto_url: r.foto_url
    };
}

module.exports = {
    DIA_MAP,
    NOMES_DIURNO_PADRAO,
    NOMES_NOTURNO_PADRAO,
    isoDate,
    nomeCurtoColab,
    colabEmFerias,
    colabDeFolgaNormal,
    ehLiderOperacional,
    turnoDoLider,
    calcularTurnoComRegraFerias,
    carregarLideresBase,
    calcularEscalaDiaFromLideres,
    obterEscalaLideresNoDia,
    criarResolvedorColaborador,
    resolverLiderDoReq
};
