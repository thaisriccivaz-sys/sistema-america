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
        ini = linhas.findIndex((l, idx) => {
            const w = l.norm + ' ' + (linhas[idx + 1] ? linhas[idx + 1].norm : '') + ' ' + (linhas[idx + 2] ? linhas[idx + 2].norm : '');
            return w.includes('NCM') && w.includes('DESCRI');
        });
    }
    if (ini === -1) {
        const idxPecas = linhas.findIndex(l => /\b(?:PECAS\s+A\s+APLICAR|REQUISICAO\s+DE\s+PECAS|ITENS\s+DE\s+PECAS|TABELA\s+DE\s+PECAS|DADOS\s+DOS?\s+PRODUTOS?)\b/.test(l.norm));
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
    if (!r.numero) {
        const mNum = textoCompleto.match(/\bN[º°o.]\s*([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{4,9})\b/i);
        if (mNum) r.numero = String(parseInt(mNum[1].replace(/\D/g, ''), 10));
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
// Deteccao de tipo de arquivo (PDF ou Imagem JPG/PNG/WEBP)
// ---------------------------------------------------------------------------
function detectarMimeArquivo(buffer, mimetype, originalname) {
    const b = Buffer.isBuffer(buffer) ? buffer : (buffer ? Buffer.from(buffer) : Buffer.alloc(0));
    if (b.length >= 5 && b.slice(0, 5).toString('latin1') === '%PDF-') {
        return { ok: true, mime: 'application/pdf', ext: '.pdf', ehPdf: true, ehImagem: false };
    }
    if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) {
        return { ok: true, mime: 'image/jpeg', ext: '.jpg', ehPdf: false, ehImagem: true };
    }
    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) {
        return { ok: true, mime: 'image/png', ext: '.png', ehPdf: false, ehImagem: true };
    }
    if (b.length >= 12 && b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP') {
        return { ok: true, mime: 'image/webp', ext: '.webp', ehPdf: false, ehImagem: true };
    }
    const mt = String(mimetype || '').toLowerCase();
    const nm = String(originalname || '').toLowerCase();
    if (mt === 'application/pdf' || nm.endsWith('.pdf')) {
        return { ok: true, mime: 'application/pdf', ext: '.pdf', ehPdf: true, ehImagem: false };
    }
    if (mt === 'image/jpeg' || mt === 'image/jpg' || nm.endsWith('.jpg') || nm.endsWith('.jpeg')) {
        return { ok: true, mime: 'image/jpeg', ext: '.jpg', ehPdf: false, ehImagem: true };
    }
    if (mt === 'image/png' || nm.endsWith('.png')) {
        return { ok: true, mime: 'image/png', ext: '.png', ehPdf: false, ehImagem: true };
    }
    if (mt === 'image/webp' || nm.endsWith('.webp')) {
        return { ok: true, mime: 'image/webp', ext: '.webp', ehPdf: false, ehImagem: true };
    }
    return { ok: false, mime: mt || 'application/octet-stream', ext: '', ehPdf: false, ehImagem: false };
}

// ---------------------------------------------------------------------------
// Plano B: Gemini (com fallback de modelos + retry em 503/429 + suporte a imagem)
// ---------------------------------------------------------------------------
const MODELOS_GEMINI_PRIORIDADE = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-3-flash-preview',
    'gemini-3.6-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.0-flash',
    'gemini-2.5-pro',
    'gemini-pro-latest',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemma-3-27b-it',
    'gemma-3-12b-it'
];

let _modelosGeminiCache = null;
let _modelosGeminiCacheTs = 0;

