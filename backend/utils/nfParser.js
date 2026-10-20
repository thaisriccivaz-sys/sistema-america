'use strict';
/**
 * Leitor de Nota Fiscal / Ordem de Serviço / Orçamento em PDF:
 *  - analisarNotaFiscal(buffer): extrai SOMENTE PEÇAS / PRODUTOS / MATERIAIS (nunca serviços/mão de obra).
 *  - analisarNotaServico(buffer): extrai SERVIÇOS / MÃO DE OBRA (com fallback local completo e IA).
 */

const SOMA_TOL = 0.011;
const UNIDADES = new Set(['UN', 'UND', 'UNID', 'PC', 'PÇ', 'PCS', 'PCT', 'JG', 'LT', 'L', 'KT', 'CX', 'KG', 'MT', 'M', 'PAR', 'CJ', 'FR', 'GL', 'BD', 'RL', 'TB', 'SC', 'PR', 'HR', 'H', 'SV', 'SERV']);
const FIM_TABELA = /DADOS ADICIONAIS|C[AÁ]LCULO DO ISSQN|INFORMA[CÇ][OÕ]ES COMPLEMENTARES|RESERVADO (AO|PARA O) FISCO|INFORMA[CÇ]OES COMPLEMENTARES|SERVI[CÇ]OS A EXECUTAR|DISCRIMINA[CÇ][AÃ]O DOS SERVI[CÇ]OS/i;
const FIM_TABELA_SERVICO = /DADOS ADICIONAIS|INFORMA[CÇ][OÕ]ES COMPLEMENTARES|RESERVADO (AO|PARA O) FISCO|INFORMA[CÇ]OES COMPLEMENTARES|PE[CÇ]AS A APLICAR|REQUISI[CÇ][AÃ]O DE PE[CÇ]AS/i;
const RUIDO = /ICMS|\bBC\b|\bVl\.|\bVLR|\bVlr|C[oó]d\.? ?Barras|Vendedor|Digitador|Cond\.? ?Pag|\bIBS\b|\bCBS\b|IBPT|IMPOSTO|RICMS|\bSUBS\b|TRIBUT|ARTIGO|\bFonte\b|^Ref:|COD\.? ?FABRICA|PEDIDO|\bFCI\b|EXTERNO\s*\[|GARANTIA\s+P[CÇ]|SERVI[CÇ]O\s+AUTORIZADO\s+PELO\s+CLIENTE|SERVI[CÇ]OS\s+A\s+EXECUTAR|C[OÓ]DIGO\s+DESCRI[CÇ][AÃ]O\s+QTD|VR\.\s*UNIT|VR\.\s*LIQUIDO|COFC\s+CLIENTE/i;

const CABECALHO_LIXO_RE = /^(?:.*?\b(?:EXTERNO\s*\[[^\]]*\]|GARANTIA\s+P[CÇ]\.?\s*BALC[AÃ]O\s*\[[^\]]*\]|Servi[cç]o\s+Autorizado\s+pelo\s+Cliente(?:\s+Sem\s+Pr[eé]vio\s+Or[cç]amento)?|SERVI[CÇ]OS\s+A\s+EXECUTAR|PE[CÇ]AS\s+A\s+APLICAR|C[OÓ]DIGO\s+DESCRI[CÇ][AÃ]O\s+QTD\s+VR\.?\s*UNIT\.?\s*(?:GD\s*%?\s*DESC\.?\s*VR\.?\s*LIQUIDO\s*(?:COFC\s+CLIENTE)?)?)\s*)+/i;

function limparDescricaoItem(s) {
    let txt = String(s || '').replace(/\s+/g, ' ').trim();
    txt = txt.replace(CABECALHO_LIXO_RE, '').trim();
    txt = txt.replace(/^.*\bCOFC\s+CLIENTE\s+/i, '').trim();
    txt = txt.replace(/^.*\bC[OÓ]DIGO\s+DESCRI[CÇ][AÃ]O\s+QTD[^A-Za-z0-9]+/i, '').trim();
    return txt.substring(0, 200);
}

function ehItemDeMaoDeObra(desc) {
    const n = semAcento(desc).toUpperCase().trim();
    if (!n) return false;
    if (/\bSERVICOS?\s+A\s+EXECUTAR\b/.test(n)) return true;
    if (/^MECANICA\s*-\s*CA\b/.test(n) || /\(\d+-ATENDIMENTO\)/i.test(n)) return true;
    if (/^(?:MAO\s+DE\s+OBRA|SERVICO\s+DE\s+|DIAGNOSTICO\s+SCANNER|REGENERACAO\s+DO\s+SISTEMA|REVISAR\s+DIFERENCIAL|ALINHAMENTO\s+E\s+BALANCEAMENTO|SOCORRO\s+MECANICO|GUINCHO)\b/.test(n)) return true;
    return false;
}

