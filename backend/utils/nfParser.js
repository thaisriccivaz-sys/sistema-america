'use strict';
/**
 * Leitor de Nota Fiscal (DANFE em PDF) - itens de peças.
 *  1) Leitor local por coordenadas (pdfjs): monta as linhas da tabela pela posição X/Y
 *     e identifica o item pela relação  quantidade x valor unitário = valor total.
 *  2) Validação: soma dos itens x "valor total dos produtos" da nota.
 *  3) Plano B: Gemini (somente se o leitor local falhar e houver GEMINI_API_KEY).
 */

const SOMA_TOL = 0.011;
const UNIDADES = new Set(['UN', 'UND', 'UNID', 'PC', 'PÇ', 'PCS', 'PCT', 'JG', 'LT', 'L', 'KT', 'CX', 'KG', 'MT', 'M', 'PAR', 'CJ', 'FR', 'GL', 'BD', 'RL', 'TB', 'SC', 'PR']);
const FIM_TABELA = /DADOS ADICIONAIS|C[AÁ]LCULO DO ISSQN|INFORMA[CÇ][OÕ]ES COMPLEMENTARES|RESERVADO (AO|PARA O) FISCO|INFORMA[CÇ]OES COMPLEMENTARES/i;
const RUIDO = /ICMS|\bBC\b|\bVl\.|\bVLR|\bVlr|C[oó]d\.? ?Barras|Vendedor|Digitador|Cond\.? ?Pag|\bIBS\b|\bCBS\b|IBPT|IMPOSTO|RICMS|\bSUBS\b|TRIBUT|ARTIGO|\bFonte\b|^Ref:|COD\.? ?FABRICA|PEDIDO|\bFCI\b/i;

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

function itensDaPagina(linhas) {
    // inicio da tabela: linha de cabecalho (NCM + DESCRI)
    let ini = linhas.findIndex(l => l.norm.includes('NCM') && l.norm.includes('DESCRI'));
    if (ini === -1) ini = -1;
    let fim = linhas.length;
    for (let i = ini + 1; i < linhas.length; i++) {
        if (FIM_TABELA.test(linhas[i].norm) && i > ini) { fim = i; break; }
    }
    const itens = [];
    let pendente = null;     // linhas de descricao que vieram ANTES da linha numerica
    for (let i = ini + 1; i < fim; i++) {
        const l = linhas[i];
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
        // linha sem numeros de item
        if (RUIDO.test(l.texto)) continue;
        const toks = l.tokens.map(t => t.t);
        if (!toks.length) continue;
        if (pareceCodigo(toks[0])) { pendente = { toks: toks }; continue; }
        if (pendente) { pendente.toks = pendente.toks.concat(toks); continue; }
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
        return {
            codigo: codigo,
            descricao: juntaTexto(toks).substring(0, 200),
            unidade: it.unidade,
            quantidade: it.quantidade,
            valor_unit: Math.round(it.valor_unit * 10000) / 10000,
            valor_total: Math.round(it.valor_total * 100) / 100
        };
    });
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
// Leitor local
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
    const confere = itens.length > 0 && dinheiro.some(v => Math.abs(v - soma) <= SOMA_TOL);
    const cab = dadosCabecalho(textoCompleto);
    return Object.assign(cab, { itens: itens, soma_itens: soma, soma_confere: confere, fonte: 'local' });
}

// ---------------------------------------------------------------------------
// Plano B: Gemini (PDF como entrada)
// ---------------------------------------------------------------------------
async function analisarComGemini(buffer) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY nao configurada');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const prompt = 'Voce recebe uma NOTA FISCAL ELETRONICA (DANFE) brasileira de autopecas. Extraia os dados e responda SOMENTE com JSON valido, sem markdown, neste formato: '
        + '{"numero":"","serie":"","emissao":"dd/mm/aaaa","fornecedor":"razao social do emitente","cnpj":"cnpj do emitente","chave_acesso":"44 digitos",'
        + '"garantia":{"valor":0,"unidade":"dias ou meses"},'
        + '"itens":[{"codigo":"","descricao":"","unidade":"","quantidade":0,"valor_unit":0,"valor_total":0}]}. '
        + 'Regras: liste TODOS os itens de produto/servico de TODAS as paginas; valores como numeros (ponto decimal); '
        + 'valor_total e o valor total do item (nao inclua frete, rateios ou impostos); se a nota mencionar garantia (ex.: "garantia de 90 dias"), preencha "garantia", senao use valor 0.';
    const modelos = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
    let ultimoErro = null;
    for (const nome of modelos) {
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
                descricao: String(i.descricao || '').trim().substring(0, 200),
                unidade: String(i.unidade || '').trim().toUpperCase(),
                quantidade: Number(i.quantidade) || 1,
                valor_unit: Math.round((Number(i.valor_unit) || 0) * 10000) / 10000,
                valor_total: Math.round((Number(i.valor_total) || 0) * 100) / 100
            })).filter(i => i.descricao || i.codigo);
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
            if (!(msg.includes('503') || msg.includes('404') || msg.includes('high demand') || msg.includes('no longer available'))) break;
        }
    }
    throw ultimoErro || new Error('Falha ao consultar o Gemini');
}

// ---------------------------------------------------------------------------
// Orquestrador
// ---------------------------------------------------------------------------
async function analisarNotaFiscal(buffer) {
    let local = null, erroLocal = null;
    try { local = await analisarLocal(buffer); } catch (e) { erroLocal = e; console.error('[NF] leitor local falhou:', e.message); }
    if (local && local.itens.length > 0 && local.soma_confere) return Object.assign(local, { avisos: [] });

    // Plano B por IA
    let ia = null, erroIa = null;
    if (process.env.GEMINI_API_KEY) {
        try {
            ia = await analisarComGemini(buffer);
            // confere a soma da IA com o total de produtos lido localmente (quando houver) ou entre si
            if (local && local.itens.length) ia.soma_confere = Math.abs(ia.soma_itens - local.soma_itens) <= SOMA_TOL;
        } catch (e) { erroIa = e; console.error('[NF] Gemini falhou:', e.message); }
    }
    if (ia && ia.itens.length) {
        // completa dados de cabecalho faltantes com os do leitor local
        if (local) ['numero', 'serie', 'emissao', 'fornecedor', 'cnpj', 'chave_acesso'].forEach(k => { if (!ia[k] && local[k]) ia[k] = local[k]; });
        ia.avisos = ia.soma_confere ? [] : ['Os itens foram lidos por IA. Confira descrição, quantidades e valores antes de salvar.'];
        return ia;
    }
    if (local && local.itens.length) {
        local.avisos = ['A soma dos itens não bateu com o total da nota. Confira os valores antes de salvar.'];
        return local;
    }
    const base = local || { numero: '', serie: '', emissao: '', fornecedor: '', cnpj: '', chave_acesso: '', garantia_sugerida: null, itens: [], soma_itens: 0, soma_confere: false, fonte: 'nenhum' };
    base.avisos = ['Não foi possível ler os itens desta nota automaticamente. Digite as peças manualmente.'
        + (erroIa ? ' (IA: ' + String(erroIa.message).substring(0, 80) + ')' : (process.env.GEMINI_API_KEY ? '' : ' (IA não configurada)'))];
    return base;
}

module.exports = { analisarNotaFiscal, analisarLocal, analisarComGemini, parseBR };