async function _obterModelosGemini() {
    const agora = Date.now();
    if (_modelosGeminiCache && (agora - _modelosGeminiCacheTs) < 10 * 60 * 1000) {
        return _modelosGeminiCache;
    }
    const apiKey = process.env.GEMINI_API_KEY;
    const candidatos = [];
    let listouDaApi = false;
    if (apiKey && typeof fetch === 'function') {
        try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const d = await r.json();
            if (d && Array.isArray(d.models) && d.models.length > 0) {
                listouDaApi = true;
                const suportados = d.models
                    .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => String(m.name || '').replace(/^models\//, ''))
                    .filter(n => n && !/tts|embedding|imagen|veo|aqa|bisheng|robotics|computer-use|audio|live|thinking/i.test(n));
                for (const pref of MODELOS_GEMINI_PRIORIDADE) {
                    if (suportados.includes(pref) && !candidatos.includes(pref)) candidatos.push(pref);
                }
                const flashExtras = suportados.filter(n => /flash/i.test(n) && !candidatos.includes(n));
                const proExtras = suportados.filter(n => /pro/i.test(n) && !candidatos.includes(n));
                const gemmaExtras = suportados.filter(n => /gemma-3-(27|12)b-it/i.test(n) && !candidatos.includes(n));
                candidatos.push(...flashExtras, ...proExtras, ...gemmaExtras);
            }
        } catch (e) {
            console.warn('[NF] Falha ao listar modelos Gemini:', e.message);
        }
    }
    if (!listouDaApi || candidatos.length === 0) {
        for (const m of MODELOS_GEMINI_PRIORIDADE) {
            if (!candidatos.includes(m)) candidatos.push(m);
        }
    }
    _modelosGeminiCache = candidatos;
    _modelosGeminiCacheTs = agora;
    return candidatos;
}

function _extrairJpegDePdfDigitalizado(buf) {
    try {
        if (!Buffer.isBuffer(buf) || buf.length < 20000) return null;
        const s = buf.toString('latin1');
        const re = /\/DCTDecode[\s\S]{0,400}?stream\r?\n/g;
        let m, best = null;
        while ((m = re.exec(s)) !== null) {
            const start = m.index + m[0].length;
            const end = s.indexOf('endstream', start);
            if (end > start) {
                let len = end - start;
                while (len > 0 && (buf[start + len - 1] === 0x0A || buf[start + len - 1] === 0x0D || buf[start + len - 1] === 0x20)) len--;
                const sub = buf.subarray(start, start + len);
                if (sub.length > 15000 && sub[0] === 0xFF && sub[1] === 0xD8 && (!best || sub.length > best.length)) {
                    best = sub;
                }
            }
        }
        if (best && best.length >= buf.length * 0.35) return best;
    } catch (_) {}
    return null;
}

function _extrairJsonTexto(raw) {
    let txt = String(raw || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    try { return JSON.parse(txt); } catch (_) {
        const m = txt.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
        throw new Error('Resposta da IA nao contem JSON valido');
    }
}

function _msgErroIaLimpa(err) {
    const m = String((err && err.message) || err || '');
    if (/503|high demand|overloaded|unavailable/i.test(m)) {
        return 'Serviço de leitura automática temporariamente ocupado (alta demanda). Tente novamente em instantes ou preencha manualmente.';
    }
    if (/429|quota|rate limit/i.test(m)) {
        return 'Limite temporário de leitura automática atingido. Aguarde alguns segundos ou preencha manualmente.';
    }
    if (/API_KEY_INVALID|GEMINI_API_KEY/i.test(m)) {
        return 'Chave da IA não configurada ou inválida.';
    }
    return 'Não foi possível concluir a leitura automática neste momento.';
}

async function _chamarGeminiJson(buffer, mimeType, prompt) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY nao configurada');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const info = detectarMimeArquivo(buffer, mimeType);
    let mime = info.ok ? info.mime : (mimeType || 'application/pdf');
    let payloadBuffer = Buffer.from(buffer);

    if (info.ehPdf) {
        const jpegEmbutido = _extrairJpegDePdfDigitalizado(payloadBuffer);
        if (jpegEmbutido) {
            try {
                const sharp = require('sharp');
                const meta = await sharp(jpegEmbutido).metadata();
                if (meta && meta.width >= 500 && meta.height >= 500) {
                    payloadBuffer = await sharp(jpegEmbutido)
                        .rotate()
                        .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 88 })
                        .toBuffer();
                    mime = 'image/jpeg';
                }
            } catch (_) {}
        }
    } else if (info.ehImagem) {
        try {
            const sharp = require('sharp');
            payloadBuffer = await sharp(payloadBuffer)
                .rotate()
                .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 88 })
                .toBuffer();
            mime = 'image/jpeg';
        } catch (e) {
            // Se sharp falhar, envia o buffer original da imagem
        }
    }

    const base64Data = payloadBuffer.toString('base64');
    const modelos = await _obterModelosGemini();
    let ultimoErro = null;

    for (const nome of modelos) {
        const ehGemma = /gemma/i.test(nome);
        if (ehGemma && mime === 'application/pdf') continue; // Gemma aceita imagem, nao PDF bruto
        const maxTent = ehGemma ? 1 : 2;
        for (let tent = 0; tent < maxTent; tent++) {
            try {
                const usarJsonMime = !ehGemma && tent === 0;
                const genCfg = usarJsonMime ? { responseMimeType: 'application/json', temperature: 0 } : { temperature: 0 };
                const model = genAI.getGenerativeModel({ model: nome, generationConfig: genCfg });
                const result = await model.generateContent([
                    { inlineData: { mimeType: mime, data: base64Data } },
                    { text: prompt }
                ]);
                return _extrairJsonTexto(result.response.text());
            } catch (e) {
                ultimoErro = e;
                const msg = String(e.message || '');
                if (/API_KEY_INVALID/i.test(msg)) throw e;
                if (/404|not found/i.test(msg)) break; // modelo inexistente -> tenta proximo imediatamente
                if (/400|bad request/i.test(msg)) {
                    if (tent === 0 && !ehGemma) continue; // tenta sem responseMimeType
                    break;
                }
                await new Promise(r => setTimeout(r, 600 * (tent + 1)));
            }
        }
    }
    throw ultimoErro || new Error('Falha ao consultar o Gemini');
}