function semAcento(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

function parseBR(s) {
    const t = String(s).trim();
    if (!/^(\d{1,3}(\.\d{3})+|\d+),\d+$/.test(t)) return null;
    return parseFloat(t.replace(/\./g, '').replace(',', '.'));
}

function numeroCandidato(t) {
    const br = parseBR(t);
    if (br !== null) return br;
    if (/^\d{1,5}$/.test(t)) {
        if (/^0\d{2}$/.test(t)) return null;                       // CST (000, 020, 060...)
        if (/^\d{4}$/.test(t) && +t >= 5000 && +t <= 7999) return null; // CFOP
        return parseInt(t, 10);
    }
    return null;
}

function pareceCodigo(t) {
    if (!t) return false;
    if (/^\d{8}$/.test(t)) return false;                     // NCM
    if (/^\d{1,2}-GARANTIA/i.test(t)) return false;          // Ex: 30-GARANTIA
    if (parseBR(t) !== null) return false;
    if (!/^[A-Za-z0-9][A-Za-z0-9.\-\/]{2,}$/.test(t)) return false;
    return /\d/.test(t);
}

function juntaTexto(arr) { return arr.join(' ').replace(/\s+/g, ' ').replace(/\s+-\s+/g, ' - ').trim(); }

// ---------------------------------------------------------------------------
// Extracao das linhas de uma pagina (tokens com posicao)
// ---------------------------------------------------------------------------
function tokenizarPagina(items) {
    const tokens = [];
    items.forEach(it => {
        const str = String(it.str || '');
        if (!str.trim()) return;
        const x0 = it.transform[4], y = it.transform[5];
        const w = it.width || (str.length * 4);
        const len = str.length;
        const re = /\S+/g; let m;
        while ((m = re.exec(str)) !== null) {
            tokens.push({ t: m[0], x: x0 + (m.index / len) * w, y: y });
        }
    });
    return tokens;
}

function agruparLinhas(tokens) {
    const ord = tokens.slice().sort((a, b) => b.y - a.y || a.x - b.x);
    const linhas = [];
    ord.forEach(tk => {
        const ult = linhas[linhas.length - 1];
        if (ult && Math.abs(ult.y - tk.y) <= 3) { ult.tokens.push(tk); }
        else linhas.push({ y: tk.y, tokens: [tk] });
    });
    linhas.forEach(l => {
        l.tokens.sort((a, b) => a.x - b.x);
        l.texto = l.tokens.map(t => t.t).join(' ');
        l.norm = semAcento(l.texto).toUpperCase();
    });
    return linhas;
}

function acharTriple(tokens) {
    const nums = [];
    tokens.forEach((tk, idx) => { const v = numeroCandidato(tk.t); if (v !== null && v > 0) nums.push({ v: v, idx: idx, t: tk.t }); });
    let melhor = null;
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            for (let k = j + 1; k < nums.length; k++) {
                const q = nums[i].v, u = nums[j].v, tt = nums[k].v;
                const dif = Math.abs(q * u - tt);
                if (dif <= SOMA_TOL + 1e-9 && tt >= 0.01 && (!melhor || dif < melhor.dif - 1e-9)) {
                    melhor = { q: q, u: u, t: tt, dif: dif, usados: [nums[i].idx, nums[j].idx, nums[k].idx] };
                }
            }
        }
    }
    return melhor;
}

