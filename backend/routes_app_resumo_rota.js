// ═══════════════════════════════════════════════════════════════════════════════
// ROTAS: APP › LIDERANÇA › RESUMO DA ROTA  (uso operacional, mobile-first)
// Arquivo: backend/routes_app_resumo_rota.js
// Registro no server.js:
//   require('./routes_app_resumo_rota')(app, db, authenticateToken);
//
// - Exibe o Resumo de Rota do dia no mesmo formato visual da imagem exportada (Anexo 1)
// - Mostra placa/veículo, fotos circulares de Motorista, Ajudante e Candidato (se houver)
// - Observações de rota: check manual interativo pelo líder (salvo em app_resumo_rota_checks)
// - Entregas: check AUTOMÁTICO vindo de entregas_checklist (concluído no menu Entregas)
// - Retiradas: check AUTOMÁTICO vindo de retiradas_checklist (concluído no menu Retiradas)
// - Manutenção: calcula automaticamente os insumos por equipamento (STD/LX, ELX, PBII, PBIII)
//   e permite dar check em cada insumo necessário
// ═══════════════════════════════════════════════════════════════════════════════
"use strict";

const escalaUtil = require('./utils/lideranca_escala');

module.exports = function registerAppResumoRotaRoutes(app, db, authenticateToken) {

    const PAGE_ID = 'app-lideranca-resumo-rota';
    const TZ = 'America/Sao_Paulo';

    // ── Helpers de banco (promises) ────────────────────────────────────────────
    const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function (err) { if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes }); });
    });
    const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || null));
    });
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    });

    // ── Utilidades ──────────────────────────────────────────────────────────────
    const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const normLow = s => norm(s).toLowerCase().replace(/\s+/g, ' ');
    const slug = s => norm(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const parseJson = (s, fb) => { try { const v = JSON.parse(s); return v == null ? fb : v; } catch (e) { return fb; } };
    const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const isoDate = s => {
        const str = String(s || '').trim();
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        const mBr = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
        if (mBr) return `${mBr[3]}-${mBr[2]}-${mBr[1]}`;
        return null;
    };

    // ── Dicionário de Equipamentos e Ícones (idêntico ao resumo_rota.js) ───────
    const RR_EQ = {
        'STD O':  { nome: 'STD OBRA',              icon: '💙' },
        'STD E':  { nome: 'STD EVENTO',            icon: '💜' },
        'LX O':   { nome: 'LX OBRA',               icon: '🟦' },
        'LX E':   { nome: 'LX EVENTO',             icon: '🟪' },
        'ELX O':  { nome: 'ELX OBRA',              icon: '🔵' },
        'ELX E':  { nome: 'ELX EVENTO',            icon: '🟣' },
        'SLX O':  { nome: 'ELX OBRA',              icon: '🔵' },
        'SLX E':  { nome: 'ELX EVENTO',            icon: '🟣' },
        'PCD O':  { nome: 'PCD OBRA',              icon: '♿' },
        'PCD E':  { nome: 'PCD EVENTO',            icon: '🧑🏾‍🦽' },
        'CHUVEIRO O':  { nome: 'CHUVEIRO OBRA',    icon: '🚿' },
        'CHUVEIRO E':  { nome: 'CHUVEIRO EVENTO',  icon: '🚿' },
        'HIDRAULICO O':{ nome: 'HIDRÁULICO OBRA',  icon: '🚽' },
        'HIDRAULICO E':{ nome: 'HIDRÁULICO EVENTO',icon: '🚽' },
        'MICTORIO O':  { nome: 'MICTÓRIO OBRA',    icon: '💦' },
        'MICTORIO E':  { nome: 'MICTÓRIO EVENTO',  icon: '💦' },
        'PIA II O':    { nome: 'PBII OBRA',         icon: '🧼' },
        'PIA II E':    { nome: 'PBII EVENTO',       icon: '🧼' },
        'PIA III O':   { nome: 'PBIII OBRA',        icon: '🧼' },
        'PIA III E':   { nome: 'PBIII EVENTO',      icon: '🧼' },
        'PBII O':      { nome: 'PBII OBRA',         icon: '🧼' },
        'PBII E':      { nome: 'PBII EVENTO',       icon: '🧼' },
        'PBIII O':     { nome: 'PBIII OBRA',        icon: '🧼' },
        'PBIII E':     { nome: 'PBIII EVENTO',      icon: '🧼' },
        'PB II O':     { nome: 'PBII OBRA',         icon: '🧼' },
        'PB II E':     { nome: 'PBII EVENTO',       icon: '🧼' },
        'PB III O':    { nome: 'PBIII OBRA',        icon: '🧼' },
        'PB III E':    { nome: 'PBIII EVENTO',      icon: '🧼' },
        'GUARITA INDIVIDUAL O': { nome: 'GUARITA INDIVIDUAL OBRA',  icon: '⬜' },
        'GUARITA INDIVIDUAL E': { nome: 'GUARITA INDIVIDUAL EVENTO',icon: '⬜' },
        'GUARITA DUPLA O': { nome: 'GUARITA DUPLA OBRA',   icon: '⚪' },
        'GUARITA DUPLA E': { nome: 'GUARITA DUPLA EVENTO', icon: '⚪' },
        'GUARITA INDIVIDUAL OBRA':   { nome: 'GUARITA INDIVIDUAL OBRA',  icon: '⬜' },
        'GUARITA INDIVIDUAL EVENTO': { nome: 'GUARITA INDIVIDUAL EVENTO',icon: '⬜' },
        'GUARITA DUPLA OBRA':        { nome: 'GUARITA DUPLA OBRA',       icon: '⚪' },
        'GUARITA DUPLA EVENTO':      { nome: 'GUARITA DUPLA EVENTO',     icon: '⚪' },
        'GUARITA OBRA':              { nome: 'GUARITA INDIVIDUAL OBRA',  icon: '⬜' },
        'GUARITA EVENTO':            { nome: 'GUARITA INDIVIDUAL EVENTO',icon: '⬜' },
        'GUARITA O':                 { nome: 'GUARITA INDIVIDUAL OBRA',  icon: '⬜' },
        'GUARITA E':                 { nome: 'GUARITA INDIVIDUAL EVENTO',icon: '⬜' },
        'LIMPA FOSSA':    { nome: 'LIMPA FOSSA',    icon: '💧' },
        'VISITA TECNICA': { nome: 'VISITA TÉCNICA', icon: '⚙️' },
        'CARRINHO':       { nome: 'CARRINHO',        icon: '🛞' },
        'STD OBRA':       { nome: 'STD OBRA',        icon: '💙' },
        'STD EVENTO':     { nome: 'STD EVENTO',      icon: '💜' },
        'LX OBRA':        { nome: 'LX OBRA',         icon: '🟦' },
        'LX EVENTO':      { nome: 'LX EVENTO',       icon: '🟪' },
        'ELX OBRA':       { nome: 'ELX OBRA',        icon: '🔵' },
        'ELX EVENTO':     { nome: 'ELX EVENTO',      icon: '🟣' },
        'PCD OBRA':       { nome: 'PCD OBRA',        icon: '♿' },
        'PCD EVENTO':     { nome: 'PCD EVENTO',      icon: '🧑🏾‍🦽' },
        'PBII OBRA':      { nome: 'PBII OBRA',       icon: '🧼' },
        'PBII EVENTO':    { nome: 'PBII EVENTO',     icon: '🧼' },
        'PBIII OBRA':     { nome: 'PBIII OBRA',      icon: '🧼' },
        'PBIII EVENTO':   { nome: 'PBIII EVENTO',    icon: '🧼' },
        'CHUVEIRO OBRA':  { nome: 'CHUVEIRO OBRA',   icon: '🚿' },
        'CHUVEIRO EVENTO':{ nome: 'CHUVEIRO EVENTO', icon: '🚿' },
        'MICTORIO OBRA':  { nome: 'MICTÓRIO OBRA',   icon: '💦' },
        'MICTORIO EVENTO':{ nome: 'MICTÓRIO EVENTO', icon: '💦' },
    };

    const RR_VAR_ICONS = {
        'LEVAR CARRINHO':          '🛒',
        '🛒':                      '🛒',
        'NOTURNO':                 '🌘',
        '🌘':                      '🌘',
        'INFORMACOES IMPORTANTES': '🚨',
        'INFORMAÇÕES IMPORTANTES': '🚨',
        '🚨':                      '🚨',
        'ATENCAO AO HORARIO':      '⏰',
        'ATENÇÃO AO HORÁRIO':      '⏰',
        '⏰':                      '⏰',
        'LEVAR EXTENSORA':         '🌀',
        '🌀':                      '🌀',
        'VAC':                     '🏗️',
        '🏗️':                      '🏗️',
        'CARRETINHA':              '🔗',
        '🔗':                      '🔗',
        'LEVAR EPI':               '🦺',
        '🦺':                      '🦺',
        'TROCA DE CABINE':         '♻️',
        '♻️':                      '♻️',
        'INTEGRACAO':              '👷',
        'INTEGRAÇÃO':              '👷',
        '👷':                      '👷',
        'APOIO DE SUCCAO':         '💧',
        'APOIO DE SUCÇÃO':         '💧',
        '💧':                      '💧',
        'AVULSO':                  '❗',
        '❗':                      '❗',
        'REPAROS':                 '🔧',
        'REPARO':                  '🔧',
        '🔧':                      '🔧',
        'MONTAGEM':                '🛠️',
        'DESMONTAGEM':             '🛠️',
        '🛠️':                      '🛠️',
        'UTILITARIO':              '🛻',
        'UTILITÁRIO':              '🛻',
        '🛻':                      '🛻',
        'BANHEIRO ITINERANTE':     '🔛',
        '🔛':                      '🔛',
    };

    function limparLinksVideo(str) {
        if (!str) return '';
        return String(str)
            .replace(/(?:📸\s*)?(?:V[ÍIíi]DEO\s*:\s*)?HTTPS?:\/\/\S+/giu, '')
            .replace(/\bV[ÍIíi]DEO\s*:\s*/giu, '')
            .replace(/\s+[—–-]\s*$/g, '')
            .replace(/^\s*[—–-]\s+/g, '')
            .trim();
    }

    function ehApenasTipoServico(str) {
        if (!str) return false;
        const nucleo = norm(str)
            .toUpperCase()
            .replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\u{200D}\u{200C}\u{200B}\u{FEFF}\s🧑🏾‍🦽❗⭕🔗🌀🚨🔧🛠️]+/gu, '')
            .replace(/[.,;:!?-]+$/g, '')
            .trim();
        if (!nucleo) return false;
        return /^(ENTREGA|RETIRADA|MANUTENCAO|COMPRAS|VISITA|LIMPA\s+FOSSA|APOIO\s+DE\s+SUCCAO|SUCCAO|TROCA\s+DE\s+EQUIPAMENTO)(\s+(DE|DO|DA|EM|OBRA|EVENTO|AVULSA|AVULSO|TOTAL|PARCIAL|TECNICA|AMERICA|EQUIPAMENTO|SUCCAO|\d+\s*M[3³]?))*$/.test(nucleo);
    }

    function extrairObsValida(obsMotorista, obsInternas, servico, allowServiceName = true) {
        const limpar = (raw, allowServ) => {
            if (!raw) return '';
            let s = limparLinksVideo(raw)
                .replace(/^[,\s]+|[,\s]+$/g, '')
                .trim();
            if (!s || /AVISO IMPORTANTE!|VERIFICAR DETALHES!/i.test(s)) return '';
            s = s.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s❗⭕🔗🌀🚨]*MANUTEN[CÇ][AÃ]O\s+AVULSA\s*[-–:]\s*/iu, '').trim();
            if (!s) return '';
            const sNorm = norm(s).toUpperCase().replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s🧑🏾‍🦽❗⭕🔗🌀🚨🔧🛠️]+/gu, '').trim();
            const servNorm = norm(servico || '').toUpperCase().replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s🧑🏾‍🦽❗⭕🔗🌀🚨🔧🛠️]+/gu, '').trim();
            if (!allowServ) {
                if (ehApenasTipoServico(s)) return '';
                if (servNorm && sNorm === servNorm) return '';
            } else {
                if (servNorm && sNorm === servNorm) return '';
            }
            return s;
        };
        const c1 = limpar(obsMotorista, allowServiceName);
        if (c1) return c1;
        const c2 = limpar(obsInternas, allowServiceName);
        if (c2) return c2;
        if (servico && /\s[-–]\s/.test(String(servico))) {
            const c3 = limpar(String(servico).split(/\s[-–]\s/).slice(1).join(' - '), false);
            if (c3) return c3;
        }
        return '';
    }

    // Itens de saída que devem aparecer para o líder no Resumo da Rota:
    // - Variáveis/Ícones: Levar Carrinho (🛒), Levar Extensora (🌀), Apoio de Sucção (💧), Levar EPI (🦺)
    // - Habilidade da Equipe: VAC (🏗️), Reparos (🔧), Montagem (🛠️), Desmontagem (🛠️)
    const REGRAS_SAIDA_LIDER = [
        { id: 'CARRINHO',    icon: '🛒', label: 'LEVAR CARRINHO',   regex: /🛒|LEVAR\s+CARRINHO/i },
        { id: 'EXTENSORA',   icon: '🌀', label: 'LEVAR EXTENSORA',  regex: /🌀|LEVAR\s+EXTENSORA|\bEXTENSORA\b/i },
        { id: 'SUCCAO',      icon: '💧', label: 'APOIO DE SUCÇÃO',  regex: /💧|APOIO\s+(?:DE\s+)?SUCC?[AÃ]O/i },
        { id: 'EPI',         icon: '🦺', label: 'LEVAR EPI',        regex: /🦺|LEVAR\s+EPI|\bEPI\b/i },
        { id: 'VAC',         icon: '🏗️', label: 'VAC',              regex: /🏗️|\bVAC\b/i },
        { id: 'REPAROS',     icon: '🔧', label: 'REPAROS',          regex: /🔧|\bREPAROS?\b/i },
        { id: 'DESMONTAGEM', icon: '🛠️', label: 'DESMONTAGEM',      regex: /\bDESMONTAGEM\b/i },
        { id: 'MONTAGEM',    icon: '🛠️', label: 'MONTAGEM',         regex: /🛠️|\bMONTAGEM\b/i },
    ];

    function detectarItensSaidaTexto(texto) {
        const s = String(texto || '');
        const normS = norm(s).toUpperCase();
        const encontrados = [];
        for (const r of REGRAS_SAIDA_LIDER) {
            if (r.id === 'MONTAGEM' && /\bDESMONTAGEM\b/i.test(normS) && !/\bMONTAGEM\b/i.test(normS.replace(/\bDESMONTAGEM\b/gi, ''))) {
                continue;
            }
            if (r.regex.test(s) || r.regex.test(normS)) {
                encontrados.push(r);
            }
        }
        return encontrados;
    }

    function detectarItensSaidaOS(os) {
        if (!os) return [];
        const habs = Array.isArray(os.habilidades) ? os.habilidades.join(' ') : (os.habilidades || '');
        const vars = Array.isArray(os.variaveis) ? os.variaveis.join(' ') : (os.variaveis || '');
        const habEq = Array.isArray(os.habilidade_equipe) ? os.habilidade_equipe.join(' ') : (os.habilidade_equipe || '');
        const combinado = [vars, habEq, habs, os.cliente, os.obs, os.observacoes_internas, os.notas_raw].filter(Boolean).join(' ');
        return detectarItensSaidaTexto(combinado);
    }

    function rrObsIcon(t) {
        const up = String(t || '').toUpperCase();
        const icons = [];
        for (const [k, ic] of Object.entries(RR_VAR_ICONS)) {
            if (up.includes(k) && !icons.includes(ic)) icons.push(ic);
        }
        return icons.join('');
    }

    function rrEquip(codigo) {
        const original = String(codigo || '').trim().toUpperCase();
        const c = norm(original).toUpperCase();
        if (RR_EQ[c]) return RR_EQ[c];
        for (const [k, v] of Object.entries(RR_EQ)) {
            if (c.startsWith(k)) return v;
        }
        return { nome: original, icon: '' };
    }

    // Mapeia nome de produto/equipamento para modelo do checklist de Entregas/Retiradas
    function mapModelo(desc) {
        const t = norm(desc).toUpperCase();
        if (!t) return null;
        if (/VISITA|CARRINHO|FOSSA/.test(t)) return null;
        if (/\bPCD\b/.test(t)) return 'PCD';
        if (/GUARITA/.test(t)) return 'GUARITA';
        if (/CHUVEIRO/.test(t)) return 'CHUVEIRO';
        if (/HIDRAUL/.test(t)) return 'HIDRAULICO';
        if (/MICTORIO/.test(t)) return 'MICTORIO';
        if (/\bPIA\b|PB\s?I{2,3}\b/.test(t)) return 'PIA';
        if (/\b(ELX|SLX)\b|EXTRA\s?LUXO/.test(t)) return 'ELX';
        if (/\bLX\b/.test(t)) return 'LX';
        if (/\bSTD\b|STANDARD/.test(t)) return 'STD';
        return null;
    }

    function unidadesDaOS(os) {
        const prods = parseJson(os.produtos, []);
        const units = [];
        (Array.isArray(prods) ? prods : []).forEach((p, pi) => {
            const desc = (p && (p.desc || p.produto)) || '';
            const modelo = mapModelo(desc);
            if (!modelo) return;
            const qtd = Math.min(50, Math.max(1, parseInt(p.qtd, 10) || 1));
            for (let n = 1; n <= qtd; n++) {
                units.push({ key: `${pi + 1}-${n}`, modelo, produto: String(desc).trim() });
            }
        });
        return units;
    }

    // ── Cálculo de Insumos de Manutenção por Equipamento ──────────────────────
    // Regras informadas pelo usuário:
    // - Banheiro STD e LX obra: 1 química, 1 pacote de papel higiênico
    // - Banheiros ELX obra: 1 química, 1 pacote de papel higiênico, 1 pacote de papel toalha, 200ml sabonete líquido
    // - Banheiro STD e LX evento: 1 química, 1/2 pacote de papel higiênico (arredondado p/ cima: Math.ceil(0.5 * q))
    // - Banheiros ELX evento: 1 química, 1/2 pacote de papel higiênico (arredondado p/ cima: Math.ceil(0.5 * q)), 1 pacote de papel toalha, 200ml sabonete líquido
    // - PBII obra e evento: 2 pacotes de papel toalha, 200ml sabonete líquido
    // - PBIII obra e evento: 3 pacotes de papel toalha, 400ml sabonete líquido
    // - Outros equipamentos: não têm insumos
    function calcularInsumosEquipamento(nomeEquip, qtd) {
        const q = Math.max(1, parseInt(qtd, 10) || 1);
        const t = norm(nomeEquip).toUpperCase();
        const ehEvento = /\bEVENTO\b/.test(t);

        // 1. PBIII obra e evento (checar antes de PBII)
        if (/\bPB\s*III\b|\bPIA\s*III\b/.test(t)) {
            const pacToalha = 3 * q;
            const mlSab = 400 * q;
            return [
                { id: 'papel_toalha', icone: '📄', nome: 'Papel toalha', qtd: pacToalha, unidade: 'pacote(s)', texto: `${pacToalha} ${pacToalha === 1 ? 'pacote' : 'pacotes'} de papel toalha` },
                { id: 'sabonete',     icone: '🧴', nome: 'Sabonete líquido', qtd: mlSab, unidade: 'ml', texto: `${mlSab}ml sabonete líquido` }
            ];
        }
        // 2. PBII obra e evento
        if (/\bPB\s*II\b|\bPIA\s*II\b/.test(t)) {
            const pacToalha = 2 * q;
            const mlSab = 200 * q;
            return [
                { id: 'papel_toalha', icone: '📄', nome: 'Papel toalha', qtd: pacToalha, unidade: 'pacote(s)', texto: `${pacToalha} ${pacToalha === 1 ? 'pacote' : 'pacotes'} de papel toalha` },
                { id: 'sabonete',     icone: '🧴', nome: 'Sabonete líquido', qtd: mlSab, unidade: 'ml', texto: `${mlSab}ml sabonete líquido` }
            ];
        }
        // 3. Banheiros ELX obra e evento (checar antes de LX)
        if (/\b(ELX|SLX)\b|EXTRA\s*LUXO/.test(t)) {
            const quim = 1 * q;
            const pacHig = ehEvento ? Math.ceil(0.5 * q) : (1 * q);
            const pacToalha = 1 * q;
            const mlSab = 200 * q;
            return [
                { id: 'quimica',         icone: '🧪', nome: 'Química',          qtd: quim,      unidade: 'unid.',     texto: `${quim} ${quim === 1 ? 'química' : 'químicas'}` },
                { id: 'papel_higienico', icone: '🧻', nome: 'Papel higiênico',  qtd: pacHig,    unidade: 'pacote(s)', texto: `${pacHig} ${pacHig === 1 ? 'pacote' : 'pacotes'} de papel higiênico` },
                { id: 'papel_toalha',    icone: '📄', nome: 'Papel toalha',     qtd: pacToalha, unidade: 'pacote(s)', texto: `${pacToalha} ${pacToalha === 1 ? 'pacote' : 'pacotes'} de papel toalha` },
                { id: 'sabonete',        icone: '🧴', nome: 'Sabonete líquido', qtd: mlSab,     unidade: 'ml',        texto: `${mlSab}ml sabonete líquido` }
            ];
        }
        // 4. Banheiro STD e LX obra e evento
        if (/\bSTD\b|STANDARD|\bLX\b/.test(t)) {
            const quim = 1 * q;
            const pacHig = ehEvento ? Math.ceil(0.5 * q) : (1 * q);
            return [
                { id: 'quimica',         icone: '🧪', nome: 'Química',         qtd: quim,   unidade: 'unid.',     texto: `${quim} ${quim === 1 ? 'química' : 'químicas'}` },
                { id: 'papel_higienico', icone: '🧻', nome: 'Papel higiênico', qtd: pacHig, unidade: 'pacote(s)', texto: `${pacHig} ${pacHig === 1 ? 'pacote' : 'pacotes'} de papel higiênico` }
            ];
        }
        return [];
    }

    // ── Montar texto base ColB (mesma função _rrMontarColB do frontend) ────────
    function parseProdutoStr(p) {
        const m = String(p || '').trim().match(/^(\d+)\s*(?:[×xX]\s*)?(.+)/);
        if (m) return { qtd: parseInt(m[1], 10), codigo: m[2].trim() };
        return null;
    }

    function agruparProdutos(lista) {
        const ag = {};
        (lista || []).forEach(os => {
            const prods = (os.produtos && os.produtos.length > 0) ? os.produtos : [os.produto];
            (prods || []).forEach(prodStr => {
                const prod = parseProdutoStr(prodStr);
                if (!prod) return;
                const eq = rrEquip(prod.codigo);
                const nome = eq.nome || prod.codigo;
                if (!ag[nome]) ag[nome] = { qtd: 0, icon: eq.icon };
                ag[nome].qtd += prod.qtd;
            });
        });
        return ag;
    }

    function montarColB(v) {
        const lines = [];
        const obsLinhasSet = new Set();
        const obsLinhas = [];
        (v.os || []).forEach(os => {
            const habs = Array.isArray(os.habilidades) ? os.habilidades.join(' ') : (os.habilidades || '');
            const vars = Array.isArray(os.variaveis) ? os.variaveis.join(' ') : (os.variaveis || '');
            const habEq = Array.isArray(os.habilidade_equipe) ? os.habilidade_equipe.join(' ') : (os.habilidade_equipe || '');
            const textoParaIcone = [os.cliente, os.obs, os.observacoes_internas, os.notas_raw, habs, vars, habEq].filter(Boolean).join(' ');
            let icon = rrObsIcon(textoParaIcone);
            const temInfoImportante = textoParaIcone.toUpperCase().includes('INFORMA') && textoParaIcone.toUpperCase().includes('IMPORTANTE');
            if (temInfoImportante && !icon.includes('🚨')) icon = '🚨' + icon;
            if (!os.obs && !os.observacoes_internas && !icon) return;

            let nome = String(os.cliente || '').trim();
            nome = nome.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s\u26BD\u23D5\u25C6\u267B\u267F\u26AA\u26AB\u26FC🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘💙💜🟦🟣🔵♿🚿🚽🧼⬜⚪🛤🧊🔧🛠️]+/gu, '').trim();
            if (nome.length > 20) nome = nome.substring(0, 20).trim();

            let obsExtraida = extrairObsValida(os.obs, os.observacoes_internas, os.servico);
            if (!obsExtraida && os.notas_raw) {
                const notasNorm = String(os.notas_raw).replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                for (const ln of notasNorm.split('\n').map(l => l.trim()).filter(Boolean)) {
                    const lnUp = norm(ln).toUpperCase();
                    if (ehApenasTipoServico(lnUp)) continue;
                    if (/^\d+\s+\S/.test(ln) || /^\d+X\s*-/.test(lnUp)) continue;
                    const cand = extrairObsValida(ln, '', os.servico);
                    if (cand) { obsExtraida = cand; break; }
                }
            }

            let obsLimpa = String(obsExtraida || '').replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s\u26BD\u23D5\u25C6\u267B\u267F\u26AA\u26AB\u26FC🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘💙💜🟦🟣🔵♿🚿🚽🧼⬜⚪🛤🧊🧑🏾‍🦽🔧🛠️]+/gu, '').trim().toUpperCase();

            if (!obsLimpa) {
                const itensSaida = detectarItensSaidaOS(os);
                if (itensSaida.length > 0) {
                    obsLimpa = [...new Set(itensSaida.map(i => i.label))].join(' / ');
                }
            }

            if (obsLimpa) {
                const linhaObs = `${icon ? icon + ' ' : ''}${nome}: ${obsLimpa}`;
                if (!obsLinhasSet.has(linhaObs)) { obsLinhasSet.add(linhaObs); obsLinhas.push(linhaObs); }
            }
        });
        if (obsLinhas.length) { lines.push(...obsLinhas); lines.push(''); }

        const entregas = (v.os || []).filter(o => o.tipo === 'ENTREGA');
        if (entregas.length) {
            const ag = agruparProdutos(entregas);
            const entregaServico = entregas.map(o => String(o.servico || '').replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\u{200D}\s\u{1F9BC}❗⭕🔗🌀🚨]+/gu, '').trim().toUpperCase()).find(s => s) || 'ENTREGA';
            lines.push(entregaServico + ':');
            for (const [nome, { qtd, icon }] of Object.entries(ag)) lines.push(`   ${icon ? icon + ' ' : ''}${qtd} × ${nome}`);
            lines.push('');
        }

        const retiradas = (v.os || []).filter(o => o.tipo === 'RETIRADA');
        if (retiradas.length) {
            const ag = agruparProdutos(retiradas);
            lines.push('⭕ RETIRADA:');
            for (const [nome, { qtd }] of Object.entries(ag)) lines.push(`   ${qtd} ${nome}`);
            lines.push('');
        }

        const avulsas = (v.os || []).filter(o => o.tipo === 'AVULSA');
        if (avulsas.length) {
            const ag = agruparProdutos(avulsas);
            lines.push('❗ MANUTENÇÃO AVULSA:');
            for (const [nome, { qtd }] of Object.entries(ag)) lines.push('   ' + qtd + ' × ' + nome);
            lines.push('');
        }

        const manut = (v.os || []).filter(o => o.tipo === 'MANUTENCAO');
        if (manut.length) {
            const ag = agruparProdutos(manut);
            lines.push('MANUTENÇÃO:');
            for (const [nome, { qtd }] of Object.entries(ag)) lines.push(`   ${qtd} × ${nome}`);
            lines.push('');
        }

        const outros = (v.os || []).filter(o => o.tipo === 'OUTROS');
        if (outros.length) {
            outros.forEach(o => {
                const srvClean = String(o.servico || '').split(/\s+[-–]\s+/)[0].trim().toUpperCase();
                if (srvClean && !obsLinhas.some(ol => ol.includes(srvClean))) {
                    if (!/LIMPA\s+FOSSA/i.test(srvClean)) {
                        lines.push(srvClean);
                    }
                }
            });
            if (lines[lines.length - 1] !== '') lines.push('');
        }

        const compras = (v.os || []).filter(o => o.tipo === 'COMPRAS');
        if (compras.length) {
            lines.push('💳Compras América:');
            compras.forEach(o => {
                const cliente = String(o.cliente || '').substring(0, 25).trim();
                if (cliente) lines.push(`   ${cliente}`);
            });
            lines.push('');
        }

        return lines.join('\n');
    }

    function normClienteCurto(str) {
        let s = String(str || '').trim();
        s = s.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\u{200D}\s\u26BD\u23D5\u25C6\u267B\u267F\u26AA\u26AB\u26FC🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘💙💜🟦🟣🔵♿🚿🚽🧼⬜⚪🛤🧊🧑🏾‍🦽🔧🛠️]+/gu, '').trim();
        s = norm(s).toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();
        return s.substring(0, 20).trim();
    }

    function sanitizarColBTexto(base, v) {
        if (!base) return '';
        let txt = base;
        if (/\?{2,}\s*ATTEND AMBIENTAL/i.test(txt)) {
            txt = txt.replace(/\?{2,}\s*ATTEND AMBIENTAL/gi, '💦🚨 ATTEND AMBIENTAL');
        }
        // Padronizar Guarita sem especificação para Guarita Individual
        txt = txt.replace(/\bGUARITA\s+OBRA\b/gi, 'GUARITA INDIVIDUAL OBRA')
                 .replace(/\bGUARITA\s+EVENTO\b/gi, 'GUARITA INDIVIDUAL EVENTO');

        const fresh = (v && Array.isArray(v.os) && v.os.length > 0) ? montarColB(v) : '';
        const freshLines = fresh ? fresh.split('\n') : [];

        const obsComClienteTextos = [];
        txt.split('\n').forEach(l => {
            const tr = l.trim();
            const cIdx = tr.indexOf(':');
            if (cIdx !== -1 && !tr.endsWith(':')) {
                const det = norm(tr.substring(cIdx + 1)).toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();
                if (det && det.length >= 8) obsComClienteTextos.push(det);
            }
        });

        const linhasProcessadas = txt.split('\n').map(line => {
            const tr = line.trim();
            if (!tr) return '';

            if (tr.indexOf(':') === -1 && /LIMPA\s+FOSSA/i.test(norm(tr))) {
                const partesDash = tr.split(/\s+[-–]\s+/);
                if (partesDash.length > 1) {
                    const detDash = norm(partesDash.slice(1).join(' ')).toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();
                    if (detDash && obsComClienteTextos.some(oc => oc.includes(detDash) || detDash.includes(oc))) {
                        return null;
                    }
                }
                return null;
            }

            const temVideo = /V[ÍIíi]DEO\s*:\s*HTTPS?:\/\/|HTTPS?:\/\/[^\s]*FLUXOAR/i.test(tr);
            const temAviso = tr.includes('AVISO IMPORTANTE!') || tr.includes('VERIFICAR DETALHES!');
            if (temVideo || temAviso) {
                const colonIdx = tr.indexOf(':');
                if (colonIdx === -1) return null;
                const prefix = normClienteCurto(tr.substring(0, colonIdx));
                if (!prefix) return null;
                const matchFresh = freshLines.find(fl => {
                    const cIdx = fl.indexOf(':');
                    if (cIdx === -1 || fl.trim().endsWith(':')) return false;
                    return normClienteCurto(fl.substring(0, cIdx)) === prefix
                        && !fl.includes('AVISO IMPORTANTE!')
                        && !fl.includes('VERIFICAR DETALHES!')
                        && !/V[ÍIíi]DEO\s*:\s*HTTPS?:\/\/|HTTPS?:\/\/[^\s]*FLUXOAR/i.test(fl);
                });
                if (matchFresh) return matchFresh;
                const semVid = limparLinksVideo(tr.substring(colonIdx + 1));
                if (semVid && !temAviso) {
                    return tr.substring(0, colonIdx + 1) + ' ' + semVid;
                }
                return null;
            }
            return line;
        }).filter(l => l !== null);

        return linhasProcessadas
            .filter((l, idx, arr) => !(l === '' && idx > 0 && arr[idx - 1] === ''))
            .join('\n')
            .replace(/^\n+/, '');
    }

    function obterColBBaseLimpa(v) {
        let base = v.colBEditado || montarColB(v);
        const suffixMark = '\nMotorista:';
        const suffIdx = base.indexOf(suffixMark);
        if (suffIdx !== -1) base = base.substring(0, suffIdx);
        return sanitizarColBTexto(base, v);
    }

    // ── Migrações ───────────────────────────────────────────────────────────────
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS app_resumo_rota_checks (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            resumo_id      INTEGER NOT NULL,
            data_rota      TEXT NOT NULL,
            veiculo_key    TEXT NOT NULL,
            item_key       TEXT NOT NULL,
            tipo_item      TEXT NOT NULL,
            checked        INTEGER DEFAULT 0,
            lider_id       INTEGER,
            lider_nome     TEXT,
            lider_colab_id INTEGER,
            atualizado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (resumo_id, veiculo_key, item_key)
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_app_rr_chk_resumo ON app_resumo_rota_checks (resumo_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_app_rr_chk_data ON app_resumo_rota_checks (data_rota)`);

        // Auto-liberar permissão de 'app-lideranca-resumo-rota' para grupos que já têm acesso ao APP Liderança
        db.all(
            `SELECT DISTINCT grupo_id FROM permissoes_grupo WHERE pagina_id IN ('app-lideranca-entregas', 'app-lideranca-retiradas', 'app-lideranca-candidatos') AND (visualizar = 1 OR visualizar = '1' OR visualizar = 'true')`,
            [],
            (err, rows) => {
                if (!err && Array.isArray(rows)) {
                    rows.forEach(r => {
                        db.get(`SELECT id FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id = ?`, [r.grupo_id, PAGE_ID], (e2, ex) => {
                            if (!e2 && !ex) {
                                db.run(
                                    `INSERT INTO permissoes_grupo (grupo_id, pagina_id, pagina_nome, modulo, visualizar, incluir, alterar, excluir) VALUES (?, ?, 'Liderança › Resumo da Rota', 'APP', 1, 1, 1, 0)`,
                                    [r.grupo_id, PAGE_ID]
                                );
                            }
                        });
                    });
                }
            }
        );
    });

    // ── Permissão ───────────────────────────────────────────────────────────────
    function isTopAdmin(u) {
        return !!u && (u.role === 'Diretoria' || u.role === 'Administrador' || u.departamento === 'Diretoria'
            || (u.grupo_nome && String(u.grupo_nome).toLowerCase() === 'diretoria'));
    }
    async function requireApp(req, res, next) {
        try {
            if (isTopAdmin(req.user)) return next();
            const uid = req.user && req.user.id;
            const gid = req.user && req.user.grupo_permissao_id;
            if (gid) {
                const row = await dbGet(
                    `SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id IN (?, 'app-lideranca-entregas', 'app-lideranca-retiradas', 'app-lideranca-candidatos') AND (visualizar = 1 OR visualizar = '1' OR visualizar = 'true') LIMIT 1`,
                    [gid, PAGE_ID]
                );
                if (row) return next();
            }
            if (uid) {
                try {
                    const rowU = await dbGet(
                        `SELECT visualizar FROM permissoes_usuario WHERE usuario_id = ? AND pagina_id IN (?, 'app-lideranca-entregas', 'app-lideranca-retiradas', 'app-lideranca-candidatos') AND (visualizar = 1 OR visualizar = '1' OR visualizar = 'true') LIMIT 1`,
                        [uid, PAGE_ID]
                    );
                    if (rowU) return next();
                } catch (_) { /* tabela opcional */ }
                const rowLider = await dbGet(`SELECT colaborador_id FROM app_lider_config WHERE usuario_id = ? LIMIT 1`, [uid]);
                if (rowLider) return next();
            }
            if (req.user && /lider/i.test(norm(req.user.departamento || req.user.grupo_nome || req.user.role || ''))) {
                return next();
            }
            return res.status(403).json({ error: 'Sem permissão para acessar Resumo da Rota.' });
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    const guard = [authenticateToken, requireApp];

    // ── Cálculo da Escala dos Líderes (Diurna e Noturna) no dia ─────────────────
    // Utiliza o utilitário centralizado (4 líderes: 2 dia e 2 noite, sem Joaquim Santana,
    // com regra de férias seg-sex e resolução de nome + foto de colaborador)
    async function obterEscalaLideresNoDia(iso, uidLogado) {
        return escalaUtil.obterEscalaLideresNoDia(db, iso, uidLogado);
    }

    async function liderDoReq(req) {
        return escalaUtil.resolverLiderDoReq(db, req);
    }

    // ── Resolver foto e ID de colaborador por nome (Motorista / Ajudante) ──────
    function buildColabMatcher(colabs) {
        const byExact = new Map();
        const list = [];
        (colabs || []).forEach(c => {
            const n = normLow(c.nome_completo);
            if (!n) return;
            const info = {
                id: c.id,
                nome_completo: c.nome_completo,
                cargo: c.cargo || '',
                foto_url: c.foto_base64 || `/api/colaboradores/foto/${c.id}`
            };
            byExact.set(n, info);
            const parts = n.split(' ').filter(Boolean);
            if (parts.length >= 2) {
                const firstTwo = parts.slice(0, 2).join(' ');
                if (!byExact.has(firstTwo)) byExact.set(firstTwo, info);
            }
            list.push({ n, parts, info });
        });

        return function matchColab(nomeBusca) {
            const q = normLow(nomeBusca);
            if (!q) return null;
            if (byExact.has(q)) return byExact.get(q);
            const qParts = q.split(' ').filter(Boolean);
            // Match por prefixo de palavras
            const found = list.find(item => item.n.startsWith(q) || q.startsWith(item.n) || (qParts.length >= 2 && qParts.every(p => item.parts.includes(p))));
            if (found) return found.info;
            if (qParts.length === 1 && qParts[0].length >= 3) {
                const single = list.filter(item => item.parts[0] === qParts[0]);
                if (single.length === 1) return single[0].info;
            }
            return null;
        };
    }

    // ── Parser das linhas do ColB de um veículo em seções estruturadas ─────────
    function parseSecoesColB(colB, veiculoObj, checksMap, statusEntregaPorVeiculo, statusRetiradaPorVeiculo) {
        const rawLines = String(colB || '').replace(/\r\n/g, '\n').split('\n');
        const observacoes = [];
        const entregas = [];
        const retiradas = [];
        const manutencoes = [];
        const outros = [];

        let secaoAtual = 'OBS'; // 'OBS' | 'ENTREGA' | 'RETIRADA' | 'MANUTENCAO' | 'AVULSA' | 'COMPRAS' | 'OUTROS'
        let tituloEntrega = 'ENTREGA OBRA:';
        let tituloManut = 'MANUTENÇÃO:';

        for (const rawLine of rawLines) {
            const trimmed = rawLine.trim();
            if (!trimmed) continue;
            const up = norm(trimmed).toUpperCase();

            // Detectar cabeçalho de seção (termina com ':')
            if (trimmed.endsWith(':')) {
                if (up.includes('ENTREGA')) {
                    secaoAtual = 'ENTREGA';
                    tituloEntrega = trimmed;
                    continue;
                }
                if (up.includes('RETIRADA')) {
                    secaoAtual = 'RETIRADA';
                    continue;
                }
                if (up.includes('MANUTENCAO AVULSA')) {
                    secaoAtual = 'AVULSA';
                    continue;
                }
                if (up.includes('MANUTENCAO')) {
                    secaoAtual = 'MANUTENCAO';
                    tituloManut = trimmed;
                    continue;
                }
                if (up.includes('COMPRAS')) {
                    secaoAtual = 'COMPRAS';
                    continue;
                }
            }

            if (secaoAtual === 'OBS') {
                const linhaCorrigida = trimmed.replace(/\?{2,}\s*ATTEND AMBIENTAL/gi, '💦🚨 ATTEND AMBIENTAL');
                let titulo = '';
                let detalhe = linhaCorrigida;
                const colonIdx = linhaCorrigida.indexOf(':');
                if (colonIdx !== -1) {
                    titulo = linhaCorrigida.substring(0, colonIdx + 1);
                    detalhe = linhaCorrigida.substring(colonIdx + 1).trim();
                }

                // Verificar se esta observação pertence a um item de saída (Levar Carrinho, Levar Extensora,
                // Apoio de Sucção, Levar EPI, VAC, Reparos, Montagem, Desmontagem)
                const cliPrefix = colonIdx !== -1 ? normClienteCurto(titulo.slice(0, -1)) : '';
                const osMatchList = cliPrefix
                    ? (veiculoObj.os || []).filter(o => normClienteCurto(o.cliente) === cliPrefix)
                    : [];
                const itensLinha = detectarItensSaidaTexto(linhaCorrigida);
                const itensOS = [];
                osMatchList.forEach(o => {
                    detectarItensSaidaOS(o).forEach(it => {
                        if (!itensOS.some(x => x.id === it.id)) itensOS.push(it);
                    });
                });
                const todosItensSaida = [...itensLinha];
                itensOS.forEach(it => {
                    if (!todosItensSaida.some(x => x.id === it.id)) todosItensSaida.push(it);
                });

                // Todas as observações aparecem no Resumo da Rota, mas APENAS as das variáveis/habilidades
                // de saída (Levar Carrinho, Levar Extensora, Apoio de Sucção, Levar EPI, VAC, Reparos, Montagem, Desmontagem)
                // recebem o campo de selecionar o check (tem_check = true).
                const temCheck = todosItensSaida.length > 0;

                // Garantir que os ícones dos itens de saída apareçam no título
                const iconesSaidaFaltando = [];
                todosItensSaida.forEach(it => {
                    if (it.icon && !titulo.includes(it.icon) && !iconesSaidaFaltando.includes(it.icon)) {
                        iconesSaidaFaltando.push(it.icon);
                    }
                });
                if (iconesSaidaFaltando.length > 0) {
                    titulo = iconesSaidaFaltando.join(' ') + (titulo ? ' ' + titulo : '');
                }

                // Limpar qualquer link de vídeo do detalhe e, se ficar vazio ou "AVISO IMPORTANTE!", buscar obs real da OS
                detalhe = limparLinksVideo(detalhe);
                if (!detalhe || /AVISO IMPORTANTE!|VERIFICAR DETALHES!/i.test(detalhe)) {
                    let obsReal = '';
                    for (const o of osMatchList) {
                        const ext = extrairObsValida(o.obs, o.observacoes_internas, o.servico);
                        if (ext) { obsReal = ext.toUpperCase(); break; }
                    }
                    detalhe = obsReal || [...new Set(todosItensSaida.map(i => i.label))].join(' / ');
                    if (!detalhe) continue;
                } else if (temCheck) {
                    // Se a OS tem habilidades de saída (ex: VAC, Reparos, Montagem, Desmontagem) que não estão mencionadas no detalhe, acrescentar
                    const labelsExtras = todosItensSaida
                        .filter(it => ['VAC', 'REPAROS', 'MONTAGEM', 'DESMONTAGEM'].includes(it.id))
                        .map(it => it.label)
                        .filter(lb => !norm(detalhe).toUpperCase().includes(norm(lb).toUpperCase()));
                    if (labelsExtras.length > 0) {
                        detalhe = `${detalhe} (${labelsExtras.join(' / ')})`;
                    }
                }

                const textoFinal = titulo ? `${titulo} ${detalhe}` : detalhe;
                const itemKeyOrig = 'obs_' + slug(trimmed);
                const itemKeyFinal = 'obs_' + slug(textoFinal);
                const chk = temCheck
                    ? (checksMap.get(itemKeyFinal) || checksMap.get(itemKeyOrig)
                        || (cliPrefix ? [...checksMap.entries()].find(([k]) => k.startsWith('obs_') && k.includes(slug(cliPrefix)))?.[1] : null))
                    : null;

                observacoes.push({
                    item_key: chk ? (checksMap.has(itemKeyFinal) ? itemKeyFinal : (checksMap.has(itemKeyOrig) ? itemKeyOrig : itemKeyFinal)) : itemKeyFinal,
                    texto: textoFinal,
                    titulo,
                    detalhe,
                    _cliPrefix: cliPrefix,
                    tem_check: temCheck,
                    checked: !!(temCheck && chk && chk.checked),
                    lider_nome: temCheck && chk && chk.checked ? chk.lider_nome : null,
                    lider_colab_id: temCheck && chk && chk.checked ? (chk.lider_colab_id || null) : null,
                    lider_foto_url: temCheck && chk && chk.checked ? (chk.lider_foto_url || (chk.lider_colab_id ? `/api/colaboradores/foto/${chk.lider_colab_id}` : null)) : null,
                    atualizado_em: temCheck && chk && chk.checked ? chk.atualizado_em : null
                });
                continue;
            }

            // Extrair quantidade e nome do equipamento da linha (ex: "💙 2 × STD OBRA" ou "1 PBII OBRA")
            const semIcone = trimmed.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\u{200D}\s💙💜🟦🟪🔵🟣♿🧑🏾‍🦽🚿🚽💦🧼⬜⚪💧⚙️🛞⭕❗]+/gu, '').trim();
            const mProd = semIcone.match(/^(\d+)\s*(?:[×xX]\s*)?(.+)$/);
            const qtd = mProd ? parseInt(mProd[1], 10) : 1;
            const nomeEqRaw = mProd ? mProd[2].trim() : semIcone;
            const eqInfo = rrEquip(nomeEqRaw);
            const nomeEq = eqInfo.nome || nomeEqRaw;
            const iconeEq = eqInfo.icon || '';
            const modelo = mapModelo(nomeEq);

            if (secaoAtual === 'ENTREGA') {
                const st = statusEntregaPorVeiculo(modelo, nomeEq, qtd);
                entregas.push({
                    item_key: 'ent_' + slug(nomeEq),
                    icone: iconeEq,
                    qtd,
                    nome: nomeEq,
                    texto: `${iconeEq ? iconeEq + ' ' : ''}${qtd} × ${nomeEq}`,
                    modelo,
                    checked: st.checked,
                    status: st.status,
                    concluidas: st.concluidas,
                    iniciadas: st.iniciadas || 0,
                    total_unidades: st.total_unidades,
                    tem_avaria: st.tem_avaria,
                    lider_nome: st.lider_nome,
                    lider_colab_id: st.lider_colab_id || null,
                    lider_foto_url: st.lider_foto_url || null,
                    atualizado_em: st.atualizado_em || null,
                    os_list: st.os_list
                });
            } else if (secaoAtual === 'RETIRADA') {
                const st = statusRetiradaPorVeiculo(modelo, nomeEq, qtd);
                retiradas.push({
                    item_key: 'ret_' + slug(nomeEq),
                    icone: iconeEq,
                    qtd,
                    nome: nomeEq,
                    texto: `${iconeEq ? iconeEq + ' ' : ''}${qtd} ${nomeEq}`,
                    modelo,
                    checked: st.checked,
                    status: st.status,
                    concluidas: st.concluidas,
                    iniciadas: st.iniciadas || 0,
                    total_unidades: st.total_unidades,
                    tem_avaria: st.tem_avaria,
                    lider_nome: st.lider_nome,
                    lider_colab_id: st.lider_colab_id || null,
                    lider_foto_url: st.lider_foto_url || null,
                    atualizado_em: st.atualizado_em || null,
                    os_list: st.os_list
                });
            } else if (secaoAtual === 'MANUTENCAO' || secaoAtual === 'AVULSA') {
                const tipoSecao = secaoAtual === 'AVULSA' ? '❗ MANUTENÇÃO AVULSA:' : tituloManut;
                const prefixSec = secaoAtual === 'AVULSA' ? 'avulsa' : 'manut';
                const insumosCalc = calcularInsumosEquipamento(nomeEq, qtd).map(ins => {
                    const ik = `ins_${prefixSec}_${slug(nomeEq)}_${ins.id}`;
                    const chk = checksMap.get(ik);
                    return Object.assign({}, ins, {
                        item_key: ik,
                        checked: !!(chk && chk.checked),
                        lider_nome: chk && chk.checked ? chk.lider_nome : null,
                        lider_colab_id: chk && chk.checked ? (chk.lider_colab_id || null) : null,
                        lider_foto_url: chk && chk.checked ? (chk.lider_foto_url || (chk.lider_colab_id ? `/api/colaboradores/foto/${chk.lider_colab_id}` : null)) : null,
                        atualizado_em: chk && chk.checked ? chk.atualizado_em : null
                    });
                });
                const semInsumoKey = `manut_eq_${prefixSec}_${slug(nomeEq)}`;
                const chkEq = checksMap.get(semInsumoKey);
                const todosInsumosOk = insumosCalc.length > 0
                    ? insumosCalc.every(i => i.checked)
                    : !!(chkEq && chkEq.checked);

                manutencoes.push({
                    secao_titulo: tipoSecao,
                    eh_avulsa: secaoAtual === 'AVULSA',
                    item_key: semInsumoKey,
                    icone: iconeEq,
                    qtd,
                    nome: nomeEq,
                    texto: `${iconeEq ? iconeEq + ' ' : ''}${qtd} × ${nomeEq}`,
                    insumos: insumosCalc,
                    tem_insumos: insumosCalc.length > 0,
                    checked: todosInsumosOk,
                    insumos_feitos: insumosCalc.filter(i => i.checked).length,
                    insumos_total: insumosCalc.length
                });
            } else {
                outros.push({ secao: secaoAtual, texto: trimmed });
            }
        }

        // Garantir que TODAS as OSs do veículo com itens de saída (Levar Carrinho, Levar Extensora,
        // Apoio de Sucção, Levar EPI, VAC, Reparos, Montagem, Desmontagem) apareçam no checklist do líder,
        // mesmo que v.colBEditado tenha sido salvo antes de incluir Habilidade da Equipe ou sem texto de obs
        (veiculoObj.os || []).forEach(o => {
            const itensOS = detectarItensSaidaOS(o);
            if (!itensOS.length) return;
            const cliCurto = normClienteCurto(o.cliente);
            let nomeExib = String(o.cliente || '').trim()
                .replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s\u26BD\u23D5\u25C6\u267B\u267F\u26AA\u26AB\u26FC🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘💙💜🟦🟣🔵♿🚿🚽🧼⬜⚪🛤🧊🔧🛠️]+/gu, '')
                .trim();
            if (nomeExib.length > 20) nomeExib = nomeExib.substring(0, 20).trim();
            const obsReal = extrairObsValida(o.obs, o.observacoes_internas, o.servico);
            const labelsSaida = [...new Set(itensOS.map(i => i.label))].join(' / ');
            const detalheCand = obsReal ? obsReal.toUpperCase() : labelsSaida;

            const exMatch = observacoes.find(ex =>
                ex._cliPrefix === cliCurto && (
                    !obsReal || norm(ex.detalhe).toUpperCase().includes(norm(obsReal).toUpperCase())
                )
            );
            if (exMatch) {
                exMatch.tem_check = true;
                return;
            }

            const iconesUnicos = [...new Set(itensOS.map(i => i.icon).filter(Boolean))].join(' ');
            const titulo = `${iconesUnicos ? iconesUnicos + ' ' : ''}${nomeExib}:`;
            const textoFinal = `${titulo} ${detalheCand}`;
            const itemKeyFinal = 'obs_' + slug(textoFinal);
            const chk = checksMap.get(itemKeyFinal)
                || (cliCurto ? [...checksMap.entries()].find(([k]) => k.startsWith('obs_') && k.includes(slug(cliCurto)))?.[1] : null);

            observacoes.push({
                item_key: itemKeyFinal,
                texto: textoFinal,
                titulo,
                detalhe: detalheCand,
                _cliPrefix: cliCurto,
                tem_check: true,
                checked: !!(chk && chk.checked),
                lider_nome: chk && chk.checked ? chk.lider_nome : null,
                lider_colab_id: chk && chk.checked ? (chk.lider_colab_id || null) : null,
                lider_foto_url: chk && chk.checked ? (chk.lider_foto_url || (chk.lider_colab_id ? `/api/colaboradores/foto/${chk.lider_colab_id}` : null)) : null,
                atualizado_em: chk && chk.checked ? chk.atualizado_em : null
            });
        });

        return {
            titulo_entrega: tituloEntrega,
            observacoes,
            entregas,
            retiradas,
            manutencoes,
            outros
        };
    }

    // ── Montar resposta completa de uma data ────────────────────────────────────
    async function montarResumoDoDia(iso, resumoIdOpcional, turnoOpcional, uidLogado) {
        const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const escalaDia = await obterEscalaLideresNoDia(iso, uidLogado);
        const turnoDefault = (turnoOpcional === 'noturno' || turnoOpcional === 'diurno')
            ? turnoOpcional
            : (escalaDia.turno_usuario || 'diurno');

        if (!m) {
            return { data: iso, turno_ativo: turnoDefault, escala_dia: escalaDia, resumos: [], resumo_ativo: null, veiculos: [] };
        }
        const prefixoBr = `${m[3]}-${m[2]}-${m[1]}`;

        // Buscar todos os resumos salvos para esta data
        const rowsResumo = await dbAll(
            `SELECT id, nome, dados, criado_em, usuario_nome FROM logistica_resumo_rota WHERE nome LIKE ? ORDER BY id ASC`,
            [prefixoBr + '%']
        );

        if (!rowsResumo.length) {
            return { data: iso, turno_ativo: turnoDefault, escala_dia: escalaDia, resumos: [], resumo_ativo: null, veiculos: [] };
        }

        // Lista de resumos disponíveis no dia
        const listaResumos = rowsResumo.map(r => ({
            id: r.id,
            nome: r.nome,
            criado_em: r.criado_em,
            usuario_nome: r.usuario_nome
        }));

        const rowsDiurnos = rowsResumo.filter(r => !/noturn|noite/i.test(norm(r.nome || '')));
        const rowsNoturnos = rowsResumo.filter(r => /noturn|noite/i.test(norm(r.nome || '')));
        const rowPadraoDiurno = rowsDiurnos.length ? rowsDiurnos[rowsDiurnos.length - 1] : rowsResumo[rowsResumo.length - 1];
        const rowPadraoNoturno = rowsNoturnos.length ? rowsNoturnos[rowsNoturnos.length - 1] : rowsResumo[rowsResumo.length - 1];
        const temResumosSeparadosPorTurno = rowPadraoDiurno && rowPadraoNoturno && String(rowPadraoDiurno.id) !== String(rowPadraoNoturno.id);

        const rowExplicito = resumoIdOpcional ? rowsResumo.find(r => String(r.id) === String(resumoIdOpcional)) : null;
        let turnoAtivo;
        let chosenRow;
        if (rowExplicito) {
            chosenRow = rowExplicito;
            const resumoEhNoturno = /noturn|noite/i.test(norm(chosenRow.nome || ''));
            turnoAtivo = (turnoOpcional === 'noturno' || turnoOpcional === 'diurno')
                ? turnoOpcional
                : (resumoEhNoturno ? 'noturno' : 'diurno');
        } else {
            turnoAtivo = (turnoOpcional === 'noturno' || turnoOpcional === 'diurno')
                ? turnoOpcional
                : (escalaDia.turno_usuario || (rowsDiurnos.length ? 'diurno' : 'noturno'));
            chosenRow = (turnoAtivo === 'noturno') ? rowPadraoNoturno : rowPadraoDiurno;
        }

        const parsedDados = parseJson(chosenRow.dados, {});
        const veiculosRaw = Array.isArray(parsedDados)
            ? parsedDados
            : (parsedDados && Array.isArray(parsedDados.veiculos) ? parsedDados.veiculos : []);

        // Colaboradores para fotos de motoristas e ajudantes
        const colabs = await dbAll(`/* INCLUIR_SERVICO */ SELECT id, nome_completo, cargo, foto_path, foto_base64 FROM colaboradores`);
        const matchColab = buildColabMatcher(colabs);

        // Candidatos em teste na data
        const candidatosDia = await dbAll(
            `SELECT id, nome, tipo, foto_base64, rota_motorista, data_teste_1, data_teste_2, data_teste_extra
             FROM candidatos_teste
             WHERE data_teste_1 = ? OR data_teste_2 = ? OR data_teste_extra = ? OR data_teste = ?`,
            [iso, iso, iso, iso]
        );

        // Resolvedor de colaborador para converter usernames (ex: Thais.Ricci) em nome do colaborador + foto
        const resolverColab = await escalaUtil.criarResolvedorColaborador(db);

        // Checks manuais já gravados para os resumos do dia
        const idsResumosDia = [...new Set([chosenRow.id, rowPadraoDiurno.id, rowPadraoNoturno.id])];
        const checksRowsTodos = await dbAll(
            `SELECT resumo_id, veiculo_key, item_key, tipo_item, checked, lider_id, lider_nome, lider_colab_id, atualizado_em
             FROM app_resumo_rota_checks
             WHERE resumo_id IN (${idsResumosDia.map(() => '?').join(',')})`,
            idsResumosDia
        );
        const checksRows = checksRowsTodos.filter(r => String(r.resumo_id) === String(chosenRow.id));
        const checksByTurnoVeiculo = {
            diurno: new Map(),
            noturno: new Map()
        };
        const realizadoresPorTurno = {
            diurno: new Map(),
            noturno: new Map()
        };

        checksRowsTodos.forEach(r => {
            const resolved = (r.lider_id || r.lider_nome || r.lider_colab_id)
                ? resolverColab({ usuario_id: r.lider_id, colab_id: r.lider_colab_id, nome: r.lider_nome })
                : null;
            const nomeResolvido = (resolved && resolved.nome) || r.lider_nome || null;
            const colabIdResolvido = (resolved && resolved.colab_id) || r.lider_colab_id || null;
            const fotoResolvida = (resolved && resolved.foto_url) || (colabIdResolvido ? `/api/colaboradores/foto/${colabIdResolvido}` : null);

            const rawKey = String(r.item_key || '');
            const ehNoturnoKey = rawKey.startsWith('noturno::');
            const cleanItemKey = ehNoturnoKey ? rawKey.slice('noturno::'.length) : rawKey;

            let tKeyCard = ehNoturnoKey ? 'noturno' : 'diurno';
            if (temResumosSeparadosPorTurno) {
                if (String(r.resumo_id) === String(rowPadraoNoturno.id)) tKeyCard = 'noturno';
                else if (String(r.resumo_id) === String(rowPadraoDiurno.id)) tKeyCard = 'diurno';
            }

            if (String(r.resumo_id) === String(chosenRow.id)) {
                const tKeyLocal = temResumosSeparadosPorTurno ? turnoAtivo : (ehNoturnoKey ? 'noturno' : 'diurno');
                const mapT = checksByTurnoVeiculo[tKeyLocal];
                if (!mapT.has(r.veiculo_key)) mapT.set(r.veiculo_key, new Map());
                mapT.get(r.veiculo_key).set(cleanItemKey, Object.assign({}, r, {
                    item_key: cleanItemKey,
                    lider_nome: nomeResolvido,
                    lider_colab_id: colabIdResolvido,
                    lider_foto_url: fotoResolvida
                }));
            }

            if (r.checked && nomeResolvido) {
                const kLider = normLow(nomeResolvido);
                const ex = realizadoresPorTurno[tKeyCard].get(kLider);
                if (!ex || String(r.atualizado_em || '') > String(ex.atualizado_em || '')) {
                    realizadoresPorTurno[tKeyCard].set(kLider, {
                        nome: nomeResolvido,
                        colab_id: colabIdResolvido,
                        foto_url: fotoResolvida,
                        atualizado_em: r.atualizado_em
                    });
                }
            }
        });

        const checksByVeiculo = checksByTurnoVeiculo[turnoAtivo];

        // Coletar todas as OS de Entrega e Retirada do dia (e as citadas nos veículos)
        const numerosOsRota = new Set();
        veiculosRaw.forEach(v => {
            (v.os || []).forEach(o => {
                if (o._numero_os) numerosOsRota.add(String(o._numero_os).trim());
            });
        });

        const osDoDia = await dbAll(
            `SELECT id, numero_os, cliente, data_os, tipo_servico, produtos, observacoes, observacoes_internas, habilidades, variaveis, habilidade_equipe
             FROM os_logistica
             WHERE status = 'ativo' AND (substr(data_os, 1, 10) = ? ${numerosOsRota.size ? `OR TRIM(CAST(numero_os AS TEXT)) IN (${[...numerosOsRota].map(() => '?').join(',')})` : ''})`,
            [iso, ...numerosOsRota]
        );

        const osIds = osDoDia.map(o => o.id);
        const entCheckRows = osIds.length
            ? await dbAll(`SELECT * FROM entregas_checklist WHERE os_id IN (${osIds.map(() => '?').join(',')})`, osIds)
            : [];
        const retCheckRows = osIds.length
            ? await dbAll(`SELECT * FROM retiradas_checklist WHERE os_id IN (${osIds.map(() => '?').join(',')})`, osIds)
            : [];

        const entMap = new Map();
        entCheckRows.forEach(r => {
            const uKey = r.unit_key || r.unidade_key;
            if (uKey) entMap.set(`${r.os_id}|${uKey}`, r);
        });
        const retMap = new Map();
        retCheckRows.forEach(r => {
            const uKey = r.unit_key || r.unidade_key;
            if (uKey) retMap.set(`${r.os_id}|${uKey}`, r);
        });

        // Indexar OS de os_logistica por numero_os e por nome curto do cliente
        const osPorNumero = new Map();
        const osPorCliente = new Map();
        osDoDia.forEach(o => {
            const num = String(o.numero_os || '').trim();
            if (num) {
                if (!osPorNumero.has(num)) osPorNumero.set(num, []);
                osPorNumero.get(num).push(o);
            }
            const cliK = normClienteCurto(o.cliente);
            if (cliK) {
                if (!osPorCliente.has(cliK)) osPorCliente.set(cliK, []);
                osPorCliente.get(cliK).push(o);
            }
        });

        // Contadores globais por turno (para exibir nos cards de Escala Diurna e Escala Noturna)
        let totalItensManuaisBase = 0;
        let totalEntRetAuto = 0;
        let feitosEntRetAuto = 0;
        let feitosManuaisDiurno = 0;
        let feitosManuaisNoturno = 0;

        // Montar cada veículo
        const veiculos = veiculosRaw.map((v, idx) => {
            const vKey = slug(v.veiculo || `veiculo_${idx}`);
            const vChecks = checksByVeiculo.get(vKey) || new Map();
            const vChecksDiurno = checksByTurnoVeiculo.diurno.get(vKey) || new Map();
            const vChecksNoturno = checksByTurnoVeiculo.noturno.get(vKey) || new Map();

            const motInfo = matchColab(v.motorista);
            const ajuInfo = matchColab(v.ajudante);

            // Candidatos atribuídos a este motorista na data
            const candsVeic = candidatosDia.filter(c => {
                if (!c.rota_motorista) return false;
                let cMot = c.rota_motorista;
                if (typeof cMot === 'string' && cMot.startsWith('{')) {
                    try { cMot = JSON.parse(cMot)[iso] || ''; } catch (e) { cMot = ''; }
                }
                return cMot && normLow(cMot) === normLow(v.motorista || '');
            }).map(c => ({
                id: c.id,
                nome: c.nome,
                cargo: 'Candidato: ' + ((c.tipo || '').toLowerCase().includes('motorista') ? 'Motorista' : 'Ajudante'),
                foto_url: c.foto_base64 || null
            }));

            // Mapear OSs de ENTREGA e RETIRADA deste veículo e enriquecer v.os com observações e habilidades de os_logistica
            const osEntVeiculo = [];
            const osRetVeiculo = [];
            const vistosEnt = new Set();
            const vistosRet = new Set();

            (v.os || []).forEach(o => {
                const num = String(o._numero_os || o.numero_os || '').trim();
                const cliK = normClienteCurto(o.cliente);
                const candidatosDb = [...(osPorNumero.get(num) || []), ...(osPorCliente.get(cliK) || [])];
                if (candidatosDb.length) {
                    if (o.obs) o.obs = limparLinksVideo(o.obs);
                    const matchObs = candidatosDb.find(d => extrairObsValida(d.observacoes, d.observacoes_internas, d.tipo_servico, true));
                    if (matchObs && !extrairObsValida(o.obs, o.observacoes_internas, o.servico, false)) {
                        o.obs = extrairObsValida(matchObs.observacoes, matchObs.observacoes_internas, matchObs.tipo_servico, true);
                        o.observacoes_internas = matchObs.observacoes_internas || '';
                    }
                    const d0 = candidatosDb[0];
                    if ((!o.habilidades || !o.habilidades.length) && d0.habilidades) {
                        o.habilidades = parseJson(d0.habilidades, [d0.habilidades]);
                    }
                    if ((!o.variaveis || !o.variaveis.length) && d0.variaveis) {
                        o.variaveis = parseJson(d0.variaveis, [d0.variaveis]);
                    }
                    if ((!o.habilidade_equipe || !o.habilidade_equipe.length) && d0.habilidade_equipe) {
                        o.habilidade_equipe = parseJson(d0.habilidade_equipe, [d0.habilidade_equipe]);
                    }
                }
                if (o.tipo === 'ENTREGA') {
                    const dbOs = candidatosDb.find(d => /entrega/i.test(norm(d.tipo_servico))) || candidatosDb[0];
                    if (dbOs && !vistosEnt.has(dbOs.id)) {
                        vistosEnt.add(dbOs.id);
                        osEntVeiculo.push(dbOs);
                    }
                } else if (o.tipo === 'RETIRADA') {
                    const dbOs = candidatosDb.find(d => /retirada/i.test(norm(d.tipo_servico))) || candidatosDb[0];
                    if (dbOs && !vistosRet.has(dbOs.id)) {
                        vistosRet.add(dbOs.id);
                        osRetVeiculo.push(dbOs);
                    }
                }
            });

            function calcStatusChecklist(osLista, ckMap, modeloAlvo, qtdLinha) {
                if (!modeloAlvo) {
                    return { checked: true, status: 'sem_checklist', iniciadas: qtdLinha, concluidas: qtdLinha, total_unidades: qtdLinha, tem_avaria: false, lider_nome: null, atualizado_em: null, os_list: [] };
                }
                const unidades = [];
                const osEnvolvidas = [];
                osLista.forEach(os => {
                    const units = unidadesDaOS(os).filter(u => u.modelo === modeloAlvo);
                    if (units.length > 0) {
                        osEnvolvidas.push({ os_id: os.id, numero_os: os.numero_os, cliente: os.cliente });
                        units.forEach(u => {
                            const row = ckMap.get(`${os.id}|${u.key}`);
                            let temItem = false;
                            const rawJson = row && (row.itens_json || row.checklist_json);
                            if (rawJson) {
                                try {
                                    const obj = JSON.parse(rawJson);
                                    temItem = !!(obj && typeof obj === 'object' && Object.keys(obj).length > 0);
                                } catch (_) { temItem = false; }
                            }
                            const conclEm = row && (row.concluido_em || row.conferido_em);
                            const concluido = !!conclEm;
                            const iniciado = concluido || temItem;
                            const rawLiderId = row && (row.lider_id || row.conferido_por_id);
                            const rawLiderNome = row && (row.lider_nome || row.conferido_por_nome);
                            const rawColabId = row && row.lider_colab_id;
                            const resolved = (iniciado && (rawLiderId || rawLiderNome || rawColabId))
                                ? resolverColab({ usuario_id: rawLiderId, colab_id: rawColabId, nome: rawLiderNome })
                                : null;
                            unidades.push({
                                iniciado,
                                concluido,
                                tem_avaria: !!(concluido && row.tem_avaria),
                                lider_nome: resolved ? resolved.nome : (iniciado ? rawLiderNome : null),
                                lider_colab_id: resolved ? resolved.colab_id : (iniciado ? rawColabId : null),
                                lider_foto_url: resolved ? resolved.foto_url : null,
                                concluido_em: conclEm || (row ? row.atualizado_em : null)
                            });
                        });
                    }
                });

                const totalUnid = unidades.length || qtdLinha;
                const concl = unidades.filter(u => u.concluido).length;
                const inic = unidades.filter(u => u.iniciado).length;
                const algumaAvaria = unidades.some(u => u.tem_avaria);
                const uComLider = unidades.find(u => u.lider_nome) || {};
                const checked = unidades.length > 0 && concl >= unidades.length;
                const status = checked ? (algumaAvaria ? 'avaria' : 'ok') : (inic > 0 ? 'andamento' : 'pendente');

                return {
                    checked,
                    status,
                    iniciadas: inic,
                    concluidas: concl,
                    total_unidades: totalUnid,
                    tem_avaria: algumaAvaria,
                    lider_nome: uComLider.lider_nome || null,
                    lider_colab_id: uComLider.lider_colab_id || null,
                    lider_foto_url: uComLider.lider_foto_url || null,
                    atualizado_em: uComLider.concluido_em || null,
                    os_list: osEnvolvidas
                };
            }

            const colB = obterColBBaseLimpa(v);
            const secoes = parseSecoesColB(
                colB,
                v,
                vChecks,
                (mod, nomeEq, qtd) => calcStatusChecklist(osEntVeiculo, entMap, mod, qtd),
                (mod, nomeEq, qtd) => calcStatusChecklist(osRetVeiculo, retMap, mod, qtd)
            );

            // Calcular contadores gerais de progresso deste veículo (somente observações que possuem check)
            const obsComCheck = secoes.observacoes.filter(o => o.tem_check !== false);
            const totalObs = obsComCheck.length;
            const feitasObs = obsComCheck.filter(o => o.checked).length;

            const entComCk = secoes.entregas.filter(e => e.status !== 'sem_checklist');
            const retComCk = secoes.retiradas.filter(r => r.status !== 'sem_checklist');
            const todosCkVeic = [...entComCk, ...retComCk];

            const unidTotalVeic = todosCkVeic.reduce((s, x) => s + Number(x.total_unidades || 0), 0);
            const unidConcluidasVeic = todosCkVeic.reduce((s, x) => s + Number(x.concluidas || 0), 0);
            const unidIniciadasVeic = todosCkVeic.reduce((s, x) => s + Number(x.iniciadas || 0), 0);
            const todosCkCompletos = unidTotalVeic > 0 && unidConcluidasVeic >= unidTotalVeic;
            const algumCkIniciado = unidIniciadasVeic > 0 || unidConcluidasVeic > 0;
            const INICIO_CONTROLE_RESUMO = '2026-12-01';
            const diaPassado = iso < hojeSP();
            const diaVencido = diaPassado && iso >= INICIO_CONTROLE_RESUMO;

            let estadoCkVeiculo = 'aguardando';
            if (unidTotalVeic === 0) {
                estadoCkVeiculo = 'sem_checklist';
            } else if (todosCkCompletos) {
                estadoCkVeiculo = 'concluido';
            } else if (diaVencido) {
                estadoCkVeiculo = 'pendente_vencido';
            } else if (algumCkIniciado) {
                estadoCkVeiculo = 'em_andamento';
            } else if (diaPassado) {
                estadoCkVeiculo = 'nao_feito';
            }

            const lideresCkSet = new Set();
            const realizadoresEntRetMap = new Map();
            let ultDataCkVeic = null;
            todosCkVeic.forEach(x => {
                if (x.lider_nome) {
                    String(x.lider_nome).split(',').map(s => s.trim()).filter(Boolean).forEach(n => {
                        const res = resolverColab({ nome: n, colab_id: x.lider_colab_id });
                        const nomeReal = (res && res.nome) || n;
                        lideresCkSet.add(nomeReal);
                        const k = normLow(nomeReal);
                        if (!realizadoresEntRetMap.has(k)) {
                            realizadoresEntRetMap.set(k, {
                                nome: nomeReal,
                                colab_id: (res && res.colab_id) || x.lider_colab_id || null,
                                foto_url: (res && res.foto_url) || x.lider_foto_url || null
                            });
                        }
                    });
                }
                if (x.atualizado_em && (!ultDataCkVeic || String(x.atualizado_em) > String(ultDataCkVeic))) {
                    ultDataCkVeic = x.atualizado_em;
                }
            });

            const statusEntRetVeiculo = {
                estado_visual: estadoCkVeiculo, // 'concluido' | 'em_andamento' | 'pendente_vencido' | 'aguardando' | 'sem_checklist'
                todos_completos: todosCkCompletos,
                algum_iniciado: algumCkIniciado,
                dia_passado: diaPassado,
                concluidas: unidConcluidasVeic,
                iniciadas: unidIniciadasVeic,
                total_unidades: unidTotalVeic,
                lider_nome: [...lideresCkSet].join(', ') || null,
                realizado_por: [...realizadoresEntRetMap.values()],
                atualizado_em: ultDataCkVeic
            };

            const totalEnt = entComCk.length > 0 ? 1 : 0;
            const feitasEnt = (entComCk.length > 0 && todosCkCompletos) ? 1 : 0;

            const totalRet = retComCk.length > 0 ? 1 : 0;
            const feitasRet = (retComCk.length > 0 && todosCkCompletos) ? 1 : 0;

            const todosInsumos = secoes.manutencoes.flatMap(m => m.insumos);
            const totalIns = todosInsumos.length;
            const feitosIns = todosInsumos.filter(i => i.checked).length;

            const totalChecks = totalObs + totalEnt + totalRet + totalIns;
            const feitosChecks = feitasObs + feitasEnt + feitasRet + feitosIns;

            // Contabilizar progresso por turno (Diurno vs Noturno)
            totalItensManuaisBase += (totalObs + totalIns);
            totalEntRetAuto += (totalEnt + totalRet);
            feitosEntRetAuto += (feitasEnt + feitasRet);

            obsComCheck.forEach(o => {
                if (vChecksDiurno.get(o.item_key)?.checked) feitosManuaisDiurno++;
                if (vChecksNoturno.get(o.item_key)?.checked) feitosManuaisNoturno++;
            });
            todosInsumos.forEach(ins => {
                if (vChecksDiurno.get(ins.item_key)?.checked) feitosManuaisDiurno++;
                if (vChecksNoturno.get(ins.item_key)?.checked) feitosManuaisNoturno++;
            });

            // Quem realizou os checks deste veículo no turno ativo
            const realizadoresVeicMap = new Map();
            const registrarRealizador = (nomeLider, colabIdLider, dataHora) => {
                if (!nomeLider && !colabIdLider) return;
                const resolved = resolverColab({ colab_id: colabIdLider, nome: nomeLider });
                const nomeFinal = (resolved && resolved.nome) || nomeLider;
                if (!nomeFinal) return;
                const k = normLow(nomeFinal);
                const cid = (resolved && resolved.colab_id) || colabIdLider || null;
                const foto = (resolved && resolved.foto_url) || (cid ? `/api/colaboradores/foto/${cid}` : null);
                const ex = realizadoresVeicMap.get(k);
                if (!ex || String(dataHora || '') > String(ex.atualizado_em || '')) {
                    realizadoresVeicMap.set(k, {
                        nome: nomeFinal,
                        colab_id: cid,
                        foto_url: foto,
                        atualizado_em: dataHora || null
                    });
                }
            };
            secoes.observacoes.forEach(o => { if (o.checked && o.lider_nome) registrarRealizador(o.lider_nome, o.lider_colab_id, o.atualizado_em); });
            todosInsumos.forEach(ins => { if (ins.checked && ins.lider_nome) registrarRealizador(ins.lider_nome, ins.lider_colab_id, ins.atualizado_em); });
            if (todosCkCompletos) {
                secoes.entregas.forEach(e => { if (e.checked && e.lider_nome) registrarRealizador(e.lider_nome, e.lider_colab_id, e.atualizado_em); });
                secoes.retiradas.forEach(r => { if (r.checked && r.lider_nome) registrarRealizador(r.lider_nome, r.lider_colab_id, r.atualizado_em); });
            }

            // Resumo consolidado de insumos do veículo (para facilitar separação no galpão)
            const resumoInsumosMap = new Map();
            todosInsumos.forEach(ins => {
                const atual = resumoInsumosMap.get(ins.id) || { id: ins.id, icone: ins.icone, nome: ins.nome, qtd: 0, unidade: ins.unidade };
                atual.qtd += ins.qtd;
                resumoInsumosMap.set(ins.id, atual);
            });

            const respTurnoAtual = turnoAtivo === 'noturno' ? escalaDia.noturno : escalaDia.diurno;

            return {
                veiculo_key: vKey,
                veiculo: v.veiculo || `Veículo ${idx + 1}`,
                motorista: {
                    nome: v.motorista || '—',
                    cargo: 'Motorista',
                    colab_id: motInfo ? motInfo.id : null,
                    foto_url: (motInfo && motInfo.foto_url) || v._fotoMotorista || null
                },
                ajudante: {
                    nome: v.ajudante || '—',
                    cargo: 'Ajudante Geral',
                    colab_id: ajuInfo ? ajuInfo.id : null,
                    foto_url: (ajuInfo && ajuInfo.foto_url) || v._fotoAjudante || null
                },
                candidatos: candsVeic,
                responsavel_escala: {
                    turno: turnoAtivo,
                    nomes: respTurnoAtual.nomes,
                    escalados: respTurnoAtual.escalados,
                    diurno_nomes: escalaDia.diurno.nomes,
                    noturno_nomes: escalaDia.noturno.nomes
                },
                realizado_por: [...realizadoresVeicMap.values()],
                status_ent_ret_veiculo: statusEntRetVeiculo,
                titulo_entrega: secoes.titulo_entrega,
                observacoes: secoes.observacoes,
                entregas: secoes.entregas,
                retiradas: secoes.retiradas,
                manutencoes: secoes.manutencoes,
                outros: secoes.outros,
                resumo_insumos_veiculo: [...resumoInsumosMap.values()],
                progresso: {
                    total: totalChecks,
                    feitos: feitosChecks,
                    pendentes: Math.max(0, totalChecks - feitosChecks),
                    concluido: totalChecks > 0 ? feitosChecks >= totalChecks : true,
                    obs: { total: totalObs, feitos: feitasObs },
                    entregas: { total: totalEnt, feitos: feitasEnt },
                    retiradas: { total: totalRet, feitos: feitasRet },
                    insumos: { total: totalIns, feitos: feitosIns }
                }
            };
        });

        function calcularProgressoDeRowResumo(rowRef) {
            const pDados = parseJson(rowRef.dados, {});
            const vRaw = Array.isArray(pDados) ? pDados : (pDados && Array.isArray(pDados.veiculos) ? pDados.veiculos : []);
            const mapChecks = new Map();
            checksRowsTodos.filter(r => String(r.resumo_id) === String(rowRef.id) && r.checked).forEach(r => {
                const cleanKey = String(r.item_key || '').replace(/^noturno::/, '');
                if (!mapChecks.has(r.veiculo_key)) mapChecks.set(r.veiculo_key, new Map());
                mapChecks.get(r.veiculo_key).set(cleanKey, { checked: 1 });
            });
            let tot = 0;
            let fts = 0;
            vRaw.forEach((vItem, iIdx) => {
                const vk = slug(vItem.veiculo || `veiculo_${iIdx}`);
                const vc = mapChecks.get(vk) || new Map();
                const sec = parseSecoesColB(
                    obterColBBaseLimpa(vItem),
                    vItem,
                    vc,
                    (mod, nomeEq, qtd) => ({ checked: false, status: mod ? 'pendente' : 'sem_checklist', concluidas: 0, total_unidades: qtd }),
                    (mod, nomeEq, qtd) => ({ checked: false, status: mod ? 'pendente' : 'sem_checklist', concluidas: 0, total_unidades: qtd })
                );
                tot += sec.observacoes.length;
                fts += sec.observacoes.filter(o => o.checked).length;
                const insAll = sec.manutencoes.flatMap(m => m.insumos);
                tot += insAll.length;
                fts += insAll.filter(i => i.checked).length;
                if (sec.entregas.some(e => e.status !== 'sem_checklist')) tot += 1;
                if (sec.retiradas.some(r => r.status !== 'sem_checklist')) tot += 1;
            });
            return { total: tot, feitos: fts, concluido: tot > 0 && fts >= tot };
        }

        const totalGeralPorTurno = totalItensManuaisBase + totalEntRetAuto;
        const feitosGeralDiurno = feitosManuaisDiurno + feitosEntRetAuto;
        const feitosGeralNoturno = feitosManuaisNoturno + feitosEntRetAuto;

        if (temResumosSeparadosPorTurno) {
            if (String(chosenRow.id) === String(rowPadraoDiurno.id)) {
                escalaDia.diurno.progresso = {
                    total: totalGeralPorTurno,
                    feitos: feitosGeralDiurno,
                    concluido: totalGeralPorTurno > 0 && feitosGeralDiurno >= totalGeralPorTurno
                };
                escalaDia.noturno.progresso = calcularProgressoDeRowResumo(rowPadraoNoturno);
            } else if (String(chosenRow.id) === String(rowPadraoNoturno.id)) {
                escalaDia.noturno.progresso = {
                    total: totalGeralPorTurno,
                    feitos: feitosGeralNoturno,
                    concluido: totalGeralPorTurno > 0 && feitosGeralNoturno >= totalGeralPorTurno
                };
                escalaDia.diurno.progresso = calcularProgressoDeRowResumo(rowPadraoDiurno);
            } else {
                escalaDia.diurno.progresso = calcularProgressoDeRowResumo(rowPadraoDiurno);
                escalaDia.noturno.progresso = calcularProgressoDeRowResumo(rowPadraoNoturno);
            }
        } else {
            escalaDia.diurno.progresso = {
                total: totalGeralPorTurno,
                feitos: feitosGeralDiurno,
                concluido: totalGeralPorTurno > 0 && feitosGeralDiurno >= totalGeralPorTurno
            };
            escalaDia.noturno.progresso = {
                total: totalGeralPorTurno,
                feitos: feitosGeralNoturno,
                concluido: totalGeralPorTurno > 0 && feitosGeralNoturno >= totalGeralPorTurno
            };
        }
        escalaDia.diurno.realizado_por = [...realizadoresPorTurno.diurno.values()];
        escalaDia.noturno.realizado_por = [...realizadoresPorTurno.noturno.values()];

        return {
            hoje: hojeSP(),
            data: iso,
            turno_ativo: turnoAtivo,
            escala_dia: escalaDia,
            resumos: listaResumos,
            resumo_ativo: {
                id: chosenRow.id,
                nome: chosenRow.nome,
                criado_em: chosenRow.criado_em,
                usuario_nome: chosenRow.usuario_nome
            },
            veiculos
        };
    }

    // ── GET /api/app/resumo-rota ────────────────────────────────────────────────
    app.get('/api/app/resumo-rota', guard, async (req, res) => {
        try {
            const hoje = hojeSP();
            const dataSel = isoDate(req.query.data) || hoje;
            const resumoId = req.query.resumo_id || null;
            const turnoSel = req.query.turno || null;
            const de = isoDate(req.query.de) || somaDias(dataSel, -7);
            const ate = isoDate(req.query.ate) || somaDias(dataSel, 7);

            // Buscar todos os nomes de resumos para montar indicadores nos dias da agenda
            const todosResumos = await dbAll(`SELECT id, nome, criado_em FROM logistica_resumo_rota ORDER BY id DESC LIMIT 180`);
            const diasAgenda = {};
            todosResumos.forEach(r => {
                const m = String(r.nome || '').match(/^(\d{2})-(\d{2})-(\d{4})/);
                if (!m) return;
                const iso = `${m[3]}-${m[2]}-${m[1]}`;
                if (iso >= de && iso <= ate) {
                    if (!diasAgenda[iso]) diasAgenda[iso] = { qtd_resumos: 0, ultimo_id: r.id, nomes: [] };
                    diasAgenda[iso].qtd_resumos++;
                    diasAgenda[iso].nomes.push(r.nome);
                }
            });

            const uid = req.user && req.user.id;
            const dadosDia = await montarResumoDoDia(dataSel, resumoId, turnoSel, uid);
            res.json(Object.assign({}, dadosDia, { dias_agenda: diasAgenda }));
        } catch (e) {
            console.error('[APP-RESUMO-ROTA] GET:', e);
            res.status(500).json({ error: 'Erro ao carregar Resumo da Rota: ' + e.message });
        }
    });

    // ── POST /api/app/resumo-rota/check ─────────────────────────────────────────
    // Marca/desmarca check em Observação ou Insumo de Manutenção
    // (Entregas e Retiradas são bloqueadas aqui pois só podem ser marcadas via checklist próprio)
    app.post('/api/app/resumo-rota/check', guard, async (req, res) => {
        try {
            const { resumo_id, turno, data_rota, veiculo_key, item_key, tipo_item, checked } = req.body || {};
            if (!resumo_id || !veiculo_key || !item_key) {
                return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
            }
            if (tipo_item === 'entrega' || tipo_item === 'retirada') {
                return res.status(400).json({ error: 'Entregas e retiradas são marcadas automaticamente ao concluir o checklist na respectiva tela.' });
            }
            const lider = await liderDoReq(req);
            const chkVal = checked ? 1 : 0;
            const iso = isoDate(data_rota) || hojeSP();
            const cleanKey = String(item_key).replace(/^noturno::/, '');
            const dbItemKey = (turno === 'noturno') ? `noturno::${cleanKey}` : cleanKey;

            await dbRun(
                `INSERT INTO app_resumo_rota_checks (resumo_id, data_rota, veiculo_key, item_key, tipo_item, checked, lider_id, lider_nome, lider_colab_id, atualizado_em)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(resumo_id, veiculo_key, item_key) DO UPDATE SET
                    checked = excluded.checked,
                    tipo_item = excluded.tipo_item,
                    lider_id = excluded.lider_id,
                    lider_nome = excluded.lider_nome,
                    lider_colab_id = excluded.lider_colab_id,
                    atualizado_em = CURRENT_TIMESTAMP`,
                [resumo_id, iso, veiculo_key, dbItemKey, tipo_item || 'obs', chkVal, lider.id, lider.nome, lider.colabId]
            );

            res.json({
                ok: true,
                checked: !!chkVal,
                lider_nome: chkVal ? lider.nome : null,
                lider_colab_id: chkVal ? (lider.colabId || null) : null,
                lider_foto_url: chkVal ? (lider.foto_url || null) : null,
                atualizado_em: new Date().toISOString()
            });
        } catch (e) {
            console.error('[APP-RESUMO-ROTA] POST check:', e);
            res.status(500).json({ error: 'Erro ao salvar check: ' + e.message });
        }
    });

    // ── POST /api/app/resumo-rota/check-lote ────────────────────────────────────
    // Permite marcar todos os insumos de um equipamento ou veículo de uma vez se desejado
    app.post('/api/app/resumo-rota/check-lote', guard, async (req, res) => {
        try {
            const { resumo_id, turno, data_rota, veiculo_key, itens, checked } = req.body || {};
            if (!resumo_id || !veiculo_key || !Array.isArray(itens) || !itens.length) {
                return res.status(400).json({ error: 'Parâmetros inválidos.' });
            }
            const lider = await liderDoReq(req);
            const chkVal = checked ? 1 : 0;
            const iso = isoDate(data_rota) || hojeSP();

            for (const it of itens) {
                if (!it || !it.item_key || it.tipo_item === 'entrega' || it.tipo_item === 'retirada') continue;
                const cleanKey = String(it.item_key).replace(/^noturno::/, '');
                const dbItemKey = (turno === 'noturno') ? `noturno::${cleanKey}` : cleanKey;
                await dbRun(
                    `INSERT INTO app_resumo_rota_checks (resumo_id, data_rota, veiculo_key, item_key, tipo_item, checked, lider_id, lider_nome, lider_colab_id, atualizado_em)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                     ON CONFLICT(resumo_id, veiculo_key, item_key) DO UPDATE SET
                        checked = excluded.checked,
                        lider_id = excluded.lider_id,
                        lider_nome = excluded.lider_nome,
                        lider_colab_id = excluded.lider_colab_id,
                        atualizado_em = CURRENT_TIMESTAMP`,
                    [resumo_id, iso, veiculo_key, dbItemKey, it.tipo_item || 'insumo', chkVal, lider.id, lider.nome, lider.colabId]
                );
            }

            res.json({
                ok: true,
                checked: !!chkVal,
                lider_nome: chkVal ? lider.nome : null,
                lider_colab_id: chkVal ? (lider.colabId || null) : null,
                lider_foto_url: chkVal ? (lider.foto_url || null) : null
            });
        } catch (e) {
            console.error('[APP-RESUMO-ROTA] POST check-lote:', e);
            res.status(500).json({ error: 'Erro ao salvar checks: ' + e.message });
        }
    });
};