async function analisarComGemini(buffer, mimeType) {
    const prompt = 'Voce recebe um PDF ou IMAGEM (foto/scan) de NOTA FISCAL (DANFE), ORDEM DE SERVICO, RECIBO ou ORCAMENTO de manutencao automotiva. '
        + 'Extraia SOMENTE os itens de PECAS / PRODUTOS / MATERIAIS fisicos e responda SOMENTE com JSON valido, sem markdown, neste formato: '
        + '{"numero":"","serie":"","emissao":"dd/mm/aaaa","fornecedor":"razao social ou nome da oficina/loja","cnpj":"cnpj do emitente","chave_acesso":"44 digitos",'
        + '"garantia":{"valor":0,"unidade":"dias ou meses"},'
        + '"itens":[{"codigo":"","descricao":"","unidade":"UN","quantidade":0,"valor_unit":0,"valor_total":0}]}. '
        + 'REGRAS OBRIGATORIAS: '
        + '1) Liste APENAS PECAS, PRODUTOS ou MATERIAIS fisicos aplicados. '
        + '2) NAO inclua servicos, mao de obra, horas de mecanica/oficina (ex.: "MECANICA - CA", "29-ATENDIMENTO", "DIAGNOSTICO", "REVISAR...", "M.O", "REMOCAO E INSTALACAO...") nem itens que estejam na tabela "SERVICOS A EXECUTAR" ou "MAO DE OBRA". '
        + '3) Se o documento tiver apenas servicos/mao de obra e nenhuma peca, retorne "itens": []. '
        + '4) Na descricao da peca, coloque apenas o nome limpo da peca (sem cabecalhos como "EXTERNO [ NAO ]", "GARANTIA PC. BALCAO", "CODIGO DESCRICAO QTD"). '
        + '5) Se for um DANFE onde o item possui coluna "V. TOTAL LIQUIDO" (ou onde ha Outras Despesas / Frete / IPI somados ao total da nota, ex.: valor prod 162,91 + outras desp 2,80 = V. TOTAL LIQUIDO 165,71), use o V. TOTAL LIQUIDO como valor_total (e ajuste valor_unit) para que a soma das pecas bata exatamente com o VALOR TOTAL DA NOTA.';
    const j = await _chamarGeminiJson(buffer, mimeType, prompt);
    const itens = (Array.isArray(j.itens) ? j.itens : []).map(i => ({
        codigo: String(i.codigo || '').trim(),
        descricao: limparDescricaoItem(i.descricao),
        unidade: String(i.unidade || 'UN').trim().toUpperCase(),
        quantidade: Number(i.quantidade) || 1,
        valor_unit: Math.round((Number(i.valor_unit) || 0) * 10000) / 10000,
        valor_total: Math.round((Number(i.valor_total) || 0) * 100) / 100
    })).filter(i => (i.descricao || i.codigo) && !ehItemDeMaoDeObra(i.descricao) && i.valor_total > 0);
    const soma = Math.round(itens.reduce((s, i) => s + i.valor_total, 0) * 100) / 100;
    const g = j.garantia && Number(j.garantia.valor) > 0
        ? { valor: parseInt(j.garantia.valor, 10), unidade: /mes/i.test(String(j.garantia.unidade)) ? 'meses' : 'dias' } : null;
    return {
        numero: String(j.numero || '').replace(/\D/g, '').replace(/^0+/, ''), serie: String(j.serie || ''), emissao: String(j.emissao || ''),
        fornecedor: String(j.fornecedor || ''), cnpj: String(j.cnpj || ''), chave_acesso: String(j.chave_acesso || '').replace(/\D/g, ''),
        garantia_sugerida: g, itens: itens, soma_itens: soma, soma_confere: false, fonte: 'ia'
    };
}