function extrairLinhasTabela(linhas, ini, fimRegex) {
    let fim = linhas.length;
    for (let i = ini + 1; i < linhas.length; i++) {
        if (fimRegex.test(linhas[i].norm) && i > ini) { fim = i; break; }
    }
    const itens = [];
    let pendente = null;
    for (let i = ini + 1; i < fim; i++) {
        const l = linhas[i];
        if (RUIDO.test(l.texto)) { pendente = null; continue; }
        const tr = acharTriple(l.tokens);
        if (tr) {
            const usados = new Set(tr.usados);
            const textoToks = [];
            let un = '';
            let primeiro = true;
            l.tokens.forEach((tk, idx) => {
                const ehPrimeiro = primeiro; primeiro = false;
                if (usados.has(idx)) return;
                if (UNIDADES.has(tk.t.toUpperCase()) && !un) { un = tk.t.toUpperCase(); return; }
                const prox = l.tokens[idx + 1];
                const codigoComHifen = pareceCodigo(tk.t) && (/-$/.test(tk.t) || (prox && prox.t === '-'));
                if (/[A-Za-zÀ-ÿ]/.test(tk.t) || tk.t === '-' || (ehPrimeiro && pareceCodigo(tk.t)) || codigoComHifen) textoToks.push(tk.t);
            });
            let toks = (pendente ? pendente.toks : []).concat(textoToks);
            itens.push({ toks: toks, unidade: un, quantidade: tr.q, valor_unit: tr.u, valor_total: tr.t });
            pendente = null;
            continue;
        }
        const toks = l.tokens.map(t => t.t);
        if (!toks.length) continue;
        if (pareceCodigo(toks[0]) && l.texto.length <= 120) { pendente = { toks: toks }; continue; }
        if (pendente && l.texto.length <= 100) { pendente.toks = pendente.toks.concat(toks); continue; }
        pendente = null;
        const ult = itens[itens.length - 1];
        if (ult && l.texto.length <= 60 && /[A-Za-zÀ-ÿ]/.test(l.texto)) ult.toks = ult.toks.concat(toks);
    }
    return itens.map(it => {
        let toks = it.toks.slice();
        let codigo = '';
        for (let k = 1; k < toks.length - 1; k++) {
            if (toks[k + 1] === '-' && pareceCodigo(toks[k]) && /[A-Za-z]/.test(toks[k]) && !/[A-Za-z]/.test(toks[0])) { toks = toks.slice(k); break; }
        }
        if (toks.length && pareceCodigo(toks[0])) { codigo = toks.shift().replace(/-+$/, ''); }
        while (toks.length && toks[0] === '-') toks.shift();
        const descLimpa = limparDescricaoItem(juntaTexto(toks));
        return {
            codigo: codigo,
            descricao: descLimpa,
            unidade: it.unidade,
            quantidade: it.quantidade,
            valor_unit: Math.round(it.valor_unit * 10000) / 10000,
            valor_total: Math.round(it.valor_total * 100) / 100
        };
    });
}

function itensDaPagina(linhas) {
    // Somente processa localmente como PECAS se houver cabecalho de tabela de produtos DANFE (NCM + DESCRI)
    // ou cabecalho explicito de tabela de PECAS/PRODUTOS (nunca "SERVICOS A EXECUTAR")
    let ini = linhas.findIndex(l => l.norm.includes('NCM') && l.norm.includes('DESCRI'));
    if (ini === -1) {
        const idxPecas = linhas.findIndex(l => /\b(?:PECAS\s+A\s+APLICAR|REQUISICAO\s+DE\s+PECAS|ITENS\s+DE\s+PECAS|TABELA\s+DE\s+PECAS)\b/.test(l.norm));
        if (idxPecas >= 0) ini = idxPecas;
        else return [];
    }
    return extrairLinhasTabela(linhas, ini, FIM_TABELA).filter(it => it.descricao && !ehItemDeMaoDeObra(it.descricao));
}

