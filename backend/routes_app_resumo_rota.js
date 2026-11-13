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
        '💧':                      '💧',
        'AVULSO':                  '❗',
        '❗':                      '❗',
        'UTILITARIO':              '🛻',
        'UTILITÁRIO':              '🛻',
        '🛻':                      '🛻',
        'BANHEIRO ITINERANTE':     '🔛',
        '🔛':                      '🔛',
    };

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
    // - Banheiros ELX: 1 química, 1 pacote de papel higiênico, 1 pacote de papel toalha, 200ml sabonete líquido
    // - PBII: 2 pacotes de papel toalha, 200ml sabonete líquido
    // - PBIII: 3 pacotes de papel toalha, 400ml sabonete líquido
    // - Outros equipamentos: não têm insumos
    function calcularInsumosEquipamento(nomeEquip, qtd) {
        const q = Math.max(1, parseInt(qtd, 10) || 1);
        const t = norm(nomeEquip).toUpperCase();

        // 1. PBIII (checar antes de PBII)
        if (/\bPB\s*III\b|\bPIA\s*III\b/.test(t)) {
            const pacToalha = 3 * q;
            const mlSab = 400 * q;
            return [
                { id: 'papel_toalha', icone: '📄', nome: 'Papel toalha', qtd: pacToalha, unidade: 'pacote(s)', texto: `${pacToalha} ${pacToalha === 1 ? 'pacote' : 'pacotes'} de papel toalha` },
                { id: 'sabonete',     icone: '🧴', nome: 'Sabonete líquido', qtd: mlSab, unidade: 'ml', texto: `${mlSab}ml sabonete líquido` }
            ];
        }
        // 2. PBII
        if (/\bPB\s*II\b|\bPIA\s*II\b/.test(t)) {
            const pacToalha = 2 * q;
            const mlSab = 200 * q;
            return [
                { id: 'papel_toalha', icone: '📄', nome: 'Papel toalha', qtd: pacToalha, unidade: 'pacote(s)', texto: `${pacToalha} ${pacToalha === 1 ? 'pacote' : 'pacotes'} de papel toalha` },
                { id: 'sabonete',     icone: '🧴', nome: 'Sabonete líquido', qtd: mlSab, unidade: 'ml', texto: `${mlSab}ml sabonete líquido` }
            ];
        }
        // 3. Banheiros ELX (checar antes de LX)
        if (/\b(ELX|SLX)\b|EXTRA\s*LUXO/.test(t)) {
            const quim = 1 * q;
            const pacHig = 1 * q;
            const pacToalha = 1 * q;
            const mlSab = 200 * q;
            return [
                { id: 'quimica',         icone: '🧪', nome: 'Química',          qtd: quim,      unidade: 'unid.',     texto: `${quim} ${quim === 1 ? 'química' : 'químicas'}` },
                { id: 'papel_higienico', icone: '🧻', nome: 'Papel higiênico',  qtd: pacHig,    unidade: 'pacote(s)', texto: `${pacHig} ${pacHig === 1 ? 'pacote' : 'pacotes'} de papel higiênico` },
                { id: 'papel_toalha',    icone: '📄', nome: 'Papel toalha',     qtd: pacToalha, unidade: 'pacote(s)', texto: `${pacToalha} ${pacToalha === 1 ? 'pacote' : 'pacotes'} de papel toalha` },
                { id: 'sabonete',        icone: '🧴', nome: 'Sabonete líquido', qtd: mlSab,     unidade: 'ml',        texto: `${mlSab}ml sabonete líquido` }
            ];
        }
        // 4. Banheiro STD e LX
        if (/\bSTD\b|STANDARD|\bLX\b/.test(t)) {
            const quim = 1 * q;
            const pacHig = 1 * q;
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
            const textoParaIcone = [os.cliente, os.obs, os.notas_raw, habs, vars].filter(Boolean).join(' ');
            let icon = rrObsIcon(textoParaIcone);
            const temInfoImportante = textoParaIcone.toUpperCase().includes('INFORMA') && textoParaIcone.toUpperCase().includes('IMPORTANTE');
            if (temInfoImportante && !icon.includes('🚨')) icon = '🚨' + icon;
            if (!os.obs && !icon) return;

            let nome = String(os.cliente || '').trim();
            nome = nome.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s\u26BD\u23D5\u25C6\u267B\u267F\u26AA\u26AB\u26FC🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘💙💜🟦🟣🔵♿🚿🚽🧼⬜⚪🛤🧊]+/gu, '').trim();
            if (nome.length > 20) nome = nome.substring(0, 20).trim();

            let obsLimpa = String(os.obs || '');
            obsLimpa = obsLimpa.replace(/(?:📸\s*)?V[íi]deo:\s*https?:\/\/[^\s]+/gi, '');
            obsLimpa = obsLimpa.replace(/^[,\s]+|[,\s]+$/g, '').trim();
            obsLimpa = obsLimpa.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s\u26BD\u23D5\u25C6\u267B\u267F\u26AA\u26AB\u26FC🏗🎉⭕🔶💧💦⚙️📋🛒♦️♻️🔗❗⏰📞🌀🚨🦺👷🔛🌘💙💜🟦🟣🔵♿🚿🚽🧼⬜⚪🛤🧊🧑🏾‍🦽]+/gu, '').trim().toUpperCase();

            const servicoLimpo = String(os.servico || '').replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s🧑🏾‍🦽❗⭕🔗🌀🚨]+/gu, '').trim().toUpperCase();
            if (obsLimpa && servicoLimpo && obsLimpa === servicoLimpo) obsLimpa = '';
            if (obsLimpa && /^(ENTREGA|RETIRADA|MANUTENCAO|MANUTENÇÃO|COMPRAS|VISITA|LIMPA FOSSA)\b/.test(norm(obsLimpa).toUpperCase())) obsLimpa = '';

            if (obsLimpa) {
                const linhaObs = `${icon ? icon + ' ' : ''}${nome}: ${obsLimpa}`;
                if (!obsLinhasSet.has(linhaObs)) { obsLinhasSet.add(linhaObs); obsLinhas.push(linhaObs); }
            } else if (icon) {
                const textoSemCliente = [os.obs, os.notas_raw, habs, vars].filter(Boolean).join(' ');
                const iconSemCliente = rrObsIcon(textoSemCliente);
                if (iconSemCliente) {
                    let obsDoNotasRaw = '';
                    if (os.notas_raw) {
                        const notasNorm = String(os.notas_raw).replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                        for (const ln of notasNorm.split('\n').map(l => l.trim()).filter(Boolean)) {
                            const lnUp = norm(ln).toUpperCase();
                            const lnNucleo = lnUp.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s❗⭕🔗🌀🚨]+/gu, '').trim();
                            if (/^ENTREGA\b|^RETIRADA\b|^MANUTEN|^COMPRAS\b|^VISITA\b|^LIMPA FOSSA\b/.test(lnNucleo)) continue;
                            if (/^\d+\s+\S/.test(ln) || /^\d+X\s*-/.test(lnUp)) continue;
                            const lnLimpa = ln.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F\s🔗❗🌀🚨]+/gu, '').trim().toUpperCase();
                            if (lnLimpa) { obsDoNotasRaw = lnLimpa; break; }
                        }
                    }
                    const fallbackTxt = obsDoNotasRaw || (iconSemCliente.includes('🚨') ? 'AVISO IMPORTANTE!' : 'VERIFICAR DETALHES!');
                    const linhaObs = `${iconSemCliente} ${nome}: ${fallbackTxt}`;
                    if (!obsLinhasSet.has(linhaObs)) { obsLinhasSet.add(linhaObs); obsLinhas.push(linhaObs); }
                }
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
            outros.forEach(o => lines.push(String(o.servico || '').toUpperCase()));
            lines.push('');
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

    function obterColBBaseLimpa(v) {
        let base = v.colBEditado || montarColB(v);
        const suffixMark = '\nMotorista:';
        const suffIdx = base.indexOf(suffixMark);
        if (suffIdx !== -1) base = base.substring(0, suffIdx);
        return base;
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
            const gid = req.user && req.user.grupo_permissao_id;
            if (!gid) return res.status(403).json({ error: 'Sem permissão para acessar Resumo da Rota.' });
            const row = await dbGet(
                `SELECT visualizar FROM permissoes_grupo WHERE grupo_id = ? AND pagina_id IN (?, 'app-lideranca-entregas', 'app-lideranca-retiradas') AND (visualizar = 1 OR visualizar = '1' OR visualizar = 'true') LIMIT 1`,
                [gid, PAGE_ID]
            );
            if (row) return next();
            return res.status(403).json({ error: 'Sem permissão para acessar Resumo da Rota.' });
        } catch (e) { return res.status(500).json({ error: e.message }); }
    }
    const guard = [authenticateToken, requireApp];

    async function liderDoReq(req) {
        const uid = (req.user && req.user.id) || null;
        let nome = (req.user && (req.user.nome || req.user.username)) || 'Líder';
        try {
            const u = await dbGet("SELECT COALESCE(NULLIF(TRIM(nome),''), username) AS n FROM usuarios WHERE id = ?", [uid]);
            if (u && u.n) nome = u.n;
        } catch (e) { /* fallback */ }
        let colabId = null;
        try {
            const cfg = uid ? await dbGet('SELECT colaborador_id FROM app_lider_config WHERE usuario_id = ?', [uid]) : null;
            if (cfg) colabId = cfg.colaborador_id;
            if (!colabId) {
                const c = await dbGet('SELECT id FROM colaboradores WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM(?)) LIMIT 1', [nome]);
                if (c) colabId = c.id;
            }
        } catch (e) { /* sem foto */ }
        return { id: uid, nome, colabId };
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
                // Linha de observação
                const itemKey = 'obs_' + slug(trimmed);
                const chk = checksMap.get(itemKey);
                let titulo = '';
                let detalhe = trimmed;
                const colonIdx = trimmed.indexOf(':');
                if (colonIdx !== -1) {
                    titulo = trimmed.substring(0, colonIdx + 1);
                    detalhe = trimmed.substring(colonIdx + 1).trim();
                }
                observacoes.push({
                    item_key: itemKey,
                    texto: trimmed,
                    titulo,
                    detalhe,
                    checked: !!(chk && chk.checked),
                    lider_nome: chk && chk.checked ? chk.lider_nome : null,
                    atualizado_em: chk && chk.checked ? chk.atualizado_em : null
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
                    total_unidades: st.total_unidades,
                    tem_avaria: st.tem_avaria,
                    lider_nome: st.lider_nome,
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
                    total_unidades: st.total_unidades,
                    tem_avaria: st.tem_avaria,
                    lider_nome: st.lider_nome,
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
    async function montarResumoDoDia(iso, resumoIdOpcional) {
        const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return { data: iso, resumos: [], resumo_ativo: null, veiculos: [] };
        const prefixoBr = `${m[3]}-${m[2]}-${m[1]}`;

        // Buscar todos os resumos salvos para esta data
        const rowsResumo = await dbAll(
            `SELECT id, nome, dados, criado_em, usuario_nome FROM logistica_resumo_rota WHERE nome LIKE ? ORDER BY id ASC`,
            [prefixoBr + '%']
        );

        if (!rowsResumo.length) {
            return { data: iso, resumos: [], resumo_ativo: null, veiculos: [] };
        }

        // Lista de resumos disponíveis no dia
        const listaResumos = rowsResumo.map(r => ({
            id: r.id,
            nome: r.nome,
            criado_em: r.criado_em,
            usuario_nome: r.usuario_nome
        }));

        const chosenRow = (resumoIdOpcional && rowsResumo.find(r => String(r.id) === String(resumoIdOpcional))) || rowsResumo[rowsResumo.length - 1];
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

        // Checks manuais já gravados para este resumo
        const checksRows = await dbAll(
            `SELECT veiculo_key, item_key, tipo_item, checked, lider_nome, lider_colab_id, atualizado_em
             FROM app_resumo_rota_checks
             WHERE resumo_id = ?`,
            [chosenRow.id]
        );
        const checksByVeiculo = new Map();
        checksRows.forEach(r => {
            if (!checksByVeiculo.has(r.veiculo_key)) checksByVeiculo.set(r.veiculo_key, new Map());
            checksByVeiculo.get(r.veiculo_key).set(r.item_key, r);
        });

        // Coletar todas as OS de Entrega e Retirada do dia (e as citadas nos veículos)
        const numerosOsRota = new Set();
        veiculosRaw.forEach(v => {
            (v.os || []).forEach(o => {
                if (o._numero_os) numerosOsRota.add(String(o._numero_os).trim());
            });
        });

        const osDoDia = await dbAll(
            `SELECT id, numero_os, cliente, data_os, tipo_servico, produtos
             FROM os_logistica
             WHERE status = 'ativo' AND (data_os = ? ${numerosOsRota.size ? `OR TRIM(CAST(numero_os AS TEXT)) IN (${[...numerosOsRota].map(() => '?').join(',')})` : ''})`,
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
        entCheckRows.forEach(r => entMap.set(`${r.os_id}|${r.unit_key}`, r));
        const retMap = new Map();
        retCheckRows.forEach(r => retMap.set(`${r.os_id}|${r.unit_key}`, r));

        // Indexar OS de os_logistica por numero_os
        const osPorNumero = new Map();
        osDoDia.forEach(o => {
            const num = String(o.numero_os || '').trim();
            if (!num) return;
            if (!osPorNumero.has(num)) osPorNumero.set(num, []);
            osPorNumero.get(num).push(o);
        });

        // Montar cada veículo
        const veiculos = veiculosRaw.map((v, idx) => {
            const vKey = slug(v.veiculo || `veiculo_${idx}`);
            const vChecks = checksByVeiculo.get(vKey) || new Map();

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

            // Mapear OSs de ENTREGA e RETIRADA deste veículo para cruzar com entregas_checklist e retiradas_checklist
            const osEntVeiculo = [];
            const osRetVeiculo = [];
            const vistosEnt = new Set();
            const vistosRet = new Set();

            (v.os || []).forEach(o => {
                const num = String(o._numero_os || '').trim();
                const candidatosDb = osPorNumero.get(num) || [];
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
                    // Equipamentos sem checklist (ex: Carrinho, Limpa Fossa, Visita Técnica)
                    return { checked: true, status: 'sem_checklist', concluidas: qtdLinha, total_unidades: qtdLinha, tem_avaria: false, lider_nome: null, os_list: [] };
                }
                const unidades = [];
                const osEnvolvidas = [];
                osLista.forEach(os => {
                    const units = unidadesDaOS(os).filter(u => u.modelo === modeloAlvo);
                    if (units.length > 0) {
                        osEnvolvidas.push({ os_id: os.id, numero_os: os.numero_os, cliente: os.cliente });
                        units.forEach(u => {
                            const row = ckMap.get(`${os.id}|${u.key}`);
                            unidades.push({
                                concluido: !!(row && row.concluido_em),
                                tem_avaria: !!(row && row.concluido_em && row.tem_avaria),
                                lider_nome: row && row.concluido_em ? row.lider_nome : null
                            });
                        });
                    }
                });

                const totalUnid = unidades.length || qtdLinha;
                const concl = unidades.filter(u => u.concluido).length;
                const algumaAvaria = unidades.some(u => u.tem_avaria);
                const ultimoLider = (unidades.find(u => u.lider_nome) || {}).lider_nome || null;
                const checked = unidades.length > 0 && concl >= unidades.length;
                const status = checked ? (algumaAvaria ? 'avaria' : 'ok') : (concl > 0 ? 'andamento' : 'pendente');

                return {
                    checked,
                    status,
                    concluidas: concl,
                    total_unidades: totalUnid,
                    tem_avaria: algumaAvaria,
                    lider_nome: ultimoLider,
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

            // Calcular contadores gerais de progresso deste veículo
            const totalObs = secoes.observacoes.length;
            const feitasObs = secoes.observacoes.filter(o => o.checked).length;

            const entComCk = secoes.entregas.filter(e => e.status !== 'sem_checklist');
            const totalEnt = entComCk.length;
            const feitasEnt = entComCk.filter(e => e.checked).length;

            const retComCk = secoes.retiradas.filter(r => r.status !== 'sem_checklist');
            const totalRet = retComCk.length;
            const feitasRet = retComCk.filter(r => r.checked).length;

            const todosInsumos = secoes.manutencoes.flatMap(m => m.insumos);
            const totalIns = todosInsumos.length;
            const feitosIns = todosInsumos.filter(i => i.checked).length;

            const totalChecks = totalObs + totalEnt + totalRet + totalIns;
            const feitosChecks = feitasObs + feitasEnt + feitasRet + feitosIns;

            // Resumo consolidado de insumos do veículo (para facilitar separação no galpão)
            const resumoInsumosMap = new Map();
            todosInsumos.forEach(ins => {
                const atual = resumoInsumosMap.get(ins.id) || { id: ins.id, icone: ins.icone, nome: ins.nome, qtd: 0, unidade: ins.unidade };
                atual.qtd += ins.qtd;
                resumoInsumosMap.set(ins.id, atual);
            });

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

        return {
            hoje: hojeSP(),
            data: iso,
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

            const dadosDia = await montarResumoDoDia(dataSel, resumoId);
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
            const { resumo_id, data_rota, veiculo_key, item_key, tipo_item, checked } = req.body || {};
            if (!resumo_id || !veiculo_key || !item_key) {
                return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
            }
            if (tipo_item === 'entrega' || tipo_item === 'retirada') {
                return res.status(400).json({ error: 'Entregas e retiradas são marcadas automaticamente ao concluir o checklist na respectiva tela.' });
            }
            const lider = await liderDoReq(req);
            const chkVal = checked ? 1 : 0;
            const iso = isoDate(data_rota) || hojeSP();

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
                [resumo_id, iso, veiculo_key, item_key, tipo_item || 'obs', chkVal, lider.id, lider.nome, lider.colabId]
            );

            res.json({
                ok: true,
                checked: !!chkVal,
                lider_nome: chkVal ? lider.nome : null,
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
            const { resumo_id, data_rota, veiculo_key, itens, checked } = req.body || {};
            if (!resumo_id || !veiculo_key || !Array.isArray(itens) || !itens.length) {
                return res.status(400).json({ error: 'Parâmetros inválidos.' });
            }
            const lider = await liderDoReq(req);
            const chkVal = checked ? 1 : 0;
            const iso = isoDate(data_rota) || hojeSP();

            for (const it of itens) {
                if (!it || !it.item_key || it.tipo_item === 'entrega' || it.tipo_item === 'retirada') continue;
                await dbRun(
                    `INSERT INTO app_resumo_rota_checks (resumo_id, data_rota, veiculo_key, item_key, tipo_item, checked, lider_id, lider_nome, lider_colab_id, atualizado_em)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                     ON CONFLICT(resumo_id, veiculo_key, item_key) DO UPDATE SET
                        checked = excluded.checked,
                        lider_id = excluded.lider_id,
                        lider_nome = excluded.lider_nome,
                        lider_colab_id = excluded.lider_colab_id,
                        atualizado_em = CURRENT_TIMESTAMP`,
                    [resumo_id, iso, veiculo_key, it.item_key, it.tipo_item || 'insumo', chkVal, lider.id, lider.nome, lider.colabId]
                );
            }

            res.json({ ok: true, checked: !!chkVal, lider_nome: chkVal ? lider.nome : null });
        } catch (e) {
            console.error('[APP-RESUMO-ROTA] POST check-lote:', e);
            res.status(500).json({ error: 'Erro ao salvar checks: ' + e.message });
        }
    });
};