// ---------------------------------------------------------------------------
// Orquestrador de PECAS
// ---------------------------------------------------------------------------
async function analisarNotaFiscal(buffer, mimeType) {
    const info = detectarMimeArquivo(buffer, mimeType);
    let local = null;
    if (info.ehPdf) {
        try { local = await analisarLocal(buffer); } catch (e) { console.error('[NF] leitor local falhou:', e.message); }
        if (local && local.itens.length > 0 && local.soma_confere) return Object.assign(local, { avisos: [] });
    }

    let ia = null, erroIa = null;
    if (process.env.GEMINI_API_KEY) {
        try {
            ia = await analisarComGemini(buffer, info.mime);
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
        ia.avisos = ['Nenhuma peça identificada neste documento (serviços de mão de obra devem ser lançados como mão de obra). Você pode digitar as peças abaixo manualmente.'];
        return ia;
    }
    if (local && local.itens.length) {
        local.avisos = ['A soma dos itens não bateu com o total da nota. Confira os valores antes de salvar.'];
        return local;
    }
    const base = local || { numero: '', serie: '', emissao: '', fornecedor: '', cnpj: '', chave_acesso: '', garantia_sugerida: null, itens: [], soma_itens: 0, soma_confere: false, fonte: 'nenhum' };
    base.avisos = ['Não foi possível ler as peças desta nota automaticamente. Digite as peças manualmente.'
        + (erroIa ? ' (' + _msgErroIaLimpa(erroIa) + ')' : (process.env.GEMINI_API_KEY ? '' : ' (IA não configurada)'))];
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

async function analisarServicoGemini(buffer, mimeType) {
    const prompt = 'Voce recebe um PDF ou IMAGEM (foto/scan) de NOTA FISCAL DE SERVICO (NFS-e), RECIBO MANUSCRITO ou ORDEM DE SERVICO / ORCAMENTO de MAO DE OBRA de manutencao de veiculos. '
        + 'Extraia os dados e responda SOMENTE com JSON valido, sem markdown, neste formato: '
        + '{"numero":"","emissao":"dd/mm/aaaa","fornecedor":"razao social ou nome da oficina","cnpj":"cnpj do prestador","valor_total":0,'
        + '"itens":[{"descricao":"servico executado","valor":0}]}. '
        + 'Regras: '
        + '1) Liste cada servico discriminado na nota/recibo com o seu valor (numero com ponto decimal). '
        + '2) Se a nota/recibo trouxer a descricao do servico em uma linha sem valor (ex.: "remocao e instalacao rolamento traseiro lado direito") e na linha de baixo "M.O 160,00" ou "TOTAL 160,00", junte em UMA UNICA linha com a descricao completa do servico e o valor (ex.: 160.00). Nao retorne linha zerada separada de "M.O". '
        + '3) Em recibos/orcamentos manuscritos de oficina, leia o nome da oficina impresso no cabecalho (ex.: "MARCELOS CAR") como fornecedor e a data preenchida como emissao (dd/mm/aaaa). '
        + '4) Nao inclua impostos retidos nem pecas fisicas como itens de servico; '
        + '5) Limpe a descricao do servico removendo cabecalhos como "EXTERNO [ NAO ]", "GARANTIA PC. BALCAO", "CODIGO DESCRICAO QTD VR. UNIT.".';
    const j = await _chamarGeminiJson(buffer, mimeType, prompt);
    const itens = (Array.isArray(j.itens) ? j.itens : []).map(i => ({
        descricao: limparDescricaoItem(i.descricao),
        valor: Math.round((Number(i.valor) || 0) * 100) / 100
    })).filter(i => i.descricao && i.valor > 0);
    const soma = Math.round(itens.reduce((s, i) => s + i.valor, 0) * 100) / 100;
    return {
        numero: String(j.numero || '').replace(/\D/g, '').replace(/^0+/, ''), serie: '', emissao: String(j.emissao || ''),
        fornecedor: String(j.fornecedor || ''), cnpj: String(j.cnpj || ''), chave_acesso: '',
        valor_total: Math.round((Number(j.valor_total) || soma) * 100) / 100, itens: itens, fonte: 'ia'
    };
}

async function analisarNotaServico(buffer, mimeType) {
    const info = detectarMimeArquivo(buffer, mimeType);
    let local = null, ia = null, erroIa = null, tabelaLida = false;
    if (info.ehPdf) {
        try {
            const t = await textoDoPdf(buffer);
            local = dadosServicoLocal(t.texto, t.itensServ);
            tabelaLida = !!local.tabela;
        } catch (e) { console.error('[NF-MO] leitor local falhou:', e.message); }
    }
    let localConfiavel = false;
    if (local && local.itens.length && local.numero && local.fornecedor && local.valor_total > 0 && tabelaLida) {
        const somaL = Math.round(local.itens.reduce((s, i) => s + i.valor, 0) * 100) / 100;
        localConfiavel = Math.abs(somaL - local.valor_total) <= 0.05;
    }
    if (process.env.GEMINI_API_KEY && !localConfiavel) {
        try { ia = await analisarServicoGemini(buffer, info.mime); } catch (e) { erroIa = e; console.error('[NF-MO] Gemini falhou:', e.message); }
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
            + (erroIa ? ' (' + _msgErroIaLimpa(erroIa) + ')' : (process.env.GEMINI_API_KEY ? '' : ' (IA não configurada)'))];
    }
    return base;
}

// ---------------------------------------------------------------------------
// Leitura Unificada (PDF ou Imagem JPG/PNG/WEBP) -> Pecas + Mao de Obra em 1 unica chamada IA
// ---------------------------------------------------------------------------
async function analisarUnificadoComGemini(buffer, mimeType) {
    const prompt = 'Voce recebe um PDF ou IMAGEM (foto/scan) de uma NOTA FISCAL (DANFE ou NFS-e), ORDEM DE SERVICO (OS), RECIBO ou ORCAMENTO (impresso ou manuscrito) de manutencao automotiva. '
        + 'Extraia o cabecalho e TODOS os itens cobrados, classificando cada item como "peca" (pecas fisicas, produtos, materiais, rolamentos, cubos de roda, filtros, oleos, etc.) ou "mao_obra" (servicos executados, mao de obra, M.O, instalacao, remocao, alinhamento, socorro, etc.). '
        + 'Responda SOMENTE com JSON valido, sem markdown, neste formato: '
        + '{"numero":"","serie":"","emissao":"dd/mm/aaaa","fornecedor":"razao social ou nome fantasia da oficina/loja","cnpj":"","chave_acesso":"44 digitos se houver",'
        + '"garantia":{"valor":0,"unidade":"dias ou meses"},'
        + '"valor_total":0,'
        + '"itens":[{"tipo":"peca ou mao_obra","codigo":"","descricao":"","unidade":"UN","quantidade":1,"valor_unit":0,"valor_total":0}]}. '
        + 'REGRAS OBRIGATORIAS: '
        + '1) DANFE COM V. TOTAL LIQUIDO / OUTRAS DESPESAS / FRETE / IPI: Se for uma nota fiscal de produtos (DANFE) onde o item tem coluna "V. TOTAL LIQUIDO" (ou onde ha Outras Despesas Acessoria / Frete / IPI somados ao total da nota, ex.: produto 162,91 + outras despesas 2,80 = V. TOTAL LIQUIDO 165,71), use o V. TOTAL LIQUIDO (165.71) como valor_total do item (e ajuste valor_unit) para que a soma das pecas bata exatamente com o VALOR TOTAL DA NOTA. '
        + '2) RECIBO / ORCAMENTO MANUSCRITO DE OFICINA (ex.: bloco amarelo "MARCELOS CAR MECANICA EM GERAL"): '
        + '   a) Leia o nome da oficina no topo do cabecalho (ex.: "MARCELOS CAR") como "fornecedor", e a data preenchida (ex.: "09/10/2026") como "emissao". '
        + '   b) Se houver uma linha descrevendo o servico sem preco na frente (ex.: "remocao e instalacao rolamento traseiro lado direito") e outra linha abaixo escrita "M.O" / "Mao de obra" com o preco (ex.: 160,00), JUNTE em UM UNICO item com "tipo":"mao_obra", "descricao":"Remocao e instalacao rolamento traseiro lado direito (M.O)" e "valor_total":160.00. NUNCA retorne uma linha com valor 0 separada da linha M.O. '
        + '3) Se um item estiver na secao de Pecas mas a descricao for claramente mao de obra (ex.: "MECANICA", "M.O", "ATENDIMENTO", "DIAGNOSTICO", "REMOCAO E INSTALACAO"), classifique como "mao_obra". '
        + '4) Limpe a descricao removendo lixos de cabecalho como "EXTERNO [ NAO ]", "GARANTIA PC. BALCAO", "CODIGO DESCRICAO QTD".';
    const j = await _chamarGeminiJson(buffer, mimeType, prompt);
    const pecas = [];
    const moItens = [];
    (Array.isArray(j.itens) ? j.itens : []).forEach(i => {
        const desc = limparDescricaoItem(i.descricao);
        const cod = String(i.codigo || '').trim();
        const qtd = Number(i.quantidade) || 1;
        const vt = Math.round((Number(i.valor_total) || (qtd * (Number(i.valor_unit) || 0)) || 0) * 100) / 100;
        const vu = Math.round(((Number(i.valor_unit) || (vt / qtd)) || 0) * 10000) / 10000;
        if (!desc && !cod) return;
        if (vt <= 0) return;
        const tipoBruto = String(i.tipo || '').toLowerCase();
        const ehMo = tipoBruto.includes('mao') || tipoBruto.includes('serv') || ehItemDeMaoDeObra(desc);
        if (ehMo) {
            moItens.push({
                descricao: desc || 'Mão de obra',
                quantidade: 1,
                unidade: 'SV',
                valor_unit: vt,
                valor_total: vt,
                valor: vt
            });
        } else {
            pecas.push({
                codigo: cod,
                descricao: desc,
                unidade: String(i.unidade || 'UN').trim().toUpperCase(),
                quantidade: qtd,
                valor_unit: vu,
                valor_total: vt
            });
        }
    });
    const g = j.garantia && Number(j.garantia.valor) > 0
        ? { valor: parseInt(j.garantia.valor, 10), unidade: /mes/i.test(String(j.garantia.unidade)) ? 'meses' : 'dias' } : null;
    return {
        numero: String(j.numero || '').replace(/\D/g, '').replace(/^0+/, ''),
        serie: String(j.serie || ''),
        emissao: String(j.emissao || ''),
        fornecedor: String(j.fornecedor || '').trim(),
        cnpj: String(j.cnpj || '').trim(),
        chave_acesso: String(j.chave_acesso || '').replace(/\D/g, ''),
        garantia_sugerida: g,
        pecas: pecas,
        moItens: moItens,
        valor_total: Math.round((Number(j.valor_total) || 0) * 100) / 100,
        fonte: 'ia'
    };
}

async function analisarDocumentoUnificado(buffer, mimeType) {
    const info = detectarMimeArquivo(buffer, mimeType);
    let localPecas = null, localMo = null, tabelaMoLida = false;

    if (info.ehPdf) {
        try { localPecas = await analisarLocal(buffer); } catch (e) { console.error('[NF-Unif] leitor local pecas falhou:', e.message); }
        try {
            const t = await textoDoPdf(buffer);
            localMo = dadosServicoLocal(t.texto, t.itensServ);
            tabelaMoLida = !!localMo.tabela;
        } catch (e) { console.error('[NF-Unif] leitor local MO falhou:', e.message); }

        const pecasLocalConfiavel = !!(localPecas && localPecas.itens && localPecas.itens.length > 0 && localPecas.soma_confere && !tabelaMoLida);
        if (pecasLocalConfiavel) {
            return {
                numero: localPecas.numero || '',
                serie: localPecas.serie || '',
                emissao: localPecas.emissao || '',
                fornecedor: localPecas.fornecedor || '',
                cnpj: localPecas.cnpj || '',
                chave_acesso: localPecas.chave_acesso || '',
                garantia_sugerida: null,
                pecas: localPecas.itens,
                moItens: [],
                avisos: [],
                fonte: 'local'
            };
        }

        const somaMoLocal = localMo && localMo.itens ? Math.round(localMo.itens.reduce((s, i) => s + i.valor, 0) * 100) / 100 : 0;
        const moLocalConfiavel = !!(localMo && localMo.itens && localMo.itens.length > 0 && localMo.numero && localMo.fornecedor && localMo.valor_total > 0 && tabelaMoLida && Math.abs(somaMoLocal - localMo.valor_total) <= 0.05 && (!localPecas || !localPecas.itens || !localPecas.itens.length));
        if (moLocalConfiavel) {
            return {
                numero: localMo.numero || '',
                serie: localMo.serie || '',
                emissao: localMo.emissao || '',
                fornecedor: localMo.fornecedor || '',
                cnpj: localMo.cnpj || '',
                chave_acesso: localMo.chave_acesso || '',
                garantia_sugerida: null,
                pecas: [],
                moItens: localMo.itens.map(i => ({ descricao: i.descricao, quantidade: 1, unidade: 'SV', valor_unit: Number(i.valor) || 0, valor_total: Number(i.valor) || 0, valor: Number(i.valor) || 0 })),
                avisos: [],
                fonte: 'local'
            };
        }
    }

    let ia = null, erroIa = null;
    if (process.env.GEMINI_API_KEY) {
        try {
            ia = await analisarUnificadoComGemini(buffer, info.mime);
        } catch (e) {
            erroIa = e;
            console.error('[NF-Unif] Gemini unificado falhou:', e.message);
        }
    }

    if (ia && (ia.pecas.length > 0 || ia.moItens.length > 0)) {
        const cabLocal = localPecas || localMo;
        if (cabLocal) {
            ['numero', 'serie', 'emissao', 'fornecedor', 'cnpj', 'chave_acesso'].forEach(k => {
                if (!ia[k] && cabLocal[k]) ia[k] = cabLocal[k];
            });
        }
        ia.avisos = ['Documento lido por IA. Confira descrição, quantidades e valores antes de confirmar.'];
        return ia;
    }

    const pecasFallback = (localPecas && localPecas.itens) ? localPecas.itens : [];
    const moFallback = (localMo && localMo.itens) ? localMo.itens.map(i => ({ descricao: i.descricao, quantidade: 1, unidade: 'SV', valor_unit: Number(i.valor) || 0, valor_total: Number(i.valor) || 0, valor: Number(i.valor) || 0 })) : [];
    const cab = localPecas || localMo || ia || {};
    const avisos = [];
    if (pecasFallback.length || moFallback.length) {
        avisos.push('Confira os itens e valores extraídos antes de salvar.');
    } else {
        avisos.push('Não foi possível ler os itens automaticamente deste documento. Você pode preencher as peças ou mão de obra manualmente abaixo.'
            + (erroIa ? ' (' + _msgErroIaLimpa(erroIa) + ')' : (process.env.GEMINI_API_KEY ? '' : ' (IA não configurada)')));
    }
    return {
        numero: cab.numero || '',
        serie: cab.serie || '',
        emissao: cab.emissao || '',
        fornecedor: cab.fornecedor || '',
        cnpj: cab.cnpj || '',
        chave_acesso: cab.chave_acesso || '',
        garantia_sugerida: cab.garantia_sugerida || null,
        pecas: pecasFallback,
        moItens: moFallback,
        avisos: avisos,
        fonte: (pecasFallback.length || moFallback.length) ? 'local' : 'nenhum'
    };
}

module.exports = {
    analisarNotaFiscal,
    analisarLocal,
    analisarComGemini,
    analisarNotaServico,
    analisarDocumentoUnificado,
    detectarMimeArquivo,
    parseBR,
    limparDescricaoItem,
    ehItemDeMaoDeObra
};