// ---------------------------------------------------------------------------
// Dados do cabecalho (via chave de acesso e textos fixos)
// ---------------------------------------------------------------------------
function dadosCabecalho(textoCompleto) {
    const r = { numero: '', serie: '', emissao: '', fornecedor: '', cnpj: '', chave_acesso: '', garantia_sugerida: null };
    let chaveAchada = '';
    const runs = textoCompleto.match(/(?:\d{4}[ \t]*)+/g) || [];
    for (const run of runs) {
        const d = run.replace(/\D/g, '');
        for (let i = 0; i + 44 <= d.length && !chaveAchada; i += 4) {
            if (d.substr(i + 20, 2) === '55') chaveAchada = d.substr(i, 44);
        }
        if (chaveAchada) break;
    }
    const mChave = chaveAchada ? [chaveAchada, chaveAchada] : null;
    if (mChave) {
        const ch = mChave[0];
        r.chave_acesso = ch;
        r.serie = String(parseInt(ch.substr(22, 3), 10));
        r.numero = String(parseInt(ch.substr(25, 9), 10));
        const c = ch.substr(6, 14);
        r.cnpj = c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    const mForn = textoCompleto.match(/RECEBEMOS DE,?\s+(.+?)[,\s]+OS PRODUTOS/i);
    if (mForn) r.fornecedor = mForn[1].replace(/\s+/g, ' ').trim();
    const iEm = textoCompleto.search(/EMISS[ÃA]O/i);
    const mData = (iEm >= 0 ? textoCompleto.substring(iEm) : textoCompleto).match(/(\d{2}\/\d{2}\/\d{4})/);
    if (mData) r.emissao = mData[1];
    const mG = textoCompleto.match(/garantia\s+(?:de\s+)?(\d{1,3})\s*(dias?|meses|m[eê]s)/i);
    if (mG) r.garantia_sugerida = { valor: parseInt(mG[1], 10), unidade: /^d/i.test(mG[2]) ? 'dias' : 'meses' };
    return r;
}

// ---------------------------------------------------------------------------
// Leitor local (DANFE de pecas)
// ---------------------------------------------------------------------------
async function analisarLocal(buffer) {
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), verbosity: 0 }).promise;
    let itens = [];
    let textoCompleto = '';
    const dinheiro = [];
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        const tokens = tokenizarPagina(tc.items);
        const linhas = agruparLinhas(tokens);
        textoCompleto += linhas.map(l => l.texto).join('\n') + '\n';
        tokens.forEach(tk => { const v = parseBR(tk.t); if (v !== null) dinheiro.push(v); });
        itens = itens.concat(itensDaPagina(linhas));
    }
    const soma = Math.round(itens.reduce((s, i) => s + i.valor_total, 0) * 100) / 100;
    const ocorrenciasSoma = dinheiro.filter(v => Math.abs(v - soma) <= SOMA_TOL).length;
    const confere = itens.length > 0 && (itens.length > 1 ? ocorrenciasSoma >= 1 : ocorrenciasSoma >= 2);
    const cab = dadosCabecalho(textoCompleto);
    return Object.assign(cab, { itens: itens, soma_itens: soma, soma_confere: confere, fonte: 'local' });
}

// ---------------------------------------------------------------------------
// Plano B: Gemini para PECAS / PRODUTOS (exclui servicos/mao de obra)
// ---------------------------------------------------------------------------
const MODELOS_GEMINI = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

async function analisarComGemini(buffer) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY nao configurada');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const prompt = 'Voce recebe um PDF de NOTA FISCAL (DANFE), ORDEM DE SERVICO ou ORCAMENTO de manutencao automotiva. '
        + 'Extraia SOMENTE os itens de PECAS / PRODUTOS / MATERIAIS fisicos e responda SOMENTE com JSON valido, sem markdown, neste formato: '
        + '{"numero":"","serie":"","emissao":"dd/mm/aaaa","fornecedor":"razao social do emitente","cnpj":"cnpj do emitente","chave_acesso":"44 digitos",'
        + '"garantia":{"valor":0,"unidade":"dias ou meses"},'
        + '"itens":[{"codigo":"","descricao":"","unidade":"UN","quantidade":0,"valor_unit":0,"valor_total":0}]}. '
        + 'REGRAS OBRIGATORIAS: '
        + '1) Liste APENAS PECAS, PRODUTOS ou MATERIAIS fisicos aplicados. '
        + '2) NAO inclua servicos, mao de obra, horas de mecanica/oficina (ex.: "MECANICA - CA", "29-ATENDIMENTO", "DIAGNOSTICO", "REVISAR...") nem itens que estejam na tabela "SERVICOS A EXECUTAR" ou "MAO DE OBRA". '
        + '3) Se o documento tiver apenas servicos/mao de obra e nenhuma peca, retorne "itens": []. '
        + '4) Na descricao da peca, coloque apenas o nome limpo da peca (sem cabecalhos como "EXTERNO [ NAO ]", "GARANTIA PC. BALCAO", "CODIGO DESCRICAO QTD").';
    let ultimoErro = null;
    for (const nome of MODELOS_GEMINI) {
        try {
            const model = genAI.getGenerativeModel({ model: nome, generationConfig: { responseMimeType: 'application/json' } });
            const result = await model.generateContent([
                { inlineData: { mimeType: 'application/pdf', data: Buffer.from(buffer).toString('base64') } },
                { text: prompt }
            ]);
            let txt = result.response.text().trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
            const j = JSON.parse(txt);
            const itens = (Array.isArray(j.itens) ? j.itens : []).map(i => ({
                codigo: String(i.codigo || '').trim(),
                descricao: limparDescricaoItem(i.descricao),
                unidade: String(i.unidade || 'UN').trim().toUpperCase(),
                quantidade: Number(i.quantidade) || 1,
                valor_unit: Math.round((Number(i.valor_unit) || 0) * 10000) / 10000,
                valor_total: Math.round((Number(i.valor_total) || 0) * 100) / 100
            })).filter(i => (i.descricao || i.codigo) && !ehItemDeMaoDeObra(i.descricao));
            const soma = Math.round(itens.reduce((s, i) => s + i.valor_total, 0) * 100) / 100;
            const g = j.garantia && Number(j.garantia.valor) > 0
                ? { valor: parseInt(j.garantia.valor, 10), unidade: /mes/i.test(String(j.garantia.unidade)) ? 'meses' : 'dias' } : null;
            return {
                numero: String(j.numero || '').replace(/\D/g, '').replace(/^0+/, ''), serie: String(j.serie || ''), emissao: String(j.emissao || ''),
                fornecedor: String(j.fornecedor || ''), cnpj: String(j.cnpj || ''), chave_acesso: String(j.chave_acesso || '').replace(/\D/g, ''),
                garantia_sugerida: g, itens: itens, soma_itens: soma, soma_confere: false, fonte: 'ia'
            };
        } catch (e) {
            ultimoErro = e;
            const msg = String(e.message || '');
            if (msg.includes('API_KEY_INVALID')) break;
        }
    }
    throw ultimoErro || new Error('Falha ao consultar o Gemini');
}

// ---------------------------------------------------------------------------
// Orquestrador de PECAS
// ---------------------------------------------------------------------------
async function analisarNotaFiscal(buffer) {
    let local = null;
    try { local = await analisarLocal(buffer); } catch (e) { console.error('[NF] leitor local falhou:', e.message); }
    if (local && local.itens.length > 0 && local.soma_confere) return Object.assign(local, { avisos: [] });

    let ia = null, erroIa = null;
    if (process.env.GEMINI_API_KEY) {
        try {
            ia = await analisarComGemini(buffer);
            if (local && local.itens.length) ia.soma_confere = Math.abs(ia.soma_itens - local.soma_itens) <= SOMA_TOL;
        } catch (e) { erroIa = e; console.error('[NF] Gemini falhou:', e.message); }
    }
    if (ia && ia.itens.length) {
        if (local) ['numero', 'serie', 'emissao', 'fornecedor', 'cnpj', 'chave_acesso'].forEach(k => { if (!ia[k] && local[k]) ia[k] = local[k]; });
        ia.avisos = ia.soma_confere ? [] : ['As peças foram lidas por IA. Confira descrição, quantidades e valores antes de salvar.'];
        return ia;
    }
    if (ia && !ia.itens.length && (!local || !local.itens.length)) {
        if (local) ['numero', 'serie', 'emissao', 'fornecedor', 'cnpj', 'chave_acesso'].forEach(k => { if (!ia[k] && local[k]) ia[k] = local[k]; });
        ia.avisos = ['Nenhuma peça identificada neste PDF (serviços de mão de obra devem ser lançados em "NF de mão de obra"). Você pode digitar as peças abaixo manualmente.'];
        return ia;
    }
    if (local && local.itens.length) {
        local.avisos = ['A soma dos itens não bateu com o total da nota. Confira os valores antes de salvar.'];
        return local;
    }
    const base = local || { numero: '', serie: '', emissao: '', fornecedor: '', cnpj: '', chave_acesso: '', garantia_sugerida: null, itens: [], soma_itens: 0, soma_confere: false, fonte: 'nenhum' };
    base.avisos = ['Não foi possível ler as peças desta nota automaticamente. Digite as peças manualmente.'
        + (erroIa ? ' (IA: ' + String(erroIa.message).substring(0, 80) + ')' : (process.env.GEMINI_API_KEY ? '' : ' (IA não configurada)'))];
    return base;
}

// ---------------------------------------------------------------------------
// Nota fiscal / Ordem de Servico de MAO DE OBRA (servico)
// ---------------------------------------------------------------------------
function extrairServicosDeLinhas(linhas) {
    let ini = linhas.findIndex(l => /\b(?:SERVICOS?\s+A\s+EXECUTAR|SERVICOS?\s+EXECUTADOS?|DISCRIMINACAO\s+DOS\s+SERVICOS|MAO\s+DE\s+OBRA)\b/.test(l.norm));
    if (ini >= 0) {
        const extraidos = extrairLinhasTabela(linhas, ini, FIM_TABELA_SERVICO)
            .map(i => ({ descricao: limparDescricaoItem(i.descricao), valor: i.valor_total }))
            .filter(i => i.descricao);
        if (extraidos.length) return extraidos;
    }
    // Fallback para outros layouts de NF/OS/Pedido de servico: varre a pagina procurando linhas qtd x unit = total
    let iniGeral = linhas.findIndex(l => l.norm.includes('NCM') && l.norm.includes('DESCRI'));
    if (iniGeral === -1) iniGeral = -1;
    return extrairLinhasTabela(linhas, iniGeral, FIM_TABELA_SERVICO)
        .map(i => ({ descricao: limparDescricaoItem(i.descricao), valor: i.valor_total }))
        .filter(i => i.descricao);
}

async function textoDoPdf(buffer) {
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), verbosity: 0 }).promise;
    let texto = '';
    let itensServ = [];
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        const linhas = agruparLinhas(tokenizarPagina(tc.items));
        texto += linhas.map(l => l.texto).join('\n') + '\n';
        try { itensServ = itensServ.concat(extrairServicosDeLinhas(linhas)); } catch (e) { /* ignora */ }
    }
    return { texto: texto, itensServ: itensServ };
}

// NFS-e padrao nacional (DANFSe): rotulos e valores ficam em linhas diferentes
function lerNfseNacional(texto) {
    const L = String(texto || '').split('\n').map(l => l.trim());
    if (!L.some(l => /^DESCRI[ÇC][ÃA]O DO SERVI[ÇC]O$/i.test(l)) || !L.some(l => /DANFSe|N[ÚU]MERO DA NFS-?E/i.test(l))) return null;
    const valorApos = (re) => { const i = L.findIndex(l => re.test(l)); return i >= 0 ? (L[i + 1] || '') : ''; };
    const out = { numero: '', emissao: '', fornecedor: '', valor_total: 0, itens: [] };
    const mNum = valorApos(/^N[ÚU]MERO DA NFS-?E\b/i).match(/^(\d{1,12})\b/);
    if (mNum) out.numero = String(parseInt(mNum[1], 10));
    const mEmi = valorApos(/DATA E HORA DA EMISS[ÃA]O DA NFS-?E\s*$/i).match(/(\d{2}\/\d{2}\/\d{4})/) || valorApos(/^N[ÚU]MERO DA NFS-?E\b/i).match(/(\d{2}\/\d{2}\/\d{4})/);
    if (mEmi) out.emissao = mEmi[1];
    let nome = valorApos(/^NOME \/ NOME EMPRESARIAL\b/i);
    const mSuf = nome.match(/^(.*?\b(?:LTDA|EIRELI|EPP|MEI|S\.?A\.?|ME))\b/i);
    nome = mSuf ? mSuf[1] : nome.replace(/\s+[^\s/]+\/[A-Z]{2}\b.*$/, '');
    out.fornecedor = nome.replace(/\s+/g, ' ').trim();
    const mTot = valorApos(/^VALOR DA OPERA[ÇC][ÃA]O \/ SERVI[ÇC]O\b/i).match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (mTot) out.valor_total = parseBR(mTot[1]) || 0;
    const ini = L.findIndex(l => /^DESCRI[ÇC][ÃA]O DO SERVI[ÇC]O$/i.test(l));
    for (let i = ini + 1; i < L.length && !/^TIPO TRIBUTA[ÇC][ÃA]O/i.test(L[i]); i++) {
        const m = L[i].match(/^(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/);
        if (m && !/^(PLACA|O\.?\s?S\b)/i.test(m[1].trim())) out.itens.push({ descricao: limparDescricaoItem(m[1]), valor: parseBR(m[2]) || 0 });
    }
    out.itens = out.itens.filter(i => i.descricao && i.valor > 0);
    return out;
}

function dadosServicoLocal(texto, itensServ) {
    const cab = dadosCabecalho(texto);
    const nfse = lerNfseNacional(texto);
    if (nfse) { ['numero', 'emissao', 'fornecedor'].forEach(k => { if (nfse[k]) cab[k] = nfse[k]; }); if (!(itensServ && itensServ.length) && nfse.itens.length) itensServ = nfse.itens; }
    const r = {
        numero: cab.numero || '',
        serie: cab.serie || '',
        emissao: cab.emissao || '',
        fornecedor: cab.fornecedor || '',
        cnpj: cab.cnpj || '',
        chave_acesso: cab.chave_acesso || '',
        valor_total: 0,
        itens: [],
        fonte: 'local'
    };
    const mNum = texto.match(/N[úu]mero\s+da\s+Nota[^\d]{0,40}(\d{1,12})/i) || texto.match(/NFS-?e[^\d]{0,40}(\d{1,12})/i) || texto.match(/N[ºo°]\.?\s*:?\s*(\d{1,12})/i);
    if (mNum && !r.numero) r.numero = String(parseInt(mNum[1], 10));
    const mCnpj = texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    if (mCnpj && !r.cnpj) r.cnpj = mCnpj[0];
    const mData = texto.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (mData && !r.emissao) r.emissao = mData[1];
    const mForn = texto.match(/(?:Prestador[^\n]*\n|Raz[ãa]o\s+Social[^\n:]*:?\s*|Fornecedor[^\n:]*:?\s*|Emitente[^\n:]*:?\s*)([^\n]{4,80})/i);
    if (mForn && !r.fornecedor) r.fornecedor = mForn[1].replace(/\s+/g, ' ').trim();
    const mTot = texto.match(/(?:VALOR\s+(?:TOTAL\s+DA\s+NOTA|TOTAL\s+DOS\s+SERVI[ÇC]OS|DOS\s+SERVI[ÇC]OS|L[ÍI]QUIDO|TOTAL)|TOTAL\s+(?:DA\s+NOTA|DOS\s+SERVI[ÇC]OS|GERAL|L[ÍI]QUIDO|DO\s+PEDIDO|DO\s+OR[ÇC]AMENTO)|VLR\.?\s*TOTAL)[^\d]{0,40}(\d{1,3}(?:\.\d{3})*,\d{2})/i);
    if (mTot) r.valor_total = parseBR(mTot[1]) || 0;
    if (nfse && nfse.valor_total) r.valor_total = nfse.valor_total;
    if (itensServ && itensServ.length) {
        r.tabela = true;
        r.itens = itensServ.map(i => ({ descricao: limparDescricaoItem(i.descricao), valor: i.valor })).filter(i => i.descricao);
        if (!r.valor_total) r.valor_total = Math.round(r.itens.reduce((s, i) => s + i.valor, 0) * 100) / 100;
    } else {
        const mDisc = texto.match(/(?:DISCRIMINA[ÇC][ÃA]O(?:\s+DOS\s+SERVI[ÇC]OS)?|DESCRI[ÇC][ÃA]O\s+DOS\s+SERVI[ÇC]OS|SERVI[ÇC]OS\s+EXECUTADOS)[^\n]*\n([\s\S]{5,400}?)(?=\n\s*(?:VALOR|BASE\s+DE|C[ÓO]DIGO|AL[ÍI]QUOTA|TRIBUTA|PIS|COFINS|INSS|ISS|TOTAL)\b|$)/i);
        const desc = mDisc ? limparDescricaoItem(mDisc[1]) : '';
        if (desc && r.valor_total) r.itens = [{ descricao: desc, valor: r.valor_total }];
        else if (r.valor_total > 0) r.itens = [{ descricao: r.fornecedor ? ('Mão de obra - ' + r.fornecedor) : 'Mão de obra', valor: r.valor_total }];
    }
    return r;
}

async function analisarServicoGemini(buffer) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY nao configurada');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const prompt = 'Voce recebe uma NOTA FISCAL DE SERVICO (NFS-e) ou ORDEM DE SERVICO / ORCAMENTO de MAO DE OBRA de manutencao de veiculos. '
        + 'Extraia os dados e responda SOMENTE com JSON valido, sem markdown, neste formato: '
        + '{"numero":"","emissao":"dd/mm/aaaa","fornecedor":"razao social do prestador","cnpj":"cnpj do prestador","valor_total":0,'
        + '"itens":[{"descricao":"servico executado","valor":0}]}. '
        + 'Regras: liste cada servico discriminado na nota com o seu valor (numero com ponto decimal); se a nota trouxer um unico valor para varios servicos, '
        + 'retorne UMA linha com a discriminacao resumida e o valor total dos servicos; nao inclua impostos retidos como itens; '
        + 'limpe a descricao do servico removendo cabecalhos como "EXTERNO [ NAO ]", "GARANTIA PC. BALCAO", "CODIGO DESCRICAO QTD VR. UNIT.".';
    let ultimoErro = null;
    const modelosRapidos = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
    for (const nome of modelosRapidos) {
        try {
            const genCfg = { responseMimeType: 'application/json', temperature: 0 };
            if (/2\.5/.test(nome)) genCfg.thinkingConfig = { thinkingBudget: 0 };
            const model = genAI.getGenerativeModel({ model: nome, generationConfig: genCfg });
            let result = null, errTent = null;
            for (let tent = 0; tent < 2 && !result; tent++) {
                try {
                    result = await model.generateContent([
                        { inlineData: { mimeType: 'application/pdf', data: Buffer.from(buffer).toString('base64') } },
                        { text: prompt }
                    ]);
                } catch (e2) {
                    errTent = e2;
                    if (/API_KEY_INVALID|404|not found/i.test(String(e2.message || ''))) break;
                    await new Promise(r => setTimeout(r, 800));
                }
            }
            if (!result) throw errTent || new Error('Sem resposta do Gemini');
            const txt = result.response.text().trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
            const j = JSON.parse(txt);
            const itens = (Array.isArray(j.itens) ? j.itens : []).map(i => ({
                descricao: limparDescricaoItem(i.descricao),
                valor: Math.round((Number(i.valor) || 0) * 100) / 100
            })).filter(i => i.descricao);
            const soma = Math.round(itens.reduce((s, i) => s + i.valor, 0) * 100) / 100;
            return {
                numero: String(j.numero || '').replace(/\D/g, '').replace(/^0+/, ''), serie: '', emissao: String(j.emissao || ''),
                fornecedor: String(j.fornecedor || ''), cnpj: String(j.cnpj || ''), chave_acesso: '',
                valor_total: Math.round((Number(j.valor_total) || soma) * 100) / 100, itens: itens, fonte: 'ia'
            };
        } catch (e) {
            ultimoErro = e;
            const msg = String(e.message || '');
            if (msg.includes('API_KEY_INVALID')) break;
        }
    }
    throw ultimoErro || new Error('Falha ao consultar o Gemini');
}

async function analisarNotaServico(buffer) {
    let local = null, ia = null, erroIa = null, tabelaLida = false;
    try {
        const t = await textoDoPdf(buffer);
        local = dadosServicoLocal(t.texto, t.itensServ);
        tabelaLida = !!local.tabela;
    } catch (e) { console.error('[NF-MO] leitor local falhou:', e.message); }
    let localConfiavel = false;
    if (local && local.itens.length && local.numero && local.fornecedor && local.valor_total > 0 && tabelaLida) {
        const somaL = Math.round(local.itens.reduce((s, i) => s + i.valor, 0) * 100) / 100;
        localConfiavel = Math.abs(somaL - local.valor_total) <= 0.05;
    }
    if (process.env.GEMINI_API_KEY && !localConfiavel) {
        try { ia = await analisarServicoGemini(buffer); } catch (e) { erroIa = e; console.error('[NF-MO] Gemini falhou:', e.message); }
    }
    const vazio = { numero: '', serie: '', emissao: '', fornecedor: '', cnpj: '', chave_acesso: '', valor_total: 0, itens: [], fonte: 'nenhum' };
    const base = (ia && ia.itens.length) ? ia : (local && local.itens.length ? local : (ia || local || vazio));
    const outro = base === ia ? local : ia;
    if (outro) ['numero', 'emissao', 'fornecedor', 'cnpj'].forEach(k => { if (!base[k] && outro[k]) base[k] = outro[k]; });
    if (base.itens.length) {
        const soma = Math.round(base.itens.reduce((s, i) => s + i.valor, 0) * 100) / 100;
        base.avisos = (base.valor_total && Math.abs(soma - base.valor_total) > 0.05)
            ? ['A soma das linhas (' + soma.toFixed(2).replace('.', ',') + ') difere do total da nota. Confira os valores antes de salvar.']
            : (base.fonte === 'ia' ? ['Linhas lidas por IA. Confira descrição e valores antes de salvar.'] : []);
    } else {
        base.avisos = ['Não foi possível ler as linhas desta nota automaticamente. Digite os serviços e valores manualmente.'
            + (erroIa ? ' (IA: ' + String(erroIa.message).substring(0, 300) + ')' : (process.env.GEMINI_API_KEY ? '' : ' (IA não configurada)'))];
    }
    return base;
}

module.exports = { analisarNotaFiscal, analisarLocal, analisarComGemini, analisarNotaServico, parseBR, limparDescricaoItem, ehItemDeMaoDeObra };
